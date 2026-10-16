"use client";

import { useRouter } from "next/navigation";
import { useLocation } from "@/components/LocationProvider";
import { setOnboarded } from "@/lib/storage";

export function WelcomeScreen() {
  const router = useRouter();
  const { locate, status } = useLocation();
  const busy = status === "locating";

  const useGps = async () => {
    setOnboarded();
    const place = await locate(); // 여기서 브라우저 권한 팝업이 뜬다
    router.replace(place ? "/" : "/search?reason=denied");
  };

  const searchInstead = () => {
    setOnboarded();
    router.replace("/search");
  };

  return (
    <div className="flex min-h-dvh flex-col px-7 pt-[max(44px,env(safe-area-inset-top))] pb-[max(40px,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col justify-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.62_0.14_45/0.15)]">
          <div className="h-[18px] w-[18px] rounded-full bg-accent" />
        </div>
        <h1 className="text-[28px] leading-[1.3] font-bold">
          현재 위치의
          <br />
          어제·오늘 기온을
          <br />
          시간대별로 비교합니다
        </h1>
        <p className="text-[15px] leading-[1.6] text-pretty text-muted">
          위치 권한을 허용하면 GPS 기준 동네의 24시간 예보와 어제 같은 시간 기온을 함께 표시합니다.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={useGps}
          disabled={busy}
          className="h-[54px] rounded-2xl bg-ink text-[16px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "위치 확인 중…" : "현재 위치 사용"}
        </button>
        <button type="button" onClick={searchInstead} className="h-[54px] rounded-2xl bg-fill text-[16px] font-semibold">
          지역 직접 검색
        </button>
      </div>
    </div>
  );
}
