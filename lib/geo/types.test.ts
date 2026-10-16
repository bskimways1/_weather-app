import { describe, expect, it } from "vitest";
import { placeFromParts, roundCoord } from "./types";

describe("roundCoord", () => {
  it("소수 3자리(약 100m)로 반올림", () => {
    expect(roundCoord(37.500612345)).toBe(37.501);
    expect(roundCoord(127.036549)).toBe(127.037);
    expect(roundCoord(-33.86784)).toBe(-33.868);
  });
});

describe("placeFromParts", () => {
  it("시도는 줄여서 라벨을 만든다", () => {
    expect(placeFromParts(["서울특별시", "강남구", "역삼동"], 37.5, 127.03)).toMatchObject({
      name: "역삼동",
      label: "서울 강남구 역삼동",
      sub: "서울특별시 강남구",
    });
  });
  it("두 단계", () => {
    expect(placeFromParts(["부산광역시", "해운대구"], 35.16, 129.16)).toMatchObject({
      name: "해운대구",
      label: "부산 해운대구",
      sub: "부산광역시",
    });
  });
  it("중복 이름 제거, 라벨은 최대 3단계", () => {
    const p = placeFromParts(["경기도", "수원시", "영통구", "영통구", "매탄3동"], 37.26, 127.04)!;
    expect(p.label).toBe("수원시 영통구 매탄3동");
    expect(p.sub).toBe("경기도 수원시 영통구");
  });
  it("빈 배열은 null", () => {
    expect(placeFromParts([], 0, 0)).toBeNull();
  });
});
