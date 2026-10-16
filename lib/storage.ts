"use client";

import { useCallback, useSyncExternalStore } from "react";
import { roundCoord, type Place } from "./geo/types";

/** 저장하는 지역 좌표는 약 100m 단위로 반올림 (정밀 GPS 좌표를 남기지 않음) */
function roundPlace(p: Place): Place {
  return { ...p, lat: roundCoord(p.lat), lon: roundCoord(p.lon) };
}

/**
 * localStorage 상태. 같은 탭의 다른 컴포넌트에도 바로 반영되도록
 * 쓰기 때마다 커스텀 이벤트를 쏜다. 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 깨지지 않게 try/catch.
 */
const EVENT = "weather-app-storage";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 무시(세션 동안만 유지 안 됨)
  }
  // 캐시를 비우고 구독자에게 알림
  snapshotCache.delete(key);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

function subscribe(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

// useSyncExternalStore 는 같은 참조를 돌려줘야 하므로 원문 문자열 기준으로 캐시
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();
function snapshot<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {}
  const hit = snapshotCache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = raw == null ? fallback : read(key, fallback);
  snapshotCache.set(key, { raw, value });
  return value;
}

function useStored<T>(key: string, fallback: T, serverFallback: T = fallback): T {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(key, fallback),
    () => serverFallback,
  );
}

/* ---------- 즐겨찾기 ---------- */

const FAV_KEY = "favorites";
const EMPTY: Place[] = [];

export function getFavorites(): Place[] {
  return read<Place[]>(FAV_KEY, []);
}

export function useFavorites() {
  const favorites = useStored<Place[]>(FAV_KEY, EMPTY);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  const add = useCallback((place: Place) => {
    const list = getFavorites();
    if (list.some((f) => f.id === place.id)) return;
    write(FAV_KEY, [...list, roundPlace(place)]);
  }, []);

  const remove = useCallback((id: string) => {
    write(FAV_KEY, getFavorites().filter((f) => f.id !== id));
  }, []);

  const toggle = useCallback(
    (place: Place) => (getFavorites().some((f) => f.id === place.id) ? remove(place.id) : add(place)),
    [add, remove],
  );

  const move = useCallback((id: string, delta: -1 | 1) => {
    const list = [...getFavorites()];
    const i = list.findIndex((f) => f.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    write(FAV_KEY, list);
  }, []);

  return { favorites, isFavorite, add, remove, toggle, move };
}

/* ---------- 최근 검색 ---------- */

const RECENT_KEY = "recentSearches";
const NO_RECENT: string[] = [];

export function useRecentSearches() {
  const recent = useStored<string[]>(RECENT_KEY, NO_RECENT);
  const push = useCallback((q: string) => {
    const term = q.trim();
    if (!term) return;
    const list = read<string[]>(RECENT_KEY, []).filter((x) => x !== term);
    write(RECENT_KEY, [term, ...list].slice(0, 5));
  }, []);
  return { recent, push };
}

/* ---------- 첫 진입 여부 ---------- */

const ONBOARD_KEY = "onboarded";

export function isOnboarded() {
  return read<boolean>(ONBOARD_KEY, false);
}
export function setOnboarded() {
  write(ONBOARD_KEY, true);
}

/* ---------- 마지막 GPS 위치 (다음 진입 시 빠르게 표시) ---------- */

const LAST_GPS_KEY = "lastGps";

export function useLastGps(): Place | null {
  return useStored<Place | null>(LAST_GPS_KEY, null);
}
export function saveLastGps(place: Place) {
  write(LAST_GPS_KEY, roundPlace(place));
}

/* ---------- 이전 버전에서 저장된 정밀 좌표 정리 (1회) ---------- */

function migrateStoredCoords() {
  try {
    const gps = read<Place | null>(LAST_GPS_KEY, null);
    if (gps) window.localStorage.setItem(LAST_GPS_KEY, JSON.stringify(roundPlace(gps)));
    const favs = read<Place[]>(FAV_KEY, []);
    if (favs.length) window.localStorage.setItem(FAV_KEY, JSON.stringify(favs.map(roundPlace)));
  } catch {
    // 저장소를 못 쓰면 정리할 것도 없다
  }
}

if (typeof window !== "undefined") migrateStoredCoords();
