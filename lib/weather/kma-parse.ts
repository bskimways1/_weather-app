/**
 * 기상청 API허브 응답 해석과 계산 (네트워크·캐시 없음, 단위 테스트 대상).
 * 호출·캐시는 kma.ts 에 있다.
 */
import type { LatLon } from "./types";

export type Station = { id: string; lat: number; lon: number; name: string };
/** 한 시각의 전국 관측값. 관측소 번호 → [기온 °C, 60분 강수 mm] */
export type Snapshot = Record<string, [number, number]>;

const rows = (text: string) => text.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

/** stn_inf.php?inf=AWS 고정폭 표 → 관측소 목록 */
export function parseStations(text: string): Station[] {
  return rows(text)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length > 8 && Number.isFinite(+p[1]) && Number.isFinite(+p[2]))
    .map((p) => ({ id: p[0], lon: +p[1], lat: +p[2], name: p[8] }));
}

/**
 * nph-aws2_min(disp=1) CSV → 관측 시각과 관측소별 값.
 * 열: 시각, 지점, WD1, WS1, WDS, WSS, WD10, WS10, TA(8), RE, RN-15m, RN-60m(11) …
 * 기온이 -50 이하이면 결측이라 뺀다.
 */
export function parseMinute(text: string): { tm: string | null; data: Snapshot } {
  const data: Snapshot = {};
  let tm: string | null = null;
  for (const line of rows(text)) {
    const p = line.split(",");
    const ta = Number(p[8]);
    if (p.length < 12 || !Number.isFinite(ta) || ta <= -50) continue;
    const rn = Number(p[11]);
    data[p[1]] = [ta, Number.isFinite(rn) && rn > 0 ? rn : 0];
    if (!tm || p[0] > tm) tm = p[0];
  }
  return { tm, data };
}

/** 두 지점 거리(km). 수 km 범위라 평면 근사로 충분 */
export function distanceKm(a: LatLon, b: LatLon) {
  const r = Math.PI / 180;
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.hypot(x, y) * 6371;
}

export type Near = Station & { km: number };

/** 평균에 쓸 후보 관측소. 반경 10km 안 가까운 순 최대 6곳, 없으면 20km 안 가장 가까운 1곳 */
export function nearStations(point: LatLon, stations: Station[]): Near[] {
  const sorted = stations.map((s) => ({ ...s, km: distanceKm(point, s) })).sort((a, b) => a.km - b.km);
  const inRange = sorted.filter((s) => s.km <= 10).slice(0, 6);
  if (inRange.length) return inRange;
  return sorted[0] && sorted[0].km <= 20 ? [sorted[0]] : [];
}

/**
 * 거리 가중 평균: 값이 있는 후보 중 가까운 3곳을 1/거리 비율로 섞는다.
 * (1.2km·3.3km·5.3km 면 약 63%·23%·14%)
 */
export function blend(snap: Snapshot, near: Near[], take = 3) {
  const used = near.filter((s) => snap[s.id]).slice(0, take);
  if (!used.length) return null;
  let wSum = 0;
  let temp = 0;
  let rain = 0;
  for (const s of used) {
    const w = 1 / Math.max(s.km, 0.5);
    const [ta, rn] = snap[s.id];
    wSum += w;
    temp += ta * w;
    rain += rn * w;
  }
  return { temp: Math.round((temp / wSum) * 10) / 10, rain: rain / wSum, used };
}

/* ---------- 기상청 동네예보 격자 (Lambert 정각원추도법, 기상청 공식 변환식) ---------- */

export function toGrid({ lat, lon }: LatLon): { nx: number; ny: number } {
  const RE = 6371.00877 / 5.0; // 지구 반경 / 격자 간격(5km)
  const DEG = Math.PI / 180;
  const slat1 = 30 * DEG;
  const slat2 = 60 * DEG;
  const olon = 126 * DEG;
  const olat = 38 * DEG;
  const sn =
    Math.log(Math.cos(slat1) / Math.cos(slat2)) /
    Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5));
  const sf = (Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) * Math.cos(slat1)) / sn;
  const ro = (RE * sf) / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);
  const ra = (RE * sf) / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEG * 0.5), sn);
  let theta = lon * DEG - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return {
    nx: Math.floor(ra * Math.sin(theta) + 43 + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5),
  };
}

