import { describe, expect, it } from "vitest";
import { placeFromParts } from "./types";

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
