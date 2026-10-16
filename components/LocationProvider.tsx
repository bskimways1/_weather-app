"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { placeId, type Place } from "@/lib/geo/types";
import { saveLastGps, useLastGps } from "@/lib/storage";

/**
 * 현재 위치(GPS) 상태. 메인·즐겨찾기 화면이 같이 쓴다.
 * 권한 요청은 화면이 locate() 를 부를 때만 한다(첫 진입 안내 화면을 거친 뒤).
 */
export type LocationStatus = "idle" | "locating" | "ready" | "denied" | "unavailable";

type Ctx = {
  status: LocationStatus;
  place: Place | null;
  error: string | null;
  locate: () => Promise<Place | null>;
};

const LocationContext = createContext<Ctx | null>(null);

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

/** 위치 권한 상태. Safari 일부 버전처럼 Permissions API 가 없으면 unsupported */
export async function queryGeoPermission(): Promise<PermissionState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  try {
    const r = await navigator.permissions.query({ name: "geolocation" });
    return r.state;
  } catch {
    return "unsupported";
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15_000,
      maximumAge: 5 * 60_000,
    });
  });
}

async function reverse(lat: number, lon: number): Promise<Place> {
  const fallback: Place = { id: placeId(lat, lon), name: "현재 위치", label: "현재 위치", sub: "", lat, lon };
  try {
    const res = await fetch(`/api/geo/reverse?lat=${lat}&lon=${lon}`);
    const body = (await res.json()) as { place?: Place | null };
    return body.place ? { ...body.place, id: placeId(lat, lon) } : fallback;
  } catch {
    return fallback;
  }
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LocationStatus>("idle");
  // 마지막 GPS 위치는 저장소에 두어, 다음 진입 때 먼저 보여 주고 새 위치로 갱신한다
  const place = useLastGps();
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Promise<Place | null> | null>(null);

  const locate = useCallback(() => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      if (!navigator.geolocation) {
        setStatus("unavailable");
        setError("이 브라우저는 위치 기능을 지원하지 않습니다");
        return null;
      }
      setStatus("locating");
      setError(null);
      try {
        const pos = await getPosition();
        const p = await reverse(pos.coords.latitude, pos.coords.longitude);
        saveLastGps(p);
        setStatus("ready");
        return p;
      } catch (e) {
        const denied = (e as GeolocationPositionError)?.code === 1;
        setStatus(denied ? "denied" : "unavailable");
        setError(denied ? "위치 권한이 꺼져 있습니다" : "현재 위치를 찾지 못했습니다");
        return null;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, []);

  const value = useMemo(() => ({ status, place, error, locate }), [status, place, error, locate]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation 은 LocationProvider 안에서만 쓸 수 있습니다");
  return ctx;
}
