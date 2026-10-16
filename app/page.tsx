import { Suspense } from "react";
import { MainScreen, MainScreenSkeleton } from "@/components/screens/MainScreen";

/** 1c 메인: 현재 위치(또는 ?lat&lon 으로 지정한 지역)의 어제·오늘 비교 */
export default function Page() {
  return (
    <Suspense fallback={<MainScreenSkeleton />}>
      <MainScreen />
    </Suspense>
  );
}
