"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nowHourFor } from "./compare";
import type { LatLon } from "./weather/types";
import type { DayComparison } from "./weather/types";

/** 클라이언트 메모리 캐시: 같은 지점을 화면 전환마다 다시 받지 않도록 (10분) */
const TTL = 10 * 60_000;
const memo = new Map<string, { at: number; data: DayComparison }>();

function key(p: LatLon) {
  return `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
}

function fresh(k: string) {
  const hit = memo.get(k);
  if (!hit || Date.now() - hit.at > TTL) return null;
  if (nowHourFor(hit.data).stale) return null; // 자정이 지났으면 다시
  return hit.data;
}

export async function fetchComparisons(points: LatLon[], force = false): Promise<DayComparison[]> {
  const keys = points.map(key);
  const missing = points.filter((_, i) => force || !fresh(keys[i]));
  if (missing.length > 0) {
    const q = missing.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join(";");
    const res = await fetch(`/api/weather?points=${encodeURIComponent(q)}`);
    const body = (await res.json()) as { results?: DayComparison[]; error?: string };
    if (!res.ok || !body.results) throw new Error(body.error ?? "날씨 정보를 불러오지 못했습니다");
    body.results.forEach((d, i) => memo.set(key(missing[i]), { at: Date.now(), data: d }));
  }
  return keys.map((k) => memo.get(k)!.data);
}

type State = { data: DayComparison[] | null; error: string | null; loading: boolean };

/**
 * 여러 지점의 어제·오늘 비교 자료. 화면이 다시 보일 때(앱 복귀) 자동 갱신한다.
 */
export function useComparisons(points: LatLon[] | null) {
  const pointsKey = points ? points.map(key).join(";") : "";
  const [state, setState] = useState<State>(() => {
    const cached = points?.map((p) => fresh(key(p)));
    return cached && cached.every(Boolean)
      ? { data: cached as DayComparison[], error: null, loading: false }
      : { data: null, error: null, loading: Boolean(points?.length) };
  });
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  });

  const load = useCallback(async (force = false) => {
    const pts = pointsRef.current;
    if (!pts || pts.length === 0) {
      setState({ data: [], error: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchComparisons(pts, force);
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "오류가 발생했습니다" }));
    }
  }, []);

  useEffect(() => {
    if (!pointsKey) return;
    void load();
  }, [pointsKey, load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return { ...state, reload: load };
}

export function useComparison(point: LatLon | null) {
  const { data, ...rest } = useComparisons(point ? [point] : null);
  return { data: data?.[0] ?? null, ...rest };
}
