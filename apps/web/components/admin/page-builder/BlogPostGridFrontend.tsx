"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BlogPostGridBlock } from "@/lib/page-builder/types";

type BlogGridProps = BlogPostGridBlock["props"];

type GridCategory = { id: string; name: string; slug: string };

type GridItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  author: string | null;
  createdAt: string;
  category: { id: string; title: string; slug: string } | null;
};

type GridResponse = {
  items: GridItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  categories: GridCategory[];
};

type SortOption = {
  label: string;
  order: NonNullable<BlogGridProps["orderBy"]>;
  sort: NonNullable<BlogGridProps["sortOrder"]>;
};

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest first", order: "date", sort: "desc" },
  { label: "Oldest first", order: "date", sort: "asc" },
  { label: "Title: A–Z", order: "title", sort: "asc" },
  { label: "Title: Z–A", order: "title", sort: "desc" },
  { label: "Most popular", order: "popular", sort: "desc" },
];

const ASPECT_CLASS: Record<NonNullable<BlogGridProps["imageAspect"]>, string> = {
  "16:9": "aspect-[16/9]",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
};

const ANIM_CLASS: Record<NonNullable<BlogGridProps["cardAnimation"]>, string> = {
  fadeUp: "bpg-anim-fadeUp",
  zoomIn: "bpg-anim-zoomIn",
  flip: "bpg-anim-flip",
  slideIn: "bpg-anim-slideIn",
  none: "",
};

const HOVER_CLASS: Record<NonNullable<BlogGridProps["hoverEffect"]>, string> = {
  lift: "bpg-hover-lift",
  zoom: "bpg-hover-zoom",
  glow: "bpg-hover-glow",
  overlay: "bpg-hover-overlay",
  none: "",
};

const CARD_CLASS: Record<NonNullable<BlogGridProps["cardStyle"]>, string> = {
  bordered: "bpg-card-bordered",
  shadow: "bpg-card-shadow",
  minimal: "bpg-card-minimal",
};

function clampColumns(value: number | undefined, fallback: number): number {
  return Math.min(6, Math.max(1, value ?? fallback));
}

function columnStyle(
  props: BlogGridProps,
  viewport?: "desktop" | "tablet" | "mobile",
): React.CSSProperties {
  const desktop = clampColumns(props.columnsDesktop ?? (props.columns as number | undefined), 3);
  const tablet = clampColumns(props.columnsTablet, desktop);
  const mobile = clampColumns(props.columnsMobile, 1);

  let cols = { desktop, tablet, mobile };
  if (viewport === "mobile") cols = { desktop: mobile, tablet: mobile, mobile };
  else if (viewport === "tablet") cols = { desktop: tablet, tablet, mobile: tablet };

  return {
    ["--bpg-cols-mobile" as string]: String(cols.mobile),
    ["--bpg-cols-tablet" as string]: String(cols.tablet),
    ["--bpg-cols-desktop" as string]: String(cols.desktop),
  } as React.CSSProperties;
}

