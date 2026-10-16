"use client";

import Link from "next/link";
import { LocateFixed, Search, Star } from "lucide-react";

export type Tab = "here" | "favorites" | "search" | null;

const TABS = [
  { id: "here", href: "/", label: "현재 위치", Icon: LocateFixed },
  { id: "favorites", href: "/favorites", label: "즐겨찾기", Icon: Star },
  { id: "search", href: "/search", label: "검색", Icon: Search },
] as const;

/** 하단 탭바: 높이 76px + safe-area */
export function TabBar({ active, className = "" }: { active: Tab; className?: string }) {
  return (
    <nav className={`flex-none border-t border-line bg-surface pb-safe ${className}`}>
      <ul className="grid h-[76px] grid-cols-3">
        {TABS.map(({ id, href, label, Icon }) => {
          const on = active === id;
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex h-full flex-col items-center gap-1 pt-3 text-[12px] font-semibold ${on ? "text-ink" : "text-faint"}`}
              >
                <Icon size={20} strokeWidth={on ? 2.2 : 1.8} fill={id === "favorites" && on ? "currentColor" : "none"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
