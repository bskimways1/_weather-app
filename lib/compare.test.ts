import { describe, expect, it } from "vitest";
import {
  dayStats,
  diffSentence,
  formatDiff,
  linearScale,
  localNow,
  nowHourFor,
  shortDate,
  tempDiff,
  threeHourSlots,
} from "./compare";
import type { DayComparison, Hourly } from "./weather/types";

const KST = 9 * 3600;

function hours(temps: number[]): Hourly[] {
  return temps.map((temp, hour) => ({ hour, temp, weatherCode: 0, isDay: true }));
}

function comparison(todayDate = "2026-10-16"): DayComparison {
  return {
    lat: 37.5,
    lon: 127,
    yesterdayDate: "2026-10-15",
    todayDate,
    utcOffsetSeconds: KST,
    yesterday: hours(Array(24).fill(10)),
    today: hours(Array(24).fill(12)),
    fetchedAt: 0,
    source: "test",
  };
}

describe("tempDiff", () => {
  it("각자 반올림한 뒤 뺀다", () => {
    expect(tempDiff(19.6, 16.4)).toBe(4); // 20 - 16
    expect(tempDiff(10.4, 10.6)).toBe(-1); // 10 - 11
    expect(tempDiff(-2.6, -0.4)).toBe(-3); // -3 - 0
  });
});

describe("formatDiff / diffSentence", () => {
  it("부호와 유니코드 마이너스", () => {
    expect(formatDiff(3)).toBe("+3°");
    expect(formatDiff(-2)).toBe("−2°");
    expect(formatDiff(0)).toBe("같음");
  });
  it("문장형", () => {
    expect(diffSentence(6)).toBe("어제보다 6° 높음");
    expect(diffSentence(-1)).toBe("어제보다 1° 낮음");
    expect(diffSentence(0)).toBe("어제와 같음");
  });
});

describe("localNow / nowHourFor", () => {
  it("UTC 05:20 은 KST 14:20", () => {
    const ms = Date.UTC(2026, 9, 16, 5, 20);
    expect(localNow(KST, ms)).toEqual({ date: "2026-10-16", hour: 14, minute: 20 });
  });
  it("KST 자정 직후는 날짜가 넘어간다", () => {
    const ms = Date.UTC(2026, 9, 16, 15, 5); // KST 10/17 00:05
    expect(localNow(KST, ms).date).toBe("2026-10-17");
  });
  it("자료 날짜가 지났으면 stale", () => {
    const c = comparison("2026-10-16");
    expect(nowHourFor(c, Date.UTC(2026, 9, 16, 5, 0))).toEqual({ hour: 14, stale: false });
    expect(nowHourFor(c, Date.UTC(2026, 9, 16, 15, 5)).stale).toBe(true);
  });
});

describe("dayStats", () => {
  it("반올림한 최고·최저", () => {
    expect(dayStats(hours([11.4, 22.5, 15, -0.6]))).toEqual({ hi: 23, lo: -1 });
  });
});

describe("linearScale", () => {
  it("범위를 출력 구간으로 매핑", () => {
    const s = linearScale([0, 20], 10, 110);
    expect(s(0)).toBe(10);
    expect(s(20)).toBe(110);
    expect(s(10)).toBe(60);
  });
  it("영하도 양수 높이가 된다", () => {
    const s = linearScale([-12, -3], 14, 126);
    expect(s(-12)).toBeGreaterThanOrEqual(14);
    expect(s(-3)).toBeLessThanOrEqual(126);
  });
  it("범위가 좁으면 최소 폭을 확보", () => {
    const s = linearScale([15, 16], 0, 80, 8);
    expect(s(16) - s(15)).toBeCloseTo(10); // 80 * 1/8
  });
});

describe("threeHourSlots", () => {
  it("현재 시각이 속한 3시간 구간을 표시", () => {
    const slots = threeHourSlots(14);
    expect(slots.map((s) => s.hour)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
    expect(slots.filter((s) => s.isNow).map((s) => s.hour)).toEqual([12]);
  });
});

describe("shortDate", () => {
  it("MM/DD", () => expect(shortDate("2026-10-05")).toBe("10/05"));
});