export default function BlogPostGridFrontend({
  props,
  viewport,
}: {
  props: BlogGridProps;
  viewport?: "desktop" | "tablet" | "mobile";
}) {
  const {
    heading = "Latest Posts",
    postsPerPage = 9,
    categoryId = "",
    layout = "grid",
    showCategoryFilter = false,
    filterCategories = [],
    showExcerpt = true,
    excerptLength = 150,
    showFeaturedImage = true,
    showAuthor = true,
    showDate = true,
    showCategory = true,
    showPagination = true,
    showSearch = false,
    searchPlaceholder = "Search posts...",
    orderBy = "date",
    sortOrder = "desc",
    cardAnimation = "fadeUp",
    hoverEffect = "lift",
    cardStyle = "shadow",
    imageAspect = "16:9",
  } = props;

  const gridStyle = columnStyle(props, viewport);

  const [activeCategory, setActiveCategory] = useState(categoryId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState(
    () =>
      SORT_OPTIONS.find((o) => o.order === orderBy && o.sort === sortOrder)?.label ??
      SORT_OPTIONS[0].label,
  );
  const [data, setData] = useState<GridResponse | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const sort = useMemo(
    () => SORT_OPTIONS.find((o) => o.label === sortKey) ?? SORT_OPTIONS[0],
    [sortKey],
  );

  const filterKey = filterCategories.join(",");
  const paramsKey = [
    activeCategory,
    filterKey,
    page,
    postsPerPage,
    sort.order,
    sort.sort,
    debouncedSearch,
  ].join("|");

  const loading = loadedKey !== paramsKey;
  const filtering = data !== null && loadedKey !== paramsKey;

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({
      category: activeCategory,
      filterCategories: filterKey,
      page: String(page),
      perPage: String(postsPerPage),
      order: sort.order,
      sort: sort.sort,
      q: debouncedSearch,
    });

    fetch(`/api/blog-grid?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load posts.");
        return res.json() as Promise<GridResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load posts.");
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(paramsKey);
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-bpg-card]"));
    if (cardAnimation === "none") {
      cards.forEach((card) => card.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.08 },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [data, cardAnimation, layout]);

  const visibleCategories = data?.categories ?? [];
  const containerClass =
    layout === "list"
      ? "bpg-list"
      : layout === "masonry"
        ? "bpg-grid bpg-grid-masonry"
        : "bpg-grid";

  return (
    <div className="py-8">
      <style>{gridStyles}</style>
      <div className="bpg-root">
        {heading ? (
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{heading}</h2>
            {data && (
              <span className="text-sm text-zinc-500">
                {data.total} post{data.total === 1 ? "" : "s"}
              </span>
            )}
          </div>
        ) : null}

        {(showCategoryFilter || showSearch) && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {showCategoryFilter && visibleCategories.length > 0 ? (
              <div className="bpg-pills" role="tablist" aria-label="Filter posts by category">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!activeCategory}
                  className={`bpg-pill${activeCategory ? "" : " is-active"}`}
                  onClick={() => {
                    setActiveCategory("");
                    setPage(1);
                  }}
                >
                  All
                </button>
                {visibleCategories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    role="tab"
                    aria-selected={activeCategory === category.id}
                    className={`bpg-pill${activeCategory === category.id ? " is-active" : ""}`}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setPage(1);
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {showSearch && (
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="w-full sm:w-56 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
              )}
              <select
                aria-label="Sort posts"
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && !loading ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            {error}
          </div>
        ) : loading && !data ? (
          <div className={containerClass} style={gridStyle}>
            {Array.from({ length: Math.min(postsPerPage, 9) }).map((_, i) => (
              <div key={i} className="bpg-item bpg-card-shadow bpg-skeleton" aria-hidden>
                <div className="bpg-skeleton-image" />
                <div className="bpg-skeleton-body">
                  <div className="bpg-skeleton-line w-1/3" />
                  <div className="bpg-skeleton-line w-2/3" />
                  <div className="bpg-skeleton-line w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <div
            key={paramsKey}
            ref={gridRef}
            className={`${containerClass}${filtering ? " is-filtering" : ""}`}
            style={gridStyle}
          >
            {data.items.map((item, index) => {
              const excerpt = item.excerpt
                ? item.excerpt.length > excerptLength
                  ? `${item.excerpt.slice(0, excerptLength).trimEnd()}…`
                  : item.excerpt
                : null;

              return (
                <article
                  key={item.id}
                  data-bpg-card
                  className={[
                    "bpg-item",
                    CARD_CLASS[cardStyle],
                    ANIM_CLASS[cardAnimation],
                    HOVER_CLASS[hoverEffect],
                  ].join(" ")}
                  style={{ ["--bpg-delay" as string]: `${(index % postsPerPage) * 70}ms` }}
                >
                  {showFeaturedImage ? (
                    <Link
                      href={`/${item.slug}`}
                      className={`bpg-image ${ASPECT_CLASS[imageAspect]}`}
                      tabIndex={-1}
                      aria-hidden
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          className="bpg-image-el"
                        />
                      ) : (
                        <div className="bpg-image-placeholder">
                          <span>📝</span>
                        </div>
                      )}
                    </Link>
                  ) : null}

                  <div className="bpg-body">
                    {showCategory && item.category ? (
                      <span className="bpg-category">{item.category.title}</span>
                    ) : null}
                    <h3 className="bpg-title">
                      <Link href={`/${item.slug}`}>{item.title}</Link>
                    </h3>
                    {showExcerpt && excerpt ? <p className="bpg-excerpt">{excerpt}</p> : null}
                    {(showAuthor && item.author) || showDate ? (
                      <div className="bpg-meta">
                        {showAuthor && item.author ? <span>{item.author}</span> : null}
                        {showDate ? (
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </time>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {hoverEffect === "overlay" ? (
                    <span className="bpg-quick" aria-hidden>
                      Read article →
                    </span>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
            {debouncedSearch || activeCategory
              ? "No posts match your filters."
              : "No posts published yet."}
          </div>
        )}

        {showPagination && data && data.totalPages > 1 ? (
          <nav className="bpg-pagination" aria-label="Post pages">
            <button
              type="button"
              className="bpg-page-btn"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              ← Prev
            </button>
            {pageNumbers(data.page, data.totalPages).map((value, i) =>
              value === "…" ? (
                <span key={`gap-${i}`} className="bpg-page-gap">
                  …
                </span>
              ) : (
                <button
                  key={value}
                  type="button"
                  className={`bpg-page-btn${value === data.page ? " is-active" : ""}`}
                  aria-current={value === data.page ? "page" : undefined}
                  onClick={() => setPage(value)}
                >
                  {value}
                </button>
              ),
            )}
            <button
              type="button"
              className="bpg-page-btn"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next →
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function pageNumbers(current: number, total: number): Array<number | "…"> {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const output: Array<number | "…"> = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) output.push("…");
    output.push(value);
    previous = value;
  }
  return output;
}

const gridStyles = `
.bpg-root { --bpg-gap: 1.5rem; }
.bpg-grid, .bpg-list {
  display: grid;
  gap: var(--bpg-gap);
  transition: opacity 180ms ease;
}
.bpg-grid { grid-template-columns: repeat(var(--bpg-cols-mobile, 3), minmax(0, 1fr)); }
.bpg-list { grid-template-columns: minmax(0, 1fr); }
.bpg-grid.is-filtering, .bpg-list.is-filtering { opacity: 0.35; }
@media (min-width: 640px) {
  .bpg-grid { grid-template-columns: repeat(var(--bpg-cols-tablet, 2), minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .bpg-grid { grid-template-columns: repeat(var(--bpg-cols-desktop, 3), minmax(0, 1fr)); }
}
@media (min-width: 640px) {
  .bpg-list .bpg-item { display: flex; flex-direction: row; align-items: stretch; }
  .bpg-list .bpg-image { width: 17rem; flex-shrink: 0; align-self: stretch; height: auto; }
}
.bpg-grid-masonry { display: block; column-gap: var(--bpg-gap); column-count: 1; }
@media (min-width: 640px) { .bpg-grid-masonry { column-count: var(--bpg-cols-tablet, 2); } }
@media (min-width: 1024px) { .bpg-grid-masonry { column-count: var(--bpg-cols-desktop, 3); } }
.bpg-grid-masonry .bpg-item { break-inside: avoid; margin-bottom: var(--bpg-gap); display: inline-block; width: 100%; }

.bpg-item {
  position: relative;
  overflow: hidden;
  background: #fff;
  border-radius: 0.9rem;
  transition: transform 320ms cubic-bezier(.2,.7,.3,1), box-shadow 320ms ease, border-color 320ms ease;
  opacity: 0;
}
.bpg-item.is-visible { animation: bpgEnter 620ms cubic-bezier(.2,.7,.3,1) both; animation-delay: var(--bpg-delay, 0ms); }
.bpg-anim-none.bpg-item, .bpg-item.bpg-anim-none { opacity: 1; animation: none; }
@keyframes bpgEnter {
  from { opacity: 0; transform: translateY(24px) scale(.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.bpg-anim-zoomIn.is-visible { animation-name: bpgEnterZoom; }
@keyframes bpgEnterZoom {
  from { opacity: 0; transform: scale(.86); }
  to { opacity: 1; transform: scale(1); }
}
.bpg-anim-flip.is-visible { animation-name: bpgEnterFlip; }
@keyframes bpgEnterFlip {
  from { opacity: 0; transform: perspective(900px) rotateX(-32deg) translateY(18px); }
  to { opacity: 1; transform: perspective(900px) rotateX(0) translateY(0); }
}
.bpg-anim-slideIn.is-visible { animation-name: bpgEnterSlide; }
@keyframes bpgEnterSlide {
  from { opacity: 0; transform: translateX(-42px); }
  to { opacity: 1; transform: translateX(0); }
}

.bpg-card-shadow { box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 12px 28px -18px rgba(0,0,0,.35); }
.bpg-card-shadow.bpg-hover-lift.is-visible:hover { transform: translateY(-8px); box-shadow: 0 18px 40px -20px rgba(0,0,0,.45); }
.bpg-card-bordered { border: 1px solid #e4e4e7; }
.bpg-card-bordered.bpg-hover-lift.is-visible:hover { transform: translateY(-6px); border-color: #a1a1aa; }
.bpg-card-minimal { background: transparent; }
.bpg-card-minimal .bpg-image { border-radius: 0.75rem; }
.bpg-card-minimal .bpg-body { padding-left: 0; padding-right: 0; }

.bpg-hover-zoom.is-visible:hover .bpg-image-el { transform: scale(1.08); }
.bpg-hover-glow.is-visible:hover { box-shadow: 0 0 0 2px #d97706, 0 0 32px -8px rgba(217,119,6,.5); transform: translateY(-4px); }
.bpg-hover-overlay .bpg-quick {
  position: absolute; left: 0.75rem; right: 0.75rem; bottom: 0.75rem;
  z-index: 2; text-align: center;
  background: rgba(24,24,27,.94); color: #fff;
  border-radius: 0.6rem; padding: 0.55rem 0.75rem;
  font-size: 0.8rem; font-weight: 600;
  opacity: 0; transform: translateY(12px);
  transition: opacity 260ms ease, transform 260ms ease;
  pointer-events: none;
}
.bpg-hover-overlay.is-visible:hover .bpg-quick,
.bpg-hover-overlay.is-visible:focus-within .bpg-quick { opacity: 1; transform: translateY(0); }
.bpg-hover-overlay.is-visible:hover .bpg-image-el { transform: scale(1.06); }

.bpg-image { display: block; position: relative; overflow: hidden; background: #f4f4f5; }
.bpg-image-el { width: 100%; height: 100%; object-fit: cover; transition: transform 500ms cubic-bezier(.2,.7,.3,1); display: block; }
.bpg-image-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 1.6rem; color: #a1a1aa; background: linear-gradient(135deg, #f4f4f5, #e4e4e7); }

.bpg-body { padding: 0.95rem 1.05rem 1.1rem; }
.bpg-category { font-size: 0.7rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #d97706; }
.bpg-title { margin-top: 0.25rem; font-size: 1.05rem; font-weight: 600; color: #18181b; line-height: 1.35; }
.bpg-title a { transition: color 200ms ease; }
.bpg-item:hover .bpg-title a { color: #d97706; }
.bpg-excerpt { margin-top: 0.4rem; font-size: 0.85rem; color: #52525b; line-height: 1.55; }
.bpg-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 0.65rem; font-size: 0.75rem; color: #71717a; }

.bpg-pills { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.bpg-pill {
  border: 1px solid #e4e4e7; background: #fff; color: #52525b;
  border-radius: 999px; padding: 0.35rem 0.85rem;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
  transition: background 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.bpg-pill:hover { border-color: #a1a1aa; color: #18181b; transform: translateY(-1px); }
.bpg-pill.is-active { background: #18181b; border-color: #18181b; color: #fff; }

.bpg-pagination { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.35rem; margin-top: 1.75rem; }
.bpg-page-btn {
  min-width: 2.3rem; padding: 0.4rem 0.7rem;
  border: 1px solid #e4e4e7; background: #fff; color: #3f3f46;
  border-radius: 0.55rem; font-size: 0.82rem; font-weight: 600; cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
}
.bpg-page-btn:hover:not(:disabled):not(.is-active) { border-color: #18181b; color: #18181b; transform: translateY(-1px); }
.bpg-page-btn.is-active { background: #18181b; border-color: #18181b; color: #fff; }
.bpg-page-btn:disabled { opacity: .4; cursor: default; }
.bpg-page-gap { color: #a1a1aa; padding: 0 0.2rem; }

.bpg-skeleton { pointer-events: none; opacity: 1; animation: none; }
.bpg-skeleton-image { aspect-ratio: 16 / 9; background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 37%, #f4f4f5 63%); background-size: 400% 100%; animation: bpgShimmer 1.4s ease infinite; }
.bpg-skeleton-body { padding: 0.95rem 1.05rem 1.1rem; display: grid; gap: 0.55rem; }
.bpg-skeleton-line { height: 0.7rem; border-radius: 999px; background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 37%, #f4f4f5 63%); background-size: 400% 100%; animation: bpgShimmer 1.4s ease infinite; }
@keyframes bpgShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

@media (prefers-reduced-motion: reduce) {
  .bpg-item, .bpg-item.is-visible { animation: none !important; opacity: 1 !important; transform: none !important; transition: none !important; }
  .bpg-image-el { transition: none !important; }
}
`;
