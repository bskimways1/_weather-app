/** 지역 하나. 즐겨찾기·검색 결과·현재 위치에 공통으로 쓴다. */
export type Place = {
  /** 좌표 기반 키 (소수 3자리) */
  id: string;
  /** 짧은 이름: 메인 헤더용 (예: 역삼동, 해운대구) */
  name: string;
  /** 카드·목록 제목 (예: 서울 강남구 역삼동, 부산 해운대구) */
  label: string;
  /** 상위 행정구역 전체 이름 (예: 부산광역시 해운대구) */
  sub: string;
  lat: number;
  lon: number;
};

export interface GeoProvider {
  id: string;
  /** 검색어 입력마다 호출해도 되는지(이용 정책). false 면 입력 완료 시에만 검색 */
  liveSearch: boolean;
  search(query: string): Promise<Place[]>;
  reverse(lat: number, lon: number): Promise<Place | null>;
}

/**
 * GPS 좌표를 소수 3자리(약 100m)로 반올림한다. 폰 밖으로 나가는 위치는 모두 이 값을 쓴다.
 * 날씨(약 1km 격자)와 동 이름 판별에는 충분한 정밀도다.
 */
export function roundCoord(v: number) {
  return Math.round(v * 1000) / 1000;
}

export function placeId(lat: number, lon: number) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

const SIDO_SHORT: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원도: "강원",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전라북도: "전북",
  전북특별자치도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};

export function shortSido(name: string) {
  return SIDO_SHORT[name] ?? name;
}

/**
 * 행정구역 이름 배열(상위→하위)로 Place 를 만든다.
 * 예: ["부산광역시", "해운대구"] → name 해운대구, label 부산 해운대구, sub 부산광역시
 */
export function placeFromParts(parts: string[], lat: number, lon: number): Place | null {
  const clean = parts.filter((p, i) => p && parts.indexOf(p) === i);
  if (clean.length === 0) return null;
  const name = clean[clean.length - 1];
  const labelParts = clean.map((p, i) => (i === 0 ? shortSido(p) : p));
  // "제주 제주시" 처럼 시도 축약형과 시 이름이 겹쳐도 그대로 둔다(디자인 시안 표기)
  return {
    id: placeId(lat, lon),
    name,
    label: labelParts.slice(-3).join(" "),
    sub: clean.length > 1 ? clean.slice(0, -1).join(" ") : clean[0],
    lat,
    lon,
  };
}
