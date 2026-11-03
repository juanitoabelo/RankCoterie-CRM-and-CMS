import PageSizeSelect from "./PageSizeSelect";
import {
  DEFAULT_PAGE_SIZE,
  totalPagesOf,
  type ListParams,
} from "./params";

/**
 * Search + filter card for admin listings (server component).
 *
 * Renders a GET form so search/filter submissions are plain navigations —
 * the route's `loading.tsx` skeleton + progress bar handle the feedback.
 * Extra filters are passed as `children` and must be form controls.
 */
export default function ListToolbar({
  basePath,
  params,
  total,
  noun,
  placeholder,
  searchLabel,
  children,
  footer,
}: {
  basePath: string;
  params: ListParams;
  total: number;
  noun: string;
  placeholder?: string;
  searchLabel?: string;
  children?: React.ReactNode;
  /** Extra content rendered next to the result count (e.g. quick links). */
  footer?: React.ReactNode;
}) {
  const totalPages = totalPagesOf(total, params.pageSize);
  const from = total === 0 ? 0 : (params.page - 1) * params.pageSize + 1;
  const to = Math.min(total, params.page * params.pageSize);

  return (
    <>
      <form
        method="get"
        action={basePath}
        className="mt-6 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label
              htmlFor={`list-search-${noun}`}
              className="block text-sm font-medium text-zinc-800"
            >
              {searchLabel ?? `Search ${noun}`}
            </label>
            <input
              id={`list-search-${noun}`}
              name="q"
              type="search"
              defaultValue={params.q}
              placeholder={placeholder ?? `Search by title...`}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          {children}
          <div className="flex items-center gap-2 pb-0.5">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              SEARCH
            </button>
            {(params.q || Object.keys(params.filters).length > 0) && (
              <a
                href={basePath}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Reset
              </a>
            )}
          </div>
        </div>

        {/* Keep ordering/page size across a new search; page always restarts. */}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        {params.sort && <input type="hidden" name="dir" value={params.dir} />}
        {params.pageSize !== DEFAULT_PAGE_SIZE && (
          <input
            type="hidden"
            name="pageSize"
            value={String(params.pageSize)}
          />
        )}
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500" aria-live="polite">
          {total === 0
            ? `No ${noun} found`
            : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} ${noun}`}
          {totalPages > 1 ? ` · page ${params.page} of ${totalPages}` : ""}
        </p>
        <div className="flex items-center gap-3">
          {footer}
          <PageSizeSelect basePath={basePath} params={params} />
        </div>
      </div>
    </>
  );
}