/* ---------- 시각 (모두 한국시간) ---------- */

const KST_MS = 9 * 3600_000;
const pad = (n: number) => String(n).padStart(2, "0");

/** 한국시간 "YYYYMMDDHHmm" */
export function kstStamp(ms: number) {
  const d = new Date(ms + KST_MS);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

/** "YYYYMMDDHHmm" → "YYYY-MM-DDTHH:mm" */
export function stampToLocal(tm: string) {
  return `${tm.slice(0, 4)}-${tm.slice(4, 6)}-${tm.slice(6, 8)}T${tm.slice(8, 10)}:${tm.slice(10, 12)}`;
}

/** 단기예보 최신 발표(02·05·…·23시, 발표 10분 뒤부터 조회 가능) */
export function vilageBase(nowMs: number) {
  const s = kstStamp(nowMs - 10 * 60_000);
  const h = Number(s.slice(8, 10));
  if (h < 2) return { date: kstStamp(nowMs - 10 * 60_000 - 86400_000).slice(0, 8), time: "2300" };
  return { date: s.slice(0, 8), time: `${pad(h - ((h - 2) % 3))}00` };
}

/** 초단기예보 최신 발표(매시 30분, 45분 뒤부터 조회 가능) */
export function ultraBase(nowMs: number) {
  const s = kstStamp(nowMs - 45 * 60_000);
  return { date: s.slice(0, 8), time: `${s.slice(8, 10)}30` };
}

/* ---------- 예보 ---------- */

type FcstItem = { category: string; fcstDate: string; fcstTime: string; fcstValue: string };
/** 예보 시각 "YYYYMMDDHH" → 기온·하늘·강수형태 */
export type Forecast = Record<string, { temp?: number; sky?: number; pty?: number }>;

/** 동네예보 JSON(단기 TMP / 초단기 T1H) → 시각별 값 */
export function parseForecast(json: unknown): Forecast {
  const res = (json as { response?: { header?: { resultCode?: string }; body?: { items?: { item?: FcstItem[] } } } })
    ?.response;
  if (res?.header?.resultCode !== "00") throw new Error(`기상청 예보 응답 오류 ${res?.header?.resultCode ?? ""}`);
  const out: Forecast = {};
  for (const it of res.body?.items?.item ?? []) {
    const key = it.fcstDate + it.fcstTime.slice(0, 2);
    const v = Number(it.fcstValue);
    if (!Number.isFinite(v)) continue;
    const slot = (out[key] ??= {});
    if (it.category === "TMP" || it.category === "T1H") slot.temp = v;
    else if (it.category === "SKY") slot.sky = v;
    else if (it.category === "PTY") slot.pty = v;
  }
  return out;
}

/** 기상청 하늘상태(SKY)·강수형태(PTY) → WMO 코드 (화면은 WMO 기준) */
export function kmaToWmo(sky?: number, pty?: number): number | null {
  switch (pty) {
    case 1: // 비
    case 2: // 비/눈
      return 61;
    case 3: // 눈
    case 7: // 눈날림
      return 71;
    case 4: // 소나기
      return 80;
    case 5: // 빗방울
    case 6: // 빗방울눈날림
      return 51;
  }
  if (sky === 1) return 0;
  if (sky === 3) return 2;
  if (sky === 4) return 3;
  return null;
}

const isPrecip = (code: number) => code >= 51;

/**
 * 관측 시각의 하늘 상태: 관측소에는 구름 정보가 없어 모델값을 쓰되,
 * 비·눈 여부는 실제 강수 관측으로 바로잡는다.
 */
export function observedCode(modelCode: number, rainMm: number, temp: number) {
  if (rainMm >= 0.1) return temp <= 0 ? 71 : 61;
  return isPrecip(modelCode) ? 3 : modelCode;
}
