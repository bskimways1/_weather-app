import { linearScale } from "@/lib/compare";
import type { DayComparison } from "@/lib/weather/types";

const W = 342;
const H = 90;
const PAD = 8;

/** 1d 상단 미니 라인 그래프: 오늘 실선(예보 구간은 흐리게), 어제 점선, 현재 시각 세로 점선 */
export function HourlyLineChart({ data, nowHour }: { data: DayComparison; nowHour: number }) {
  const all = [...data.today, ...data.yesterday].map((h) => h.temp);
  const y = linearScale(all, H - PAD, PAD);
  const x = (h: number) => (h * W) / 23;
  const line = (hours: DayComparison["today"]) => hours.map((p) => `${x(p.hour).toFixed(1)},${y(p.temp).toFixed(1)}`).join(" ");
  // 관측 구분이 있으면 관측 구간과 예보 구간을 나눠 그린다 (경계 시각은 양쪽에 포함해 이어지게)
  const split = data.observedThroughHour ?? 23;
  const observed = data.today.slice(0, split + 1);
  const forecast = data.today.slice(split);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-[90px] w-full"
      role="img"
      aria-label="시간대별 어제(점선)와 오늘(실선) 기온 그래프"
    >
      <line
        x1={x(nowHour)}
        y1={0}
        x2={x(nowHour)}
        y2={H}
        stroke="oklch(0.8 0.006 80)"
        strokeDasharray="2 3"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={line(data.yesterday)}
        fill="none"
        stroke="var(--color-yesterday-line)"
        strokeWidth={2}
        strokeDasharray="4 4"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {forecast.length > 1 && (
        <polyline
          points={line(forecast)}
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0.4}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <polyline
        points={line(observed)}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
