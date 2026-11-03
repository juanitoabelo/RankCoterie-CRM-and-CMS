import Link from "next/link";
import { listHref, pageWindow, totalPagesOf, type ListParams } from "./params";

/**
 * Server-rendered pager for admin listings. Every control is a plain link, so
 * page changes are navigations that stream through the route's `loading.tsx`
 * skeleton — no client state involved.
 */
export default function Pagination({
  basePath,
  params,
  total,
}: {
  basePath: string;
  params: ListParams;
  total: number;
}) {
  const totalPages = totalPagesOf(total, params.pageSize);
  if (totalPages <= 1) return null;

  const entries = pageWindow(params.page, totalPages);
  const baseClass =
    "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
      aria-label="Pagination"
    >
      <p className="text-sm text-zinc-500">
        Page {params.page} of {totalPages} ({total.toLocaleString()} total)
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={listHref(basePath, params, { page: params.page - 1 })}
          className={baseClass}
          rel="prev"
          aria-disabled={params.page <= 1}
          tabIndex={params.page <= 1 ? -1 : undefined}
        >
          ← Previous
        </Link>
        {entries.map((entry, index) =>
          entry === "…" ? (
            <span
              key={`gap-${index}`}
              className="px-1.5 text-sm text-zinc-400"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Link
              key={entry}
              href={listHref(basePath, params, { page: entry })}
              aria-current={entry === params.page ? "page" : undefined}
              className={
                entry === params.page
                  ? "rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                  : baseClass
              }
            >
              {entry}
            </Link>
          ),
        )}
        <Link
          href={listHref(basePath, params, { page: params.page + 1 })}
          className={baseClass}
          rel="next"
          aria-disabled={params.page >= totalPages}
          tabIndex={params.page >= totalPages ? -1 : undefined}
        >
          Next →
        </Link>
      </div>
    </nav>
  );
}
