import { describe, expect, it } from "vitest";
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
} from "./kma-parse";

const kst = (s: string) => Date.parse(`${s}+09:00`);

describe("parseStations", () => {
  it("고정폭 표에서 번호·좌표·이름을 읽는다", () => {
    const text = [
      "#START7777",
      "# STN LON LAT …",
      "   42  126.59737000   35.93681000 01211111      2.05     10.00    0 146 군산오식도           ----                 21F10501 5213014700 ---- 전북 군산시",
      "#7777END",
    ].join("\n");
    expect(parseStations(text)).toEqual([{ id: "42", lon: 126.59737, lat: 35.93681, name: "군산오식도" }]);
  });
});

describe("parseMinute", () => {
  it("기온(9번째)·60분 강수(12번째)를 읽고 결측은 뺀다", () => {
    const text = [
      "# YYMMDDHHMI STN …",
      "202611051927,42,298.1,3.0,291.7,4.5,297.3,3.8,15.1,-99.9,0.0,1.5,2.1,14.3,82.3,1014.5,1014.7,12.1,=",
      "202611051928,43,332.7,3.0,326.6,3.2,328.4,3.2,-99.9,-99.9,0.0,0.0,0.4,26.5,82.3,1014.9,1015.0,11.2,=",
      "202611051926,44,305.6,2.1,315.7,2.4,300.1,1.9,14.3,-99.9,0.0,-99.9,0.2,28.2,77.5,1015.2,1015.4,10.4,=",
    ].join("\n");
    const { tm, data } = parseMinute(text);
    expect(data).toEqual({ "42": [15.1, 1.5], "44": [14.3, 0] });
    expect(tm).toBe("202611051927");
  });
});

