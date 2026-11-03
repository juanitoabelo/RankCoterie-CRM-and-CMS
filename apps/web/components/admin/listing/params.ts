/**
 * Shared admin listing state — parsing `searchParams` and building hrefs.
 *
 * Every admin list (Pages, Articles, Sections, Topics, SubTopics,
 * GeoCategories, Regions) parses its URL through `parseListParams` and builds
 * navigation hrefs through `listHref`, so pagination/sort/search state stays
 * consistent across toolbar, sortable headers and pager links.
 */

export type SortDir = "asc" | "desc";

export type ListParams = {
  page: number;
  pageSize: number;
  q: string;
  /** Sort column; empty string = the list's default ordering. */
  sort: string;
  dir: SortDir;
  /** Extra filter query params (e.g. `status`, `state`), never "ALL"/empty. */
  filters: Record<string, string>;
};

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const MAX_PAGE_SIZE = 100;

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseListParams(
  searchParams: RawSearchParams | undefined,
  options: {
    filterKeys?: string[];
    defaultPageSize?: number;
  } = {},
): ListParams {
  const sp = searchParams ?? {};

  const rawPage = Number.parseInt(first(sp.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const fallbackPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const rawSize = Number.parseInt(first(sp.pageSize), 10);
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0 && rawSize <= MAX_PAGE_SIZE
      ? rawSize
      : fallbackPageSize;

  const q = first(sp.q).trim();
  const sort = first(sp.sort).trim();
  const dir: SortDir = first(sp.dir) === "desc" ? "desc" : "asc";

  const filters: Record<string, string> = {};
  for (const key of options.filterKeys ?? []) {
    const value = first(sp[key]).trim();
    if (value && value.toUpperCase() !== "ALL") filters[key] = value;
  }

  return { page, pageSize, q, sort, dir, filters };
}

/**
 * Build an href for a list route, preserving every piece of state except the
 * values the patch overrides. Defaults (page 1, default page size, no search,
 * default ordering, empty filters) are omitted from the query string.
 */
export function listHref(
  basePath: string,
  params: ListParams,
  patch: Partial<ListParams> = {},
): string {
  const merged: ListParams = {
    ...params,
    ...patch,
    filters: { ...params.filters, ...(patch.filters ?? {}) },
  };

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged.filters)) {
    if (value && value.toUpperCase() !== "ALL") search.set(key, value);
  }
  if (merged.q) search.set("q", merged.q);
  if (merged.sort) {
    search.set("sort", merged.sort);
    search.set("dir", merged.dir);
  }
  if (merged.pageSize !== DEFAULT_PAGE_SIZE) {
    search.set("pageSize", String(merged.pageSize));
  }
  if (merged.page > 1) search.set("page", String(merged.page));

  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function totalPagesOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/**
 * Validate a `sort` query value against a list's allowed columns.
 * Returns `null` (→ list default ordering) for unknown columns, so a crafted
 * URL can never reach Prisma as an unvalidated `orderBy` field.
 */
export function sortableSort<T extends string>(
  sort: string,
  dir: SortDir,
  allowed: readonly T[],
): { field: T; dir: SortDir } | null {
  if (!sort) return null;
  return allowed.includes(sort as T) ? { field: sort as T, dir } : null;
}

/** Numbered page buttons with ellipses: [1, "…", 4, 5, 6, "…", 20]. */
export function pageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, page]);
  for (const offset of [-1, 1]) {
    const neighbour = page + offset;
    if (neighbour > 1 && neighbour < totalPages) pages.add(neighbour);
  }
  if (page <= 3) [2, 3, 4].forEach((p) => p < totalPages && pages.add(p));
  if (page >= totalPages - 2) {
    [totalPages - 3, totalPages - 2, totalPages - 1].forEach(
      (p) => p > 1 && pages.add(p),
    );
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push("…");
    out.push(p);
    previous = p;
  }
  return out;
}
