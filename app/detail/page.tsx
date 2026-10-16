import { Suspense } from "react";
import { DetailScreen } from "@/components/screens/DetailScreen";

/** 1d 시간대별 상세 비교 (/detail?lat&lon&name…) */
export default function Page() {
  return (
    <Suspense fallback={<div className="h-dvh" />}>
      <DetailScreen />
    </Suspense>
  );
}
