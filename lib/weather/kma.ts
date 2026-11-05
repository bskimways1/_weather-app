import { cacheLife } from "next/cache";
import {
  blend,
  kmaToWmo,
  kstStamp,
  nearStations,
  observedCode,
  parseForecast,
  parseHourly,
  parseMinute,
  parseStations,
  stampToLocal,
  toGrid,
  ultraBase,
  vilageBase,
  type Forecast,
  type HourObs,
  type Near,
  type Snapshot,
  type Station,
} from "./kma-parse";
import { openMeteoProvider } from "./open-meteo";
import type { DayComparison, LatLon, WeatherProvider } from "./types";

/**
 * 기상청 API허브(apihub.kma.go.kr) 제공자.
 * - 지금 기온: 근처 AWS 관측소 1분 관측을 거리 가중 평균
 * - 어제 24시간·오늘 지난 시각: 같은 관측소들의 정시 관측을 같은 방식으로
 * - 오늘 남은 시각: 초단기예보(6시간) → 단기예보 순
 * - 하늘 상태·낮밤과 빈칸은 Open-Meteo 값으로 채운다. 기상청 호출이 실패하거나
 *   근처에 관측소가 없으면(해외 등) Open-Meteo 결과를 그대로 돌려준다.
 *
 * 캐시: Vercel 같은 서버리스에서는 서버 메모리가 요청마다 사라지므로, 여러 요청·사용자가
 * 함께 쓸 값은 'use cache: remote'(Vercel 공유 캐시, Hobby 무료 한도: 읽기 월 100만·쓰기 20만)에
 * 작게 나눠 둔다. 읽기 수를 줄이려고 전국 자료 대신 근처 관측소 몇 곳 값만 저장한다.
 */

const BASE = "https://apihub.kma.go.kr/api";
/** 평균 후보로 시간별 관측을 받아 둘 관측소 수 (3곳을 쓰고 결측 대비 1곳 더) */
const SERIES_STATIONS = 4;

async function kmaFetch(path: string, encoding = "euc-kr"): Promise<string> {
  const key = process.env.KMA_API_KEY;
  if (!key) throw new Error("KMA_API_KEY 가 설정되지 않았습니다");
  const res = await fetch(`${BASE}${path}&authKey=${key}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`기상청 응답 오류 ${res.status}`);
  return new TextDecoder(encoding).decode(await res.arrayBuffer());
}

/* ---------- 캐시된 조회 ---------- */

/** 전국 관측소 목록(약 150KB). 크기가 커서 공유 캐시에 두지 않고, 아래 getNear 가 놓쳤을 때만 받는다 */
async function getStations(): Promise<Station[]> {
  "use cache";
  cacheLife("days");
  return parseStations(await kmaFetch("/typ01/url/stn_inf.php?inf=AWS&stn="));
}

/** 이 지점의 평균 후보 관측소 (지점별로 하루) */
async function getNear(lat: number, lon: number): Promise<Near[]> {
  "use cache: remote";
  cacheLife("days");
  return nearStations({ lat, lon }, await getStations());
}

/** 가장 최근 1분 관측(전국). 1분마다 새로 받는다 */
async function getLatest(): Promise<{ tm: string | null; data: Snapshot }> {
  "use cache: remote";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  return parseMinute(await kmaFetch("/typ01/cgi-bin/url/nph-aws2_min?stn=0&disp=1&help=0"));
}

/** 지난 특정 분의 전국 관측 (어제 같은 분 비교용). 지난 값은 바뀌지 않는다 */
async function getSnapshot(tm: string): Promise<Snapshot> {
  "use cache: remote";
  const { data } = parseMinute(await kmaFetch(`/typ01/cgi-bin/url/nph-aws2_min?tm2=${tm}&stn=0&disp=1&help=0`));
  // 아직 다 모이지 않은 자료면 잠깐만 둔다
  if (Object.keys(data).length < 300) cacheLife("minutes");
  else cacheLife("days");
  return data;
}

/**
 * 관측소 1곳의 하루 정시 관측(0시~through시). 기상청 1회 호출로 그날 값을 모두 받는다.
 * 어제(23시까지)는 하루, 오늘은 정시가 지날 때마다 through 가 바뀌어 새로 받는다.
 */
async function getStationHours(id: string, ymd: string, through: number): Promise<HourObs[]> {
  "use cache: remote";
  const hours = parseHourly(
    await kmaFetch(`/typ01/cgi-bin/url/nph-aws2_min?stn=${id}&tm1=${ymd}0000&tm2=${ymd}${pad(through)}00&disp=1&help=0`),
    through,
  );
  // 빈 시각이 많으면 아직 덜 모인 자료일 수 있어 잠깐만 둔다
  if (hours.filter(Boolean).length < through - 1) cacheLife("minutes");
  else if (through >= 23) cacheLife("days");
  else cacheLife("hours");
  return hours;
}

async function getForecast(kind: "vilage" | "ultra", nx: number, ny: number, date: string, time: string): Promise<Forecast> {
  "use cache: remote";
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
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  void dayKey; // 캐시 키 용도
  const [result] = await openMeteoProvider.getComparisons([{ lat, lon }]);
  return result;
}

/* ---------- 조립 ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** 관측소별 시간 값들 → h시의 관측소 묶음 (blend 입력 형식) */
function snapAt(cands: Near[], series: HourObs[][], h: number): Snapshot {
  const snap: Snapshot = {};
  cands.forEach((s, i) => {
    const v = series[i][h];
    if (v) snap[s.id] = v;
  });
  return snap;
}

async function compare(point: LatLon, now: number): Promise<DayComparison> {
  const today = kstStamp(now).slice(0, 8);
  const yday = kstStamp(now - 86400_000).slice(0, 8);
  const [model, near, latest] = await Promise.all([getModel(point.lat, point.lon, today), getNear(point.lat, point.lon), getLatest()]);
  if (!near.length || !latest.tm) return model; // 관측소가 먼 곳(해외 등)

  // 이미 관측된 오늘 정시: 최신 관측 시각까지
  const lastHour = latest.tm.slice(0, 8) === today ? Number(latest.tm.slice(8, 10)) : -1;
  const cands = near.slice(0, SERIES_STATIONS);
  const { nx, ny } = toGrid(point);
  const vb = vilageBase(now);
  const ub = ultraBase(now);
  const [ySeries, tSeries, yMinute, vilage, ultra] = await Promise.all([
    Promise.all(cands.map((s) => getStationHours(s.id, yday, 23).catch(() => [] as HourObs[]))),
    lastHour >= 0
      ? Promise.all(cands.map((s) => getStationHours(s.id, today, lastHour).catch(() => [] as HourObs[])))
      : Promise.resolve(cands.map(() => [] as HourObs[])),
    getSnapshot(`${yday}${latest.tm.slice(8, 12)}`).catch(() => ({}) as Snapshot), // 어제 같은 분
    getForecast("vilage", nx, ny, vb.date, vb.time).catch(() => ({}) as Forecast),
    getForecast("ultra", nx, ny, ub.date, ub.time).catch(() => ({}) as Forecast),
  ]);

  const yesterday = model.yesterday.map((m) => {
    const o = blend(snapAt(cands, ySeries, m.hour), cands);
    return o ? { ...m, temp: o.temp, weatherCode: observedCode(m.weatherCode, o.rain, o.temp) } : m;
  });

  let observedThroughHour = -1;
  const todayHours = model.today.map((m) => {
    if (m.hour <= lastHour) {
      const o = blend(snapAt(cands, tSeries, m.hour), cands);
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
  const yLive = blend(yMinute, near);

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
