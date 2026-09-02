"use client";

import { useEffect, useState } from "react";
import type { ContentGridColumns, ContentGridSource } from "@/lib/page-builder/types";

export type GridItem = {
  id: string;
  type: "article" | "feed";
  title: string;
  excerpt?: string | null;
  url: string | null;
  image: string | null;
  category?: string | null;
  date?: string | null;
};

type GridResponse = {
  items: GridItem[];
  page: number;
  total: number;
  totalPages: number;
};

/**
 * Client-side article/feed grid with category filter and pagination. Fetches
 * each page from /api/content-grid with the block's settings as query params.
 */
export default function ContentGridFrontend({
  heading,
  source,
  categoryId,
  perPage,
  columns,
  showExcerpt,
  order,
}: {
  heading: string;
  source: ContentGridSource;
  categoryId: string;
  perPage: number;
  columns: ContentGridColumns;
  showExcerpt: boolean;
  order: "desc" | "asc";
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GridResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsKey = [source, categoryId, perPage, order].join("|");

  useEffect(() => {
    setPage(1);
  }, [paramsKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      source,
      categoryId,
      perPage: String(perPage),
      page: String(page),
      order,
    });
    fetch(`/api/content-grid?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load items.");
        return res.json() as Promise<GridResponse>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load items.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paramsKey, page]);

  const gridCls =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  const totalPages = data?.totalPages ?? 1;

  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {heading && (
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {heading}
          </h2>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {loading && (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-zinc-100">
                <div className="aspect-[16/9] rounded-t-lg bg-zinc-200" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-3/4 rounded bg-zinc-200" />
                  <div className="h-3 w-1/2 rounded bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            <div className={`mt-6 grid gap-6 ${gridCls}`}>
              {data.items.map((item) => (
                <GridCard key={item.id} item={item} showExcerpt={showExcerpt} />
              ))}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </section>
  );
}

function GridCard({ item, showExcerpt }: { item: GridItem; showExcerpt: boolean }) {
  const date = item.date ? new Date(item.date) : null;

  const inner = (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-sm">
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-zinc-100 text-xs text-zinc-400">
          {item.type === "article" ? "📄" : "📡"}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold leading-snug text-zinc-900">{item.title}</h3>
        {showExcerpt && item.excerpt && (
          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600">{item.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-2 text-[11px] text-zinc-400">
          {item.category && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
              {item.category}
            </span>
          )}
          {date && <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time>}
        </div>
      </div>
    </div>
  );

  return item.url ? (
    <a href={item.url} className="block h-full">
      {inner}
    </a>
  ) : (
    inner
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹ Prev
      </button>
      <span className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next ›
      </button>
    </div>
  );
}