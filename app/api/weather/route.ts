import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { getWeatherProvider, type DayComparison } from "@/lib/weather";

const MAX_POINTS = 20;

/**
 * GET /api/weather?points=37.50,127.04;35.16,129.16
 * 지점별 어제·오늘 48시간 기온. 응답 순서는 요청 순서와 같다.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("points") ?? "";
  const points = raw
    .split(";")
    .map((s) => s.split(",").map(Number))
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180)
    .slice(0, MAX_POINTS);

  if (points.length === 0) {
    return Response.json({ error: "points 파라미터가 필요합니다 (lat,lon;lat,lon)" }, { status: 400 });
  }

  // 서울 날짜를 캐시 키에 넣어 자정이 지나면 새로 받게 한다
  const dayKey = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

  try {
    const results = await Promise.all(points.map(([lat, lon]) => getCachedComparison(round2(lat), round2(lon), dayKey)));
    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "날씨 정보를 불러오지 못했습니다" }, { status: 502 });
  }
}

/** 약 1km 격자로 맞춰 캐시 적중률을 높인다 */
function round2(v: number) {
  return Math.round(v * 100) / 100;
}

async function getCachedComparison(lat: number, lon: number, dayKey: string): Promise<DayComparison> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  void dayKey; // 캐시 키 용도
  const [result] = await getWeatherProvider().getComparisons([{ lat, lon }]);
  return result;
}
