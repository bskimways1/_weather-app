import { placeFromParts, type GeoProvider, type Place } from "./types";

/**
 * Kakao Local API. 환경변수 KAKAO_REST_API_KEY 가 있으면 이 제공자를 쓴다.
 * 동 단위 검색·법정동 이름(역삼동 등)이 정확하고 자동완성 검색이 허용된다.
 * https://developers.kakao.com/docs/latest/ko/local/dev-guide
 */
const BASE = "https://dapi.kakao.com/v2/local";

type KakaoAddressDoc = {
  address_name: string;
  x: string;
  y: string;
  address?: { region_1depth_name: string; region_2depth_name: string; region_3depth_name: string } | null;
  road_address?: { region_1depth_name: string; region_2depth_name: string; region_3depth_name: string } | null;
};

type KakaoRegionDoc = {
  region_type: "B" | "H";
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  x: number;
  y: number;
};

function headers(key: string) {
  return { Authorization: `KakaoAK ${key}` };
}

function splitDepth2(depth2: string): string[] {
  // "수원시 영통구" 처럼 시+구가 한 칸에 들어오는 경우
  return depth2.split(" ").filter(Boolean);
}

export function createKakaoProvider(key: string): GeoProvider {
  return {
    id: "kakao",
    liveSearch: true,

    async search(query) {
      const params = new URLSearchParams({ query, analyze_type: "similar", size: "10" });
      const res = await fetch(`${BASE}/search/address.json?${params}`, { headers: headers(key) });
      if (!res.ok) throw new Error(`Kakao 주소 검색 오류 ${res.status}`);
      const { documents } = (await res.json()) as { documents: KakaoAddressDoc[] };
      const seen = new Set<string>();
      const places: Place[] = [];
      for (const d of documents) {
        const r = d.address ?? d.road_address;
        if (!r) continue;
        const parts = [r.region_1depth_name, ...splitDepth2(r.region_2depth_name), r.region_3depth_name];
        const p = placeFromParts(parts, Number(d.y), Number(d.x));
        if (!p || seen.has(p.label)) continue;
        seen.add(p.label);
        places.push(p);
      }
      return places;
    },

    async reverse(lat, lon) {
      const params = new URLSearchParams({ x: String(lon), y: String(lat) });
      const res = await fetch(`${BASE}/geo/coord2regioncode.json?${params}`, { headers: headers(key) });
      if (!res.ok) throw new Error(`Kakao 좌표 변환 오류 ${res.status}`);
      const { documents } = (await res.json()) as { documents: KakaoRegionDoc[] };
      // 법정동(B)이 "역삼동"처럼 사람들이 흔히 부르는 이름이다
      const d = documents.find((x) => x.region_type === "B") ?? documents[0];
      if (!d) return null;
      const parts = [d.region_1depth_name, ...splitDepth2(d.region_2depth_name), d.region_3depth_name];
      return placeFromParts(parts, lat, lon);
    },
  };
}
