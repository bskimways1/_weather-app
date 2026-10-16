import { placeId, type Place } from "./geo/types";

/** 지역을 URL 쿼리로 주고받는다 (/?lat=..&lon=..&name=..). 즐겨찾기에 없는 지역도 열 수 있게. */
export function placeToQuery(p: Place): string {
  const q = new URLSearchParams({
    lat: p.lat.toFixed(4),
    lon: p.lon.toFixed(4),
    name: p.name,
    label: p.label,
    sub: p.sub,
  });
  return q.toString();
}

export function placeFromQuery(sp: URLSearchParams | { get(k: string): string | null }): Place | null {
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (!sp.get("lat") || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const name = sp.get("name") || "선택한 지역";
  return {
    id: placeId(lat, lon),
    name,
    label: sp.get("label") || name,
    sub: sp.get("sub") || "",
    lat,
    lon,
  };
}
