import { createKakaoProvider } from "./kakao";
import { nominatimProvider } from "./nominatim";
import type { GeoProvider } from "./types";

/** KAKAO_REST_API_KEY 가 설정돼 있으면 Kakao, 아니면 Nominatim(OSM). */
export function getGeoProvider(): GeoProvider {
  const key = process.env.KAKAO_REST_API_KEY;
  return key ? createKakaoProvider(key) : nominatimProvider;
}

export type { GeoProvider, Place } from "./types";
