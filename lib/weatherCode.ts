/** WMO weather code → 한글 하늘 상태 + 아이콘 종류 */

export type SkyIcon = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "thunder";

export function skyOf(code: number): { label: string; icon: SkyIcon } {
  if (code === 0) return { label: "맑음", icon: "clear" };
  if (code === 1) return { label: "구름조금", icon: "partly" };
  if (code === 2) return { label: "구름많음", icon: "partly" };
  if (code === 3) return { label: "흐림", icon: "cloudy" };
  if (code === 45 || code === 48) return { label: "안개", icon: "fog" };
  if (code >= 51 && code <= 57) return { label: "이슬비", icon: "drizzle" };
  if (code >= 61 && code <= 67) return { label: "비", icon: "rain" };
  if (code >= 71 && code <= 77) return { label: "눈", icon: "snow" };
  if (code >= 80 && code <= 82) return { label: "소나기", icon: "rain" };
  if (code === 85 || code === 86) return { label: "눈", icon: "snow" };
  if (code >= 95) return { label: "뇌우", icon: "thunder" };
  return { label: "흐림", icon: "cloudy" };
}

export function skyLabel(code: number) {
  return skyOf(code).label;
}
