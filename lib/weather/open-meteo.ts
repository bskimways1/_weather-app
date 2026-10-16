import type { DayComparison, Hourly, LatLon, WeatherProvider } from "./types";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    weather_code: (number | null)[];
    is_day: (number | null)[];
  };
};

export function buildOpenMeteoUrl(points: LatLon[]): string {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(4)).join(","),
    longitude: points.map((p) => p.lon.toFixed(4)).join(","),
    hourly: "temperature_2m,weather_code,is_day",
    // past_days=1: 어제 00~23시 + 오늘 00~23시, 총 48개
    past_days: "1",
    forecast_days: "1",
    timezone: "auto",
  });
  return `${ENDPOINT}?${params}`;
}

/** Open-Meteo 응답 1건을 공통 형식으로 변환한다. */
export function parseOpenMeteo(raw: OpenMeteoResponse, point: LatLon, fetchedAt: number): DayComparison {
  const { time, temperature_2m, weather_code, is_day } = raw.hourly;
  if (time.length < 48) throw new Error(`Open-Meteo: 시간 자료가 48개 미만입니다 (${time.length})`);

  const toHourly = (i: number): Hourly => ({
    hour: Number(time[i].slice(11, 13)),
    temp: fillTemp(temperature_2m, i),
    weatherCode: weather_code[i] ?? 0,
    isDay: (is_day[i] ?? 1) === 1,
  });

  return {
    lat: point.lat,
    lon: point.lon,
    yesterdayDate: time[0].slice(0, 10),
    todayDate: time[24].slice(0, 10),
    utcOffsetSeconds: raw.utc_offset_seconds,
    yesterday: Array.from({ length: 24 }, (_, h) => toHourly(h)),
    today: Array.from({ length: 24 }, (_, h) => toHourly(24 + h)),
    fetchedAt,
    source: "Open-Meteo",
  };
}

/** 드물게 비어 있는 값은 가까운 시각 값으로 채운다. */
function fillTemp(values: (number | null)[], i: number): number {
  for (let d = 0; d < values.length; d++) {
    const a = values[i - d];
    if (a != null) return a;
    const b = values[i + d];
    if (b != null) return b;
  }
  return 0;
}

export const openMeteoProvider: WeatherProvider = {
  id: "open-meteo",
  async getComparisons(points) {
    if (points.length === 0) return [];
    const res = await fetch(buildOpenMeteoUrl(points));
    if (!res.ok) throw new Error(`Open-Meteo 응답 오류 ${res.status}`);
    const json = (await res.json()) as OpenMeteoResponse | OpenMeteoResponse[];
    // 지점이 하나면 객체, 여러 개면 배열로 온다
    const list = Array.isArray(json) ? json : [json];
    const now = Date.now();
    return list.map((raw, i) => parseOpenMeteo(raw, points[i], now));
  },
};
