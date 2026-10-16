import { placeFromParts, type GeoProvider, type Place } from "./types";

/**
 * OpenStreetMap Nominatim. Kakao 키가 없을 때 쓰는 기본 제공자.
 * 이용 정책: 초당 1회 이하, 자동완성 용도 금지, 식별 가능한 User-Agent 필수.
 * → liveSearch=false 로 두어 검색은 입력 완료(엔터) 시에만 보낸다. 서버에서 캐시한다.
 */
const BASE = "https://nominatim.openstreetmap.org";
const HEADERS = {
  "User-Agent": "_weather-app/0.1 (+https://github.com/bskimways1/_weather-app)",
  "Accept-Language": "ko",
};

/** 이용 정책(초당 1회)을 지키기 위해 요청을 1.1초 간격으로 줄 세운다 */
let queue: Promise<unknown> = Promise.resolve();
function politeFetch(url: string): Promise<Response> {
  const next = queue.then(() => fetch(url, { headers: HEADERS }));
  queue = next.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  );
  return next;
}

type NominatimAddress = Partial<
  Record<
    "province" | "state" | "city" | "county" | "borough" | "city_district" | "town" | "suburb" | "quarter" | "village",
    string
  >
>;

type NominatimResult = {
  lat: string;
  lon: string;
  name: string;
  addresstype: string;
  address?: NominatimAddress;
};

/** 동(행정동) 단위까지 상위→하위 순서 */
const LEVELS = ["province", "state", "city", "county", "borough", "city_district", "town", "suburb", "quarter", "village"] as const;
const REGION_TYPES = new Set<string>([...LEVELS, "municipality", "district"]);

function partsUntil(address: NominatimAddress, name: string, stopAt?: string): string[] {
  const parts: string[] = [];
  for (const level of LEVELS) {
    const v = address[level];
    if (!v) continue;
    parts.push(v);
    if (level === stopAt || v === name) break;
  }
  return parts;
}

function toPlace(r: NominatimResult): Place | null {
  const address = r.address ?? {};
  const parts = partsUntil(address, r.name, r.addresstype);
  if (r.name && !parts.includes(r.name)) parts.push(r.name);
  // 동은 하나만 남긴다: 법정동(quarter)을 찾았으면 행정동(suburb)을 빼고, 그 반대도 마찬가지
  const drop = r.addresstype === "quarter" ? address.suburb : address.quarter;
  const trimmed = parts.filter((p) => p !== drop || p === r.name);
  return placeFromParts(trimmed, Number(r.lat), Number(r.lon));
}

export const nominatimProvider: GeoProvider = {
  id: "nominatim",
  liveSearch: false,

  async search(query) {
    const places = await searchRegions(query);
    // "강릉"·"제주"처럼 접미사 없이 치면 역·도로나 도(道)만 나오는 경우가 많아 "○○시"도 함께 찾는다
    if (/[시군구동읍면리도]$/.test(query)) return places;
    const withSi = await searchRegions(`${query}시`);
    const seen = new Set(places.map((p) => p.label));
    return [...withSi.filter((p) => !seen.has(p.label)), ...places];
  },

  async reverse(lat, lon) {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: "jsonv2",
      zoom: "16",
      addressdetails: "1",
    });
    const res = await politeFetch(`${BASE}/reverse?${params}`);
    if (!res.ok) throw new Error(`Nominatim 역지오코딩 오류 ${res.status}`);
    const r = (await res.json()) as NominatimResult & { error?: string };
    if (r.error || !r.address) return null;
    const a = r.address;
    const parts = [a.province ?? a.state, a.city, a.county, a.borough ?? a.city_district, a.town, a.suburb ?? a.quarter ?? a.village]
      .filter((v): v is string => Boolean(v));
    return placeFromParts(parts, lat, lon);
  },
};

async function searchRegions(query: string): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "kr",
    addressdetails: "1",
    limit: "10",
  });
  const res = await politeFetch(`${BASE}/search?${params}`);
  if (!res.ok) throw new Error(`Nominatim 검색 오류 ${res.status}`);
  const list = (await res.json()) as NominatimResult[];
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const r of list) {
    if (!REGION_TYPES.has(r.addresstype)) continue; // 역·도로·상점 등은 제외하고 행정구역만
    const p = toPlace(r);
    if (!p || seen.has(p.label)) continue;
    seen.add(p.label);
    places.push(p);
  }
  return places;
}
