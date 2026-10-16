"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { TabBar } from "@/components/TabBar";
import { diffAt, formatDiff, nowHourFor } from "@/lib/compare";
import type { Place } from "@/lib/geo/types";
import { placeToQuery } from "@/lib/placeQuery";
import { useFavorites, useRecentSearches } from "@/lib/storage";
import { useComparisons } from "@/lib/useWeather";

type Status = "idle" | "loading" | "done" | "error";

export function SearchScreen({ liveSearch }: { liveSearch: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const denied = sp.get("reason") === "denied";
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const { recent, push: pushRecent } = useRecentSearches();
  const { isFavorite, toggle } = useFavorites();

  const run = async (raw: string) => {
    const q = raw.trim();
    const id = ++requestId.current;
    if (!q) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
      const body = (await res.json()) as { places?: Place[]; error?: string };
      if (id !== requestId.current) return; // 더 최근 요청이 있으면 버린다
      if (!res.ok || !body.places) throw new Error(body.error ?? "검색에 실패했습니다");
      setResults(body.places);
      setStatus("done");
      if (body.places.length > 0) pushRecent(q);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : "검색에 실패했습니다");
      setStatus("error");
    }
  };

  // 자동 검색(Kakao): 입력 300ms 뒤
  useEffect(() => {
    if (!liveSearch) return;
    const t = setTimeout(() => void run(query), 300);
    return () => clearTimeout(t);
    // run 은 매 렌더 새로 만들어지지만 query 변화에만 반응하면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, liveSearch]);

  const points = useMemo(() => (results.length ? results.map((p) => ({ lat: p.lat, lon: p.lon })) : null), [results]);
  const weather = useComparisons(points);

  const searchTerm = (term: string) => {
    setQuery(term);
    void run(term);
  };

  const cancel = () => {
    if (query) {
      setQuery("");
      setResults([]);
      setStatus("idle");
      inputRef.current?.focus();
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/favorites");
    }
  };

  return (
    <div className="flex h-dvh flex-col">
      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-[max(8px,env(safe-area-inset-top))] pb-6">
        <form
          role="search"
          className="flex items-center gap-2.5 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            inputRef.current?.blur();
            void run(query);
          }}
        >
          <label className="flex h-12 flex-1 items-center gap-2 rounded-[14px] border-[1.5px] border-transparent bg-fill px-3.5 focus-within:border-ink">
            <Search size={18} className="flex-none text-[oklch(0.55_0.01_80)]" />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="시·구·동 이름 검색"
              aria-label="지역 검색"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="지우기" className="-mr-1 p-1 text-faint">
                <X size={16} />
              </button>
            )}
          </label>
          <button type="button" onClick={cancel} className="h-12 text-[15px] text-muted">
            취소
          </button>
        </form>

        {denied && status === "idle" && (
          <p className="rounded-[14px] bg-now-row px-4 py-3 text-[14px] leading-normal">
            위치 권한이 꺼져 있어 현재 위치를 쓸 수 없어요. 지역을 검색해 날씨를 확인하세요. 브라우저 설정에서 위치 권한을 켜면 현재
            위치도 볼 수 있어요.
          </p>
        )}

        {status !== "idle" && (
          <section className="flex flex-col">
            <h2 className="mb-1 text-[12px] font-semibold text-subtle">검색 결과</h2>
            {status === "loading" && <p className="py-5 text-[14px] text-faint">찾는 중…</p>}
            {status === "error" && (
              <div className="flex items-center justify-between py-5 text-[14px] text-muted">
                {error}
                <button type="button" onClick={() => void run(query)} className="font-semibold text-accent-link">
                  다시 시도
                </button>
              </div>
            )}
            {status === "done" && results.length === 0 && (
              <p className="py-5 text-[14px] leading-normal text-muted">
                &lsquo;{query.trim()}&rsquo;에 해당하는 지역이 없어요. 시·구·동 이름으로 검색해 보세요.
              </p>
            )}
            {status === "done" &&
              results.map((p, i) => {
                const w = weather.data?.[i];
                const h = w ? nowHourFor(w).hour : 0;
                const added = isFavorite(p.id);
                return (
                  <div key={p.id} className="flex h-16 items-center justify-between gap-3 border-b border-line-soft">
                    <Link href={`/?${placeToQuery(p)}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-semibold">{p.label}</span>
                      <span className="truncate text-[12px] text-subtle">
                        {p.sub}
                        {w && ` · ${Math.round(w.today[h].temp)}° · 어제보다 ${formatDiff(diffAt(w, h))}`}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      aria-pressed={added}
                      className={`h-9 flex-none rounded-[10px] px-3.5 text-[13px] font-bold ${added ? "bg-fill text-muted" : "bg-ink text-white"}`}
                    >
                      {added ? "★ 추가됨" : "+ 추가"}
                    </button>
                  </div>
                );
              })}
          </section>
        )}

        {!liveSearch && status === "idle" && (
          <p className="text-[13px] text-faint">지역 이름을 입력하고 키보드의 검색 버튼을 누르세요.</p>
        )}

        {recent.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[12px] font-semibold text-subtle">최근 검색</h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => searchTerm(term)}
                  className="rounded-full bg-fill px-3 py-2 text-[13px]"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      <TabBar active="search" />
    </div>
  );
}
