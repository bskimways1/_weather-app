"use client";

import { RotateCw } from "lucide-react";

export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-[14px] text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-11 items-center gap-2 rounded-[10px] bg-ink px-4 text-[14px] font-bold text-white"
      >
        <RotateCw size={16} /> 다시 시도
      </button>
    </div>
  );
}
