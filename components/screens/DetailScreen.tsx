"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { ErrorRetry } from "@/components/ErrorRetry";
import { HourlyLineChart } from "@/components/HourlyLineChart";
import { useLocation } from "@/components/LocationProvider";
import { diffAt, formatDiff, hourLabel, nowHourFor, shortDate, toneColor } from "@/lib/compare";
import { placeFromQuery } from "@/lib/placeQuery";
import { useComparison } from "@/lib/useWeather";
import { skyLabel } from "@/lib/weatherCode";

const COLS = "grid grid-cols-[52px_1fr_1fr_90px]";

export function DetailScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const location = useLocation();
  const selected = useMemo(() => placeFromQuery(sp), [sp]);
  const place = selected ?? location.place;
  const point = useMemo(() => (place ? { lat: place.lat, lon: place.lon } : null), [place]);
  const { data, error, reload } = useComparison(point);
  const now = data ? nowHourFor(data) : null;
  const nowRow = useRef<HTMLDivElement>(null);

  // 진입 시 현재 시각 행이 보이도록
  useEffect(() => {
    nowRow.current?.scrollIntoView({ block: "center" });
  }, [data?.todayDate]);

  const back = () => (window.history.length > 1 ? router.back() : router.push("/"));

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex-none border-b border-line pt-safe">
        <div className="flex flex-col gap-3.5 px-6 pt-2 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={back} aria-label="뒤로" className="-ml-2.5 flex h-11 w-11 items-center justify-center">
              <ChevronLeft size={26} strokeWidth={2} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-[17px] font-bold">시간대별 기온 비교</h1>
              <p className="text-[12px] text-subtle">
                {place?.label ?? "현재 위치"}
                {data && ` · ${shortDate(data.yesterdayDate)} vs ${shortDate(data.todayDate)}`}
              </p>
            </div>
          </div>
          {data && now ? <HourlyLineChart data={data} nowHour={now.hour} /> : <div className="skeleton h-[90px]" />}
          <div className={`${COLS} text-[11px] font-semibold text-[oklch(0.55_0.01_80)]`}>
            <span>시간</span>
            <span>어제</span>
            <span>오늘</span>
            <span className="text-right">차이</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-safe">
        {error && !data && <ErrorRetry message={error} onRetry={() => void reload(true)} />}
        {!data && !error &&
          Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex h-12 items-center border-b border-line-soft px-6">
              <div className="skeleton h-4 w-full" />
            </div>
          ))}
        {data &&
          now &&
          data.today.map((t, h) => {
            const y = data.yesterday[h];
            const d = diffAt(data, h);
            const isNow = h === now.hour;
            return (
              <div
                key={h}
                ref={isNow ? nowRow : undefined}
                className={`${COLS} h-12 items-center border-b border-line-soft px-6 ${isNow ? "bg-now-row" : ""}`}
              >
                <span className={`text-[13px] ${isNow ? "font-extrabold" : "font-medium"}`}>{hourLabel(h, isNow)}</span>
                <span className="text-[14px] text-yesterday-text">
                  {Math.round(y.temp)}° <span className="text-[11px]">{skyLabel(y.weatherCode)}</span>
                </span>
                <span className="text-[15px] font-bold">
                  {Math.round(t.temp)}° <span className="text-[11px] font-medium text-subtle">{skyLabel(t.weatherCode)}</span>
                </span>
                <span className="flex items-center justify-end gap-1.5">
                  <span
                    className="h-1.5 rounded-[3px]"
                    style={{ width: Math.min(Math.abs(d) * 7, 50), background: toneColor(d) }}
                  />
                  <span className="min-w-[34px] text-right text-[12px] font-bold" style={{ color: toneColor(d) }}>
                    {formatDiff(d)}
                  </span>
                </span>
              </div>
            );
          })}
      </main>
    </div>
  );
}
