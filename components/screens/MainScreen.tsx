"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ChevronRight, LocateFixed, RotateCw } from "lucide-react";
import { CompareBarChart, CompareBarChartSkeleton } from "@/components/CompareBarChart";
import { ErrorRetry } from "@/components/ErrorRetry";
import { queryGeoPermission, useLocation } from "@/components/LocationProvider";
import { StarButton } from "@/components/StarButton";
import { TabBar } from "@/components/TabBar";
import { usePullToRefresh } from "@/components/usePullToRefresh";
import { WeatherIcon } from "@/components/WeatherIcon";
import { dayStats, diffAt, diffSentence, nowHourFor } from "@/lib/compare";
import { placeFromQuery, placeToQuery } from "@/lib/placeQuery";
import { getFavorites, isOnboarded, useFavorites } from "@/lib/storage";
import { useComparison } from "@/lib/useWeather";
import { skyLabel } from "@/lib/weatherCode";

export function MainScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const selected = useMemo(() => placeFromQuery(sp), [sp]);
  const gpsMode = !selected;
  const location = useLocation();
  const { locate } = location;
  const place = selected ?? location.place;
  const { isFavorite, toggle } = useFavorites();

  // GPS 모드 진입 흐름: 권한 허용 → 위치 / 첫 방문 → 안내(1g) / 거부 → 즐겨찾기 또는 검색(1f)
  useEffect(() => {
    if (!gpsMode) return;
    let cancelled = false;
    const fallback = () => {
      const first = getFavorites()[0];
      router.replace(first ? `/?${placeToQuery(first)}` : "/search?reason=denied");
    };
    (async () => {
      const perm = await queryGeoPermission();
      if (cancelled) return;
      if (perm === "denied") return fallback();
      if (perm !== "granted" && !isOnboarded()) return router.replace("/welcome");
      const p = await locate();
      if (!cancelled && !p) fallback();
    })();
    return () => {
      cancelled = true;
    };
  }, [gpsMode, locate, router]);

  const point = useMemo(() => (place ? { lat: place.lat, lon: place.lon } : null), [place]);
  const weather = useComparison(point);
  const data = weather.data;
  const now = data ? nowHourFor(data) : null;

  // 자정이 지나 자료가 어제 것이 되었으면 다시 받는다
  const { reload } = weather;
  useEffect(() => {
    if (now?.stale) void reload(true);
  }, [now?.stale, reload]);

  const refresh = async () => {
    await Promise.all([reload(true), gpsMode ? locate() : null]);
  };
  const { pull, refreshing, ready, handlers } = usePullToRefresh(refresh);

  const hour = now?.hour ?? 0;
  const today = data?.today[hour];
  const yesterday = data?.yesterday[hour];
  const d = data ? diffAt(data, hour) : 0;
  const tStats = data ? dayStats(data.today) : null;
  const yStats = data ? dayStats(data.yesterday) : null;

  return (
    <div className="flex h-dvh flex-col bg-hero">
      {/* 상단 영역 */}
      <header className="pt-safe">
        <div className="flex flex-col gap-[18px] px-6 pt-3 pb-7">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-1.5 text-[15px] font-bold whitespace-nowrap">
              {gpsMode && <LocateFixed size={15} strokeWidth={2.2} aria-label="현재 위치" />}
              {place ? place.name : location.status === "locating" ? "위치 확인 중…" : " "}
            </h1>
            {place && (
              <StarButton on={isFavorite(place.id)} onToggle={() => toggle(place)} offColor="var(--color-ink)" />
            )}
            {!place && <div className="h-11 w-11" />}
          </div>

          <div className="flex items-end justify-between">
            {today ? (
              <div className="text-[120px] leading-[0.9] font-extralight tracking-[-0.05em]">{Math.round(today.temp)}°</div>
            ) : (
              <div className="skeleton my-2 h-[92px] w-[190px] bg-black/10" />
            )}
            <div className="flex flex-col items-end gap-1 pb-2">
              {today ? (
                <>
                  <div className="flex items-center gap-1.5 text-[15px] font-semibold">
                    <WeatherIcon code={today.weatherCode} isDay={today.isDay} size={18} />
                    {skyLabel(today.weatherCode)}
                  </div>
                  <div className="text-[13px]">
                    {tStats!.hi}° / {tStats!.lo}°
                  </div>
                </>
              ) : (
                <div className="skeleton h-10 w-16 bg-black/10" />
              )}
            </div>
          </div>

          <div className="flex min-h-[38px] items-center gap-2.5">
            {today && yesterday ? (
              <>
                <div className="rounded-full bg-ink px-3.5 py-2 text-[15px] font-bold text-white">{diffSentence(d)}</div>
                <div className="text-[13px]">어제 {Math.round(yesterday.temp)}°</div>
              </>
            ) : (
              <div className="skeleton h-[38px] w-[150px] rounded-full bg-black/10" />
            )}
          </div>
        </div>
      </header>

      {/* 하단 시트 */}
      <main
        className="relative flex flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain rounded-t-[32px] bg-surface px-5 pt-6 pb-5"
        {...handlers}
      >
        {(pull > 0 || refreshing) && (
          <div className="flex justify-center text-faint" style={{ height: pull, marginTop: -8 }} aria-live="polite">
            <RotateCw
              size={18}
              className={refreshing ? "animate-spin" : ""}
              style={{ transform: refreshing ? undefined : `rotate(${pull * 4}deg)`, opacity: ready || refreshing ? 1 : 0.5 }}
              aria-label={refreshing ? "새로고침 중" : "당겨서 새로고침"}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold">오늘 vs 어제</h2>
          <div className="flex gap-3 text-[12px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-yesterday-bar" />
              어제
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-today-bar" />
              오늘
            </span>
          </div>
        </div>

        {weather.error && !data ? (
          <ErrorRetry message={weather.error} onRetry={() => void reload(true)} />
        ) : data && place ? (
          <Link href={`/detail?${placeToQuery(place)}`} aria-label="시간대별 상세 비교 보기" className="block">
            <CompareBarChart data={data} nowHour={hour} />
          </Link>
        ) : (
          <CompareBarChartSkeleton />
        )}

        {data && tStats && yStats && (
          <>
            <p className="pt-1 text-[13px] leading-normal text-muted">
              최고 기온 어제 {yStats.hi}° → 오늘 {tStats.hi}° · 최저 기온 어제 {yStats.lo}° → 오늘 {tStats.lo}°
            </p>
            {place && (
              <Link
                href={`/detail?${placeToQuery(place)}`}
                className="flex items-center gap-0.5 self-start text-[13px] font-semibold text-accent-link"
              >
                시간대별로 자세히 보기 <ChevronRight size={14} />
              </Link>
            )}
          </>
        )}

        {!place && location.status !== "locating" && location.error && (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-[14px] text-muted">
            {location.error}
            <div className="flex gap-2">
              <button type="button" onClick={() => void locate()} className="h-11 rounded-[10px] bg-ink px-4 font-bold text-white">
                다시 시도
              </button>
              <Link href="/search" className="flex h-11 items-center rounded-[10px] bg-fill px-4 font-semibold">
                지역 검색
              </Link>
            </div>
          </div>
        )}

        {data && <p className="mt-auto pt-4 text-[11px] text-faint">데이터 {data.source} · 어제 값은 모델 분석값, 오늘 값은 예보</p>}
      </main>

      <TabBar active={gpsMode ? "here" : null} />
    </div>
  );
}

export function MainScreenSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-hero">
      <div className="flex flex-col gap-[18px] px-6 pt-3 pb-7">
        <div className="h-11" />
        <div className="skeleton my-2 h-[92px] w-[190px] bg-black/10" />
        <div className="skeleton h-[38px] w-[150px] rounded-full bg-black/10" />
      </div>
      <div className="flex-1 rounded-t-[32px] bg-surface px-5 pt-6">
        <CompareBarChartSkeleton />
      </div>
      <TabBar active="here" />
    </div>
  );
}
