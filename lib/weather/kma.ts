import { cacheLife } from "next/cache";
import {
  blend,
  kmaToWmo,
  kstStamp,
  nearStations,
  observedCode,
  parseForecast,
  parseMinute,
  parseStations,
  stampToLocal,
  toGrid,
  ultraBase,
  vilageBase,
  type Forecast,
  type Near,
  type Snapshot,
  type Station,
} from "./kma-parse";
import { openMeteoProvider } from "./open-meteo";
import type { DayComparison, LatLon, WeatherProvider } from "./types";

/**
 * 기상청 API허브(apihub.kma.go.kr) 제공자.
 * - 지금 기온: 근처 AWS 관측소 1분 관측을 거리 가중 평균
 * - 어제 24시간·오늘 지난 시각: 같은 방식의 정시 관측값
 * - 오늘 남은 시각: 초단기예보(6시간) → 단기예보 순
 * - 하늘 상태·낮밤과 빈칸은 Open-Meteo 값으로 채운다. 기상청 호출이 실패하거나
 *   근처에 관측소가 없으면(해외 등) Open-Meteo 결과를 그대로 돌려준다.
 */

const BASE = "https://apihub.kma.go.kr/api";

async function kmaFetch(path: string, encoding = "euc-kr"): Promise<string> {
  const key = process.env.KMA_API_KEY;
  if (!key) throw new Error("KMA_API_KEY 가 설정되지 않았습니다");
  const res = await fetch(`${BASE}${path}&authKey=${key}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`기상청 응답 오류 ${res.status}`);
  return new TextDecoder(encoding).decode(await res.arrayBuffer());
}

/* ---------- 캐시된 조회 (모든 사용자·지점이 함께 씀) ---------- */

async function getStations(): Promise<Station[]> {
  "use cache";
  cacheLife("days");
  return parseStations(await kmaFetch("/typ01/url/stn_inf.php?inf=AWS&stn="));
}

/** 가장 최근 1분 관측(전국). 1분마다 새로 받는다 */
async function getLatest(): Promise<{ tm: string | null; data: Snapshot }> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  return parseMinute(await kmaFetch("/typ01/cgi-bin/url/nph-aws2_min?stn=0&disp=1&help=0"));
}

/** 지난 특정 분의 전국 관측. 지난 값은 바뀌지 않으므로 오래 둔다 */
async function getSnapshot(tm: string): Promise<Snapshot> {
  "use cache";
  const { data } = parseMinute(await kmaFetch(`/typ01/cgi-bin/url/nph-aws2_min?tm2=${tm}&stn=0&disp=1&help=0`));
  // 아직 다 모이지 않은 자료면 잠깐만 둔다
  if (Object.keys(data).length < 300) cacheLife("minutes");
  else cacheLife("days");
  return data;
}

async function getForecast(kind: "vilage" | "ultra", nx: number, ny: number, date: string, time: string): Promise<Forecast> {
  "use cache";
  if (kind === "vilage") cacheLife("hours");
  else cacheLife("minutes");
  const op = kind === "vilage" ? "getVilageFcst" : "getUltraSrtFcst";
  const text = await kmaFetch(
    `/typ02/openApi/VilageFcstInfoService_2.0/${op}?pageNo=1&numOfRows=1000&dataType=JSON&base_date=${date}&base_time=${time}&nx=${nx}&ny=${ny}`,
    "utf-8",
  );
  return parseForecast(JSON.parse(text));
}

/** Open-Meteo 는 하늘 상태·빈칸용이라 15분마다면 충분 (무료 호출량 절약) */
async function getModel(lat: number, lon: number, dayKey: string): Promise<DayComparison> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  void dayKey; // 캐시 키 용도
  const [result] = await openMeteoProvider.getComparisons([{ lat, lon }]);
  return result;
}

/** 동시에 너무 많이 부르지 않도록 몇 개씩 나눠 받는다 */
async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/* ---------- 조립 ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

async function compare(point: LatLon, now: number): Promise<DayComparison> {
  const dayKey = kstStamp(now).slice(0, 8);
  const model = await getModel(point.lat, point.lon, dayKey);

  const near = nearStations(point, await getStations());
  if (!near.length) return model; // 관측소가 먼 곳(해외 등)

  const today = kstStamp(now).slice(0, 8);
  const yday = kstStamp(now - 86400_000).slice(0, 8);
  const latest = await getLatest();
  if (!latest.tm) return model;
  // 이미 관측된 오늘 정시: 최신 관측 시각까지
  const lastHour = latest.tm.slice(0, 8) === today ? Number(latest.tm.slice(8, 10)) : -1;

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const stamps = [
    ...hours.map((h) => `${yday}${pad(h)}00`),
    ...hours.filter((h) => h <= lastHour).map((h) => `${today}${pad(h)}00`),
    `${yday}${latest.tm.slice(8, 12)}`, // 어제 같은 분
  ];
  const { nx, ny } = toGrid(point);
  const vb = vilageBase(now);
  const ub = ultraBase(now);
  const [snaps, vilage, ultra] = await Promise.all([
    mapLimited(stamps, 12, getSnapshot),
    getForecast("vilage", nx, ny, vb.date, vb.time).catch(() => ({}) as Forecast),
    getForecast("ultra", nx, ny, ub.date, ub.time).catch(() => ({}) as Forecast),
  ]);
  const snapAt = new Map(stamps.map((s, i) => [s, snaps[i]]));

  const observe = (stamp: string, h: Near[]) => {
    const snap = snapAt.get(stamp);
    return snap ? blend(snap, h) : null;
  };

  const yesterday = model.yesterday.map((m) => {
    const o = observe(`${yday}${pad(m.hour)}00`, near);
    return o ? { ...m, temp: o.temp, weatherCode: observedCode(m.weatherCode, o.rain, o.temp) } : m;
  });

  let observedThroughHour = -1;
  const todayHours = model.today.map((m) => {
    if (m.hour <= lastHour) {
      const o = observe(`${today}${pad(m.hour)}00`, near);
      if (o) {
        observedThroughHour = m.hour;
        return { ...m, temp: o.temp, weatherCode: observedCode(m.weatherCode, o.rain, o.temp) };
      }
    }
    const key = `${today}${pad(m.hour)}`;
    const f = { ...vilage[key], ...ultra[key] }; // 초단기예보가 더 최신
    return {
      ...m,
      temp: f.temp ?? m.temp,
      weatherCode: kmaToWmo(f.sky, f.pty) ?? m.weatherCode,
    };
  });

  const live = blend(latest.data, near);
  const yLive = observe(`${yday}${latest.tm.slice(8, 12)}`, near);

  return {
    ...model,
    yesterday,
    today: todayHours,
    fetchedAt: now,
    source: "기상청",
    observedThroughHour: observedThroughHour >= 0 ? observedThroughHour : undefined,
    live: live
      ? {
          temp: live.temp,
          observedAt: stampToLocal(latest.tm),
          yesterdayTemp: yLive?.temp ?? null,
          stations: live.used.map((s) => ({ name: s.name, km: Math.round(s.km * 10) / 10 })),
        }
      : undefined,
  };
}

export const kmaProvider: WeatherProvider = {
  id: "kma",
  async getComparisons(points) {
    const now = Date.now();
    return Promise.all(
      points.map(async (p) => {
        try {
          return await compare(p, now);
        } catch (e) {
          // 기상청이 안 될 때는 예전처럼 Open-Meteo 로 보여준다
          console.error("[kma]", e instanceof Error ? e.message : e);
          return getModel(p.lat, p.lon, kstStamp(now).slice(0, 8));
        }
      }),
    );
  },
};
