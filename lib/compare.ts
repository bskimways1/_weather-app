import type { DayComparison, Hourly } from "./weather/types";

/** 어제와 오늘 비교 규칙. design/README.md 「비교 로직」 그대로. */

export type Tone = "up" | "down" | "same";

/** diff = round(오늘) − round(어제), 정수 °C */
export function tempDiff(today: number, yesterday: number): number {
  return Math.round(today) - Math.round(yesterday);
}

export function diffAt(c: DayComparison, hour: number): number {
  return tempDiff(c.today[hour].temp, c.yesterday[hour].temp);
}

/** +3° / −2°(U+2212) / 같음 */
export function formatDiff(d: number): string {
  if (d > 0) return `+${d}°`;
  if (d < 0) return `−${-d}°`;
  return "같음";
}

/** 어제보다 3° 높음 / 어제보다 2° 낮음 / 어제와 같음 */
export function diffSentence(d: number): string {
  if (d === 0) return "어제와 같음";
  return `어제보다 ${Math.abs(d)}° ${d > 0 ? "높음" : "낮음"}`;
}

export function tone(d: number): Tone {
  return d > 0 ? "up" : d < 0 ? "down" : "same";
}

/** 증감 색 (CSS 변수) */
export function toneColor(d: number): string {
  return `var(--color-${tone(d)})`;
}

/** 증감 색을 14% 투명도로 (즐겨찾기 칩 배경) */
export function toneSoftBg(d: number): string {
  const t = tone(d);
  if (t === "same") return "oklch(0.9 0.006 80)";
  return t === "up" ? "oklch(0.62 0.14 45 / 0.14)" : "oklch(0.55 0.12 250 / 0.14)";
}

/** 지역 현지 시각 (utc 오프셋 기준) */
export function localNow(utcOffsetSeconds: number, nowMs = Date.now()) {
  const d = new Date(nowMs + utcOffsetSeconds * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/**
 * 비교의 기준 시각(정시 내림). 자료의 "오늘"이 이미 지난 날짜면 stale=true 로 알려
 * 다시 받게 한다(자정 넘어 캐시가 남아 있는 경우).
 */
export function nowHourFor(c: DayComparison, nowMs = Date.now()) {
  const now = localNow(c.utcOffsetSeconds, nowMs);
  if (now.date === c.todayDate) return { hour: now.hour, stale: false };
  return { hour: now.date > c.todayDate ? 23 : 0, stale: true };
}

export function dayStats(hours: Hourly[]) {
  const temps = hours.map((h) => Math.round(h.temp));
  return { hi: Math.max(...temps), lo: Math.min(...temps) };
}

/**
 * 막대·선 그래프용 선형 척도. 어제·오늘을 합친 범위로 정규화한다
 * (목업의 (기온−4)×7 고정 공식은 영하·폭염에서 깨지므로 대체).
 * 범위가 너무 좁으면 최소 폭(minSpan)을 확보해 작은 차이가 과장되지 않게 한다.
 */
export function linearScale(values: number[], outMin: number, outMax: number, minSpan = 8) {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  return (v: number) => outMin + ((v - lo) / (hi - lo)) * (outMax - outMin);
}

/** 3시간 간격 구간 (0,3,…,21) 과 현재 시각이 속한 구간 표시 */
export function threeHourSlots(nowHour: number) {
  return [0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({ hour: h, isNow: nowHour >= h && nowHour < h + 3 }));
}

export function hourLabel(hour: number, isNow: boolean) {
  return isNow ? "지금" : `${hour}시`;
}

/** MM/DD */
export function shortDate(ymd: string) {
  return `${ymd.slice(5, 7)}/${ymd.slice(8, 10)}`;
}
