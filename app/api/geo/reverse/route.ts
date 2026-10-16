import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { getGeoProvider, type Place } from "@/lib/geo";

/** GET /api/geo/reverse?lat=37.50&lon=127.04 → 행정구역 이름 */
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "lat, lon 이 필요합니다" }, { status: 400 });
  }
  try {
    // 약 100m 격자로 캐시
    const place = await reverseCached(Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000);
    return Response.json({ place: place && { ...place, lat, lon } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "위치 이름을 찾지 못했습니다" }, { status: 502 });
  }
}

async function reverseCached(lat: number, lon: number): Promise<Place | null> {
  "use cache";
  cacheLife("days");
  return getGeoProvider().reverse(lat, lon);
}
