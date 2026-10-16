import { Suspense } from "react";
import { SearchScreen } from "@/components/screens/SearchScreen";
import { getGeoProvider } from "@/lib/geo";

/** 1f 지역 검색 · 추가 */
export default function Page() {
  // Kakao 는 입력 중 자동 검색, Nominatim 은 이용 정책상 검색 버튼(엔터) 때만
  const liveSearch = getGeoProvider().liveSearch;
  return (
    <Suspense fallback={<div className="h-dvh" />}>
      <SearchScreen liveSearch={liveSearch} />
    </Suspense>
  );
}
