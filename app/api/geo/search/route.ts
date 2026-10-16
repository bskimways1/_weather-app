import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { getGeoProvider, type Place } from "@/lib/geo";

/** GET /api/geo/search?q=해운대 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 1) return Response.json({ places: [] });
  try {
    return Response.json({ places: await searchCached(q) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "검색에 실패했습니다" }, { status: 502 });
  }
}

async function searchCached(q: string): Promise<Place[]> {
  "use cache";
  cacheLife("days");
  return getGeoProvider().search(q);
}
