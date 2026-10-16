import { diffAt, formatDiff, hourLabel, linearScale, threeHourSlots, toneColor } from "@/lib/compare";
import type { DayComparison } from "@/lib/weather/types";

/**
 * 1c 메인 시트의 나란한 막대: 3시간 간격 8쌍(어제 회색, 오늘 주황).
 * 막대 높이는 어제·오늘 합친 범위로 정규화(최소 14px, 최대 126px).
 */
export function CompareBarChart({ data, nowHour }: { data: DayComparison; nowHour: number }) {
  const slots = threeHourSlots(nowHour);
  const values = slots.flatMap(({ hour }) => [data.today[hour].temp, data.yesterday[hour].temp]);
  const height = linearScale(values, 14, 126);

  return (
    <div>
      <div className="grid h-[210px] grid-cols-8 items-end gap-1" role="img" aria-label="3시간 간격 어제와 오늘 기온 막대 그래프">
        {slots.map(({ hour, isNow }) => {
          const d = diffAt(data, hour);
          const today = Math.round(data.today[hour].temp);
          return (
            <div key={hour} className="flex h-full flex-col items-center justify-end gap-1.5">
              <div className="text-[11px] font-bold" style={{ color: toneColor(d) }}>
                {formatDiff(d)}
              </div>
              <div className="text-[12px] font-bold">{today}°</div>
              <div className="flex items-end gap-0.5">
                <div
                  className="w-3 rounded-t bg-yesterday-bar"
                  style={{ height: height(data.yesterday[hour].temp) }}
                  title={`어제 ${hour}시 ${Math.round(data.yesterday[hour].temp)}°`}
                />
                <div
                  className={`w-3 rounded-t ${isNow ? "bg-today-bar-now" : "bg-today-bar"}`}
                  style={{ height: height(data.today[hour].temp) }}
                  title={`오늘 ${hour}시 ${today}°`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-8 gap-1 border-t border-axis pt-2">
        {slots.map(({ hour, isNow }) => (
          <div key={hour} className={`text-center text-[11px] text-muted ${isNow ? "font-extrabold" : "font-medium"}`}>
            {hourLabel(hour, isNow)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareBarChartSkeleton() {
  return (
    <div>
      <div className="grid h-[210px] grid-cols-8 items-end gap-1">
        {[60, 50, 45, 70, 100, 110, 95, 80].map((h, i) => (
          <div key={i} className="flex justify-center">
            <div className="skeleton w-[26px]" style={{ height: h }} />
          </div>
        ))}
      </div>
      <div className="mt-0 h-[25px] border-t border-axis" />
    </div>
  );
}
