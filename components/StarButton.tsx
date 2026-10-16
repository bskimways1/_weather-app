"use client";

import { Star } from "lucide-react";

/** 즐겨찾기 별 토글. 터치 영역은 최소 44px. */
export function StarButton({
  on,
  onToggle,
  offColor = "var(--color-faint)",
  className = "h-11 w-11",
  size = 22,
}: {
  on: boolean;
  onToggle: () => void;
  offColor?: string;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={on}
      aria-label={on ? "즐겨찾기 해제" : "즐겨찾기에 추가"}
      className={`flex items-center justify-center ${className}`}
    >
      <Star
        size={size}
        strokeWidth={1.8}
        fill={on ? "var(--color-star-on)" : "none"}
        color={on ? "var(--color-star-on)" : offColor}
      />
    </button>
  );
}
