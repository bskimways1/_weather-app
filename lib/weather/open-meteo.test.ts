import { describe, expect, it } from "vitest";
import { buildOpenMeteoUrl, parseOpenMeteo } from "./open-meteo";

function raw(nulls: number[] = []) {
  const time: string[] = [];
  for (const day of ["2026-10-15", "2026-10-16"]) {
    for (let h = 0; h < 24; h++) time.push(`${day}T${String(h).padStart(2, "0")}:00`);
  }
  const temperature_2m: (number | null)[] = time.map((_, i) => (i < 24 ? 10 + i * 0.1 : 12 + (i - 24) * 0.1));
  for (const i of nulls) temperature_2m[i] = null;
  return {
    latitude: 37.5,
    longitude: 127.06,
    utc_offset_seconds: 32400,
    hourly: {
      time,
      temperature_2m,
      weather_code: time.map((_, i) => (i === 30 ? 61 : 1)),
      is_day: time.map((t) => (Number(t.slice(11, 13)) >= 6 && Number(t.slice(11, 13)) < 18 ? 1 : 0)),
    },
  };
}

describe("buildOpenMeteoUrl", () => {
  it("여러 지점을 쉼표로 묶고 past_days=1", () => {
    const url = new URL(buildOpenMeteoUrl([{ lat: 37.5, lon: 127 }, { lat: 35.16, lon: 129.16 }]));
    expect(url.searchParams.get("latitude")).toBe("37.5000,35.1600");
    expect(url.searchParams.get("past_days")).toBe("1");
    expect(url.searchParams.get("forecast_days")).toBe("1");
  });
});

describe("parseOpenMeteo", () => {
  it("0~23 은 어제, 24~47 은 오늘", () => {
    const c = parseOpenMeteo(raw(), { lat: 37.5, lon: 127 }, 1);
    expect(c.yesterdayDate).toBe("2026-10-15");
    expect(c.todayDate).toBe("2026-10-16");
    expect(c.yesterday).toHaveLength(24);
    expect(c.today).toHaveLength(24);
    expect(c.today[6]).toEqual({ hour: 6, temp: 12.6, weatherCode: 61, isDay: true });
    expect(c.yesterday[23].isDay).toBe(false);
  });
  it("빈 기온은 가까운 시각 값으로 채운다", () => {
    const c = parseOpenMeteo(raw([5]), { lat: 37.5, lon: 127 }, 1);
    expect(c.yesterday[5].temp).toBeCloseTo(10.4);
  });
  it("48개 미만이면 오류", () => {
    const r = raw();
    r.hourly.time = r.hourly.time.slice(0, 30);
    expect(() => parseOpenMeteo(r, { lat: 0, lon: 0 }, 1)).toThrow();
  });
});
