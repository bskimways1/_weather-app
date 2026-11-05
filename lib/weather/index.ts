import { kmaProvider } from "./kma";
import { openMeteoProvider } from "./open-meteo";
import type { WeatherProvider } from "./types";

/**
 * 사용할 날씨 제공자. 환경변수 WEATHER_PROVIDER 로 고른다(기본 open-meteo).
 * 기상청(kma)은 KMA_API_KEY 가 필요하다. 새 제공자는 WeatherProvider 를 구현하고 아래 표에 추가.
 */
const providers: Record<string, WeatherProvider> = {
  [openMeteoProvider.id]: openMeteoProvider,
  [kmaProvider.id]: kmaProvider,
};

export function getWeatherProvider(): WeatherProvider {
  const id = process.env.WEATHER_PROVIDER ?? openMeteoProvider.id;
  const provider = providers[id];
  if (!provider) throw new Error(`알 수 없는 WEATHER_PROVIDER: ${id}`);
  return provider;
}

export type { DayComparison, Hourly, LatLon, LiveObservation, WeatherProvider } from "./types";