describe("nearStations / blend", () => {
  // 포일동 근처 실제 관측소 위치로 만든 예
  const point = { lat: 37.393, lon: 126.994 };
  const stations = [
    { id: "590", lat: 37.4426, lon: 127.0215, name: "과천" },
    { id: "366", lat: 37.3832, lon: 126.9887, name: "오전동" },
    { id: "434", lat: 37.4135, lon: 126.9668, name: "안양" },
    { id: "999", lat: 36.5, lon: 127.5, name: "먼곳" },
  ];

  it("10km 안 관측소만 가까운 순으로", () => {
    expect(nearStations(point, stations).map((s) => s.name)).toEqual(["오전동", "안양", "과천"]);
  });

  it("주변에 없으면 빈 목록", () => {
    expect(nearStations({ lat: 35.68, lon: 139.69 }, stations)).toEqual([]);
  });

  it("가까울수록 크게 섞는다 (1/거리)", () => {
    const near = [
      { id: "a", lat: 0, lon: 0, name: "a", km: 1.2 },
      { id: "b", lat: 0, lon: 0, name: "b", km: 3.3 },
      { id: "c", lat: 0, lon: 0, name: "c", km: 5.3 },
    ];
    const r = blend({ a: [12.9, 0], b: [15.1, 0], c: [15.1, 0] }, near)!;
    expect(r.temp).toBe(13.7);
    expect(r.used.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("값이 없는 관측소는 건너뛰고, 하나도 없으면 null", () => {
    const near = [
      { id: "a", lat: 0, lon: 0, name: "a", km: 1 },
      { id: "b", lat: 0, lon: 0, name: "b", km: 2 },
    ];
    expect(blend({ b: [10, 0] }, near)!.temp).toBe(10);
    expect(blend({}, near)).toBeNull();
  });
});

describe("toGrid", () => {
  it("기상청 격자와 일치", () => {
    expect(toGrid({ lat: 37.5665, lon: 126.978 })).toEqual({ nx: 60, ny: 127 }); // 서울시청
    expect(toGrid({ lat: 35.1796, lon: 129.0756 })).toEqual({ nx: 98, ny: 76 }); // 부산시청
    expect(toGrid({ lat: 33.4996, lon: 126.5312 })).toEqual({ nx: 53, ny: 38 }); // 제주시
  });
});

describe("시각", () => {
  it("한국시간 문자열", () => {
    expect(kstStamp(kst("2026-11-05T19:27:30"))).toBe("202611051927");
    expect(stampToLocal("202611051927")).toBe("2026-11-05T19:27");
  });

  it("단기예보 발표 시각", () => {
    expect(vilageBase(kst("2026-11-05T19:27:00"))).toEqual({ date: "20261105", time: "1700" });
    expect(vilageBase(kst("2026-11-05T20:05:00"))).toEqual({ date: "20261105", time: "1700" });
    expect(vilageBase(kst("2026-11-05T20:15:00"))).toEqual({ date: "20261105", time: "2000" });
    expect(vilageBase(kst("2026-11-05T01:00:00"))).toEqual({ date: "20261104", time: "2300" });
  });

  it("초단기예보 발표 시각", () => {
    expect(ultraBase(kst("2026-11-05T19:50:00"))).toEqual({ date: "20261105", time: "1930" });
    expect(ultraBase(kst("2026-11-05T19:40:00"))).toEqual({ date: "20261105", time: "1830" });
    expect(ultraBase(kst("2026-11-05T00:10:00"))).toEqual({ date: "20261104", time: "2330" });
  });
});

describe("예보", () => {
  it("TMP·T1H·SKY·PTY 를 시각별로 묶는다", () => {
    const json = {
      response: {
        header: { resultCode: "00" },
        body: {
          items: {
            item: [
              { category: "TMP", fcstDate: "20261105", fcstTime: "2000", fcstValue: "12" },
              { category: "SKY", fcstDate: "20261105", fcstTime: "2000", fcstValue: "4" },
              { category: "PTY", fcstDate: "20261105", fcstTime: "2000", fcstValue: "0" },
              { category: "PCP", fcstDate: "20261105", fcstTime: "2000", fcstValue: "강수없음" },
              { category: "T1H", fcstDate: "20261105", fcstTime: "2100", fcstValue: "11.4" },
            ],
          },
        },
      },
    };
    expect(parseForecast(json)).toEqual({
      "2026110520": { temp: 12, sky: 4, pty: 0 },
      "2026110521": { temp: 11.4 },
    });
  });

  it("오류 코드면 예외", () => {
    expect(() => parseForecast({ response: { header: { resultCode: "03" } } })).toThrow();
  });

  it("하늘상태·강수형태 → WMO", () => {
    expect(kmaToWmo(1, 0)).toBe(0);
    expect(kmaToWmo(3, 0)).toBe(2);
    expect(kmaToWmo(4, 0)).toBe(3);
    expect(kmaToWmo(4, 1)).toBe(61);
    expect(kmaToWmo(4, 3)).toBe(71);
    expect(kmaToWmo(3, 4)).toBe(80);
    expect(kmaToWmo(undefined, undefined)).toBeNull();
  });

  it("관측 시각은 실제 강수로 비·눈을 바로잡는다", () => {
    expect(observedCode(2, 0.5, 8)).toBe(61);
    expect(observedCode(2, 0.5, -1)).toBe(71);
    expect(observedCode(61, 0, 8)).toBe(3);
    expect(observedCode(1, 0, 8)).toBe(1);
  });
});

describe("parseHourly", () => {
  it("정시 행만 시각별로, 결측·범위 밖은 null", () => {
    const text = [
      "# YYMMDDHHMI STN …",
      "202611040000,108,53.7,1.7,64.9,2.3,40.1,1.7,9.6,0.0,0.0,0.0,0.0,0.0,81.9,1017.6,1028.1,6.7,=",
      "202611040001,108,53.7,1.7,64.9,2.3,40.1,1.7,9.5,0.0,0.0,0.0,0.0,0.0,81.9,1017.6,1028.1,6.7,=",
      "202611040100,108,53.7,1.7,64.9,2.3,40.1,1.7,9.1,0.0,0.0,0.5,0.0,0.0,81.9,1017.6,1028.1,6.7,=",
      "202611040200,108,53.7,1.7,64.9,2.3,40.1,1.7,-99.9,0.0,0.0,0.0,0.0,0.0,81.9,1017.6,1028.1,6.7,=",
      "202611040400,108,53.7,1.7,64.9,2.3,40.1,1.7,8.0,0.0,0.0,0.0,0.0,0.0,81.9,1017.6,1028.1,6.7,=",
    ].join("\n");
    expect(parseHourly(text, 3)).toEqual([[9.6, 0], [9.1, 0.5], null, null]);
  });
});
