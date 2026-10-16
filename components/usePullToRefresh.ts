"use client";

import { useRef, useState } from "react";

/**
 * 스크롤 영역 맨 위에서 아래로 당기면 onRefresh 실행.
 * 반환된 handlers 를 스크롤 컨테이너에 붙이고, pull(px) 로 인디케이터를 그린다.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown>, threshold = 70) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<number | null>(null);

  const handlers = {
    onTouchStart(e: React.TouchEvent<HTMLElement>) {
      start.current = e.currentTarget.scrollTop <= 0 && !refreshing ? e.touches[0].clientY : null;
    },
    onTouchMove(e: React.TouchEvent<HTMLElement>) {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      setPull(dy > 0 ? Math.min(dy * 0.5, threshold * 1.4) : 0);
    },
    async onTouchEnd() {
      if (start.current == null) return;
      start.current = null;
      if (pull >= threshold) {
        setRefreshing(true);
        setPull(threshold * 0.6);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    },
  };

  return { pull, refreshing, ready: pull >= threshold, handlers };
}
