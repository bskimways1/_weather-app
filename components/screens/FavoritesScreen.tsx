"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useLocation } from "@/components/LocationProvider";
import { StarButton } from "@/components/StarButton";
import { TabBar } from "@/components/TabBar";
import { dayStats, diffAt, diffSentence, nowHourFor, toneColor, toneSoftBg } from "@/lib/compare";
import type { Place } from "@/lib/geo/types";
import { placeToQuery } from "@/lib/placeQuery";
import { useFavorites } from "@/lib/storage";
import { useComparisons } from "@/lib/useWeather";
import type { DayComparison } from "@/lib/weather/types";
import { skyLabel } from "@/lib/weatherCode";

export function FavoritesScreen() {
  const location = useLocation();
  const gps = location.place;
  const { favorites, isFavorite, toggle, remove, move } = useFavorites();
  const [editing, setEditing] = useState(false);
  // 별을 꺼도 이 화면을 떠나기 전까지는 카드를 남겨 두어 실수로 끈 것을 되돌릴 수 있게
  const [unstarred, setUnstarred] = useState<Place[]>([]);

  // 현재 위치는 이전에 잡아 둔 값이 있으면 조용히 갱신만 한다 (권한 팝업은 띄우지 않음)
  const { locate } = location;
  useEffect(() => {
    if (!gps) return;
    void navigator.permissions
      ?.query({ name: "geolocation" })
      .then((r) => {
        if (r.state === "granted") void locate();
      })
      .catch(() => {});
    // 화면 진입 시 1회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    const extra = unstarred.filter((u) => !favorites.some((f) => f.id === u.id));
    // 현재 위치를 즐겨찾기한 경우 첫 카드(현재 위치)와 겹치지 않게 뺀다
    return [...favorites, ...extra].filter((p) => p.id !== gps?.id);
  }, [favorites, unstarred, gps?.id]);

  const cards: { place: Place; isGps: boolean }[] = useMemo(
    () => [...(gps ? [{ place: gps, isGps: true }] : []), ...list.map((place) => ({ place, isGps: false }))],
    [gps, list],
  );
  const points = useMemo(() => (cards.length ? cards.map(({ place: p }) => ({ lat: p.lat, lon: p.lon })) : null), [cards]);
  const weather = useComparisons(points);

  const toggleStar = (p: Place) => {
    if (isFavorite(p.id)) setUnstarred((u) => (u.some((x) => x.id === p.id) ? u : [...u, p]));
    toggle(p);
  };

  return (
    <div className="flex h-dvh flex-col">
      <main className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-6 pt-[max(8px,env(safe-area-inset-top))] pb-6">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-[26px] font-bold">즐겨찾기</h1>
          {favorites.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setEditing((e) => !e);
                setUnstarred([]);
              }}
              className="h-11 px-1 text-[14px] font-semibold text-accent-link"
            >
              {editing ? "완료" : "편집"}
            </button>
          )}
        </div>

        {cards.map(({ place, isGps }, i) => {
          const fav = favorites.findIndex((f) => f.id === place.id);
          const card = (
            <FavoriteCard
              place={place}
              isGps={isGps}
              data={weather.data?.[i] ?? null}
              starOn={isFavorite(place.id)}
              onStar={() => toggleStar(place)}
              editControls={
                editing && !isGps && fav >= 0 ? (
                  <div className="flex items-center gap-1">
                    <IconBtn label="위로" disabled={fav === 0} onClick={() => move(place.id, -1)}>
                      <ChevronUp size={20} />
                    </IconBtn>
                    <IconBtn label="아래로" disabled={fav === favorites.length - 1} onClick={() => move(place.id, 1)}>
                      <ChevronDown size={20} />
                    </IconBtn>
                    <IconBtn label="삭제" onClick={() => remove(place.id)}>
                      <Trash2 size={18} color="var(--color-up)" />
                    </IconBtn>
                  </div>
                ) : null
              }
            />
          );
          return editing ? (
            <div key={`${isGps}-${place.id}`}>{card}</div>
          ) : (
            <Link key={`${isGps}-${place.id}`} href={isGps ? "/" : `/?${placeToQuery(place)}`} className="block">
              {card}
            </Link>
          );
        })}

        {weather.error && <p className="text-[13px] text-muted">{weather.error}</p>}

        {favorites.length === 0 && unstarred.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-[14px] leading-normal text-muted">
            아직 즐겨찾기한 지역이 없어요.
            <br />
            검색에서 지역을 추가하면 어제와 비교한 날씨를 한눈에 볼 수 있어요.
            <Link href="/search" className="mt-1 flex h-11 items-center rounded-[10px] bg-ink px-4 font-bold text-white">
              지역 검색
            </Link>
          </div>
        )}
      </main>
      <TabBar active="favorites" />
    </div>
  );
}

function IconBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function FavoriteCard({
  place,
  isGps,
  data,
  starOn,
  onStar,
  editControls,
}: {
  place: Place;
  isGps: boolean;
  data: DayComparison | null;
  starOn: boolean;
  onStar: () => void;
  editControls: React.ReactNode;
}) {
  const h = data ? nowHourFor(data).hour : 0;
  const now = data?.today[h];
  const d = data ? diffAt(data, h) : 0;
  const stats = data ? dayStats(data.today) : null;

  return (
    <article
      className={`flex flex-col gap-3 rounded-[20px] px-[18px] py-4 ${isGps ? "bg-ink text-white" : "bg-fill text-ink"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="text-[12px] opacity-70">{isGps ? "현재 위치" : "즐겨찾기"}</div>
          <div className="truncate text-[17px] font-bold">{place.label}</div>
          <div className="text-[13px] opacity-75">
            {now && stats ? `${skyLabel(now.weatherCode)} · ${stats.hi}° / ${stats.lo}°` : " "}
          </div>
        </div>
        {now ? (
          <div className="text-[40px] leading-none font-light">{Math.round(now.temp)}°</div>
        ) : (
          <div className={`skeleton h-10 w-16 ${isGps ? "bg-white/15" : ""}`} />
        )}
      </div>
      <div className="flex min-h-8 items-center justify-between">
        {data ? (
          <div
            className="rounded-lg px-2.5 py-1 text-[13px] font-semibold"
            style={{
              background: isGps ? "oklch(1 0 0 / 0.12)" : toneSoftBg(d),
              color: isGps ? "#fff" : d === 0 ? "var(--color-faint)" : toneColor(d),
            }}
          >
            {diffSentence(d)}
          </div>
        ) : (
          <div />
        )}
        {editControls ?? (
          <StarButton
            on={starOn}
            onToggle={onStar}
            offColor={isGps ? "#fff" : "var(--color-faint)"}
            className="-mr-2 h-8 w-11 justify-end"
          />
        )}
      </div>
    </article>
  );
}
