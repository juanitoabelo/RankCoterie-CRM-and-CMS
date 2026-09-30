"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ProductGridBlock } from "@/lib/page-builder/types";

type ProductGridProps = ProductGridBlock["props"];

type GridCategory = { id: string; name: string; slug: string; parentId: string | null };

type GridItem = {
  id: string;
  name: string;
  slug: string;
  excerpt: string | null;
  price: number;
  regularPrice: number;
  onSale: boolean;
  imageAssetId: string | null;
  rating: number;
  reviewCount: number;
  stockStatus: string;
  featured: boolean;
  categories: { id: string; name: string; slug: string }[];
};

type GridResponse = {
  items: GridItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  categories: GridCategory[];
};

type SortOption = { label: string; order: NonNullable<ProductGridProps["orderBy"]>; sort: "asc" | "desc" };

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest", order: "date", sort: "desc" },
  { label: "Price: low to high", order: "price", sort: "asc" },
  { label: "Price: high to low", order: "price", sort: "desc" },
  { label: "Name: A–Z", order: "name", sort: "asc" },
  { label: "Most popular", order: "popular", sort: "desc" },
];

const WISHLIST_KEY = "canopy:wishlist";
const WISHLIST_EVENT = "canopy:wishlist-changed";
const EMPTY_WISHLIST: string[] = [];

let wishlistCache: string[] = EMPTY_WISHLIST;
let wishlistCacheKey: string | null = null;

function readWishlist(): string[] {
  if (typeof window === "undefined") return EMPTY_WISHLIST;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(WISHLIST_KEY);
  } catch {
    raw = null;
  }
  if (raw !== wishlistCacheKey) {
    wishlistCacheKey = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      wishlistCache = Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : EMPTY_WISHLIST;
    } catch {
      wishlistCache = EMPTY_WISHLIST;
    }
  }
  return wishlistCache;
}

function subscribeWishlist(onStoreChange: () => void): () => void {
  window.addEventListener(WISHLIST_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(WISHLIST_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}


const ASPECT_CLASS: Record<NonNullable<ProductGridProps["imageAspect"]>, string> = {
  "16:9": "aspect-[16/9]",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
};

const ANIM_CLASS: Record<NonNullable<ProductGridProps["cardAnimation"]>, string> = {
  fadeUp: "pg-anim-fadeUp",
  zoomIn: "pg-anim-zoomIn",
  flip: "pg-anim-flip",
  slideIn: "pg-anim-slideIn",
  none: "",
};

const HOVER_CLASS: Record<NonNullable<ProductGridProps["hoverEffect"]>, string> = {
  lift: "pg-hover-lift",
  zoom: "pg-hover-zoom",
  glow: "pg-hover-glow",
  overlay: "pg-hover-overlay",
  none: "",
};

const CARD_CLASS: Record<NonNullable<ProductGridProps["cardStyle"]>, string> = {
  bordered: "pg-card-bordered",
  shadow: "pg-card-shadow",
  minimal: "pg-card-minimal",
};

function money(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

function columnStyle(props: ProductGridProps): React.CSSProperties {
  const desktop = Math.min(6, Math.max(1, props.columnsDesktop ?? 3));
  const tablet = Math.min(6, Math.max(1, props.columnsTablet ?? 2));
  const mobile = Math.min(6, Math.max(1, props.columnsMobile ?? 1));
  return {
    gridTemplateColumns: `repeat(${mobile}, minmax(0, 1fr))`,
    ["--pg-cols-tablet" as string]: String(tablet),
    ["--pg-cols-desktop" as string]: String(desktop),
  } as React.CSSProperties;
}
export default function ProductGridFrontend({ props }: { props: ProductGridProps }) {
  const {
    heading,
    productsPerPage = 9,
    categoryId = "",
    layout = "grid",
    showCategoryFilter = false,
    filterCategories = [],
    showExcerpt = true,
    excerptLength = 150,
    showFeaturedImage = true,
    showPrice = true,
    showRating = true,
    showAddToCart = true,
    showWishlist = false,
    showCategory = true,
    showPagination = true,
    orderBy = "date",
    sortOrder = "desc",
    cardAnimation = "fadeUp",
    hoverEffect = "lift",
    minPrice = 0,
    maxPrice = 0,
    inStockOnly = false,
    showSearch = false,
    searchPlaceholder = "Search products...",
    cardStyle = "shadow",
    imageAspect = "16:9",
  } = props;

  const gridStyle = columnStyle(props);

  const [activeCategory, setActiveCategory] = useState(categoryId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState(
    () => SORT_OPTIONS.find((o) => o.order === orderBy && o.sort === sortOrder)?.label ?? SORT_OPTIONS[0].label,
  );
  const [data, setData] = useState<GridResponse | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<Record<string, boolean>>({});

  const gridRef = useRef<HTMLDivElement>(null);
  const wishlist = useSyncExternalStore(subscribeWishlist, readWishlist, () => EMPTY_WISHLIST);

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
    productsPerPage,
    sort.order,
    sort.sort,
    debouncedSearch,
    minPrice,
    maxPrice,
    inStockOnly ? "1" : "0",
  ].join("|");

  const loading = loadedKey !== paramsKey;
  const filtering = data !== null && loadedKey !== paramsKey;

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({
      category: activeCategory,
      filterCategories: filterKey,
      page: String(page),
      perPage: String(productsPerPage),
      order: sort.order,
      sort: sort.sort,
      q: debouncedSearch,
      minPrice: String(minPrice || 0),
      maxPrice: String(maxPrice || 0),
      inStock: inStockOnly ? "1" : "0",
    });

    fetch(`/api/product-grid?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products.");
        return res.json() as Promise<GridResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load products.");
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(paramsKey);
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Staggered entrance: reveal each card as it scrolls into view.
  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-pg-card]"));
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

  const toggleWishlist = useCallback((id: string) => {
    const current = readWishlist();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable — the wishlist still updates for this session.
    }
    wishlistCacheKey = null;
    window.dispatchEvent(new Event(WISHLIST_EVENT));
  }, []);

  const addToCart = useCallback(
    async (id: string) => {
      if (adding[id]) return;
      setAdding((prev) => ({ ...prev, [id]: true }));
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id, quantity: 1 }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (json.ok) {
          setAdded((prev) => ({ ...prev, [id]: true }));
          window.setTimeout(() => setAdded((prev) => ({ ...prev, [id]: false })), 2200);
        }
      } catch {
        // Network failure — leave the button in its idle state.
      } finally {
        setAdding((prev) => ({ ...prev, [id]: false }));
      }
    },
    [adding],
  );

  const visibleCategories = data?.categories ?? [];
  const gridClass = layout === "isotope" ? "pg-grid pg-grid-isotope" : "pg-grid";

  return (
    <section className="px-6 py-6">
      <style>{gridStyles}</style>
      <div className="mx-auto max-w-6xl pg-root">
        {heading ? (
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{heading}</h2>
            {data && (
              <span className="text-sm text-zinc-500">
                {data.total} product{data.total === 1 ? "" : "s"}
              </span>
            )}
          </div>
        ) : null}

        {(showCategoryFilter || showSearch || visibleCategories.length > 0) && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {showCategoryFilter && visibleCategories.length > 0 ? (
              <div className="pg-pills" role="tablist" aria-label="Filter products by category">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!activeCategory}
                  className={`pg-pill${activeCategory ? "" : " is-active"}`}
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
                    className={`pg-pill${activeCategory === category.id ? " is-active" : ""}`}
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
                aria-label="Sort products"
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
          <div className={gridClass} style={gridStyle}>
            {Array.from({ length: Math.min(productsPerPage, 9) }).map((_, i) => (
              <div key={i} className="pg-card pg-card-shadow pg-skeleton" aria-hidden>
                <div className="pg-skeleton-image" />
                <div className="pg-skeleton-body">
                  <div className="pg-skeleton-line w-1/3" />
                  <div className="pg-skeleton-line w-2/3" />
                  <div className="pg-skeleton-line w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <div
            key={paramsKey}
            ref={gridRef}
            className={`${gridClass}${filtering ? " is-filtering" : ""}`}
            style={gridStyle}
          >
            {data.items.map((item, index) => {
              const saved = wishlist.includes(item.id);
              const out = item.stockStatus === "OUT_OF_STOCK";
              const excerpt = item.excerpt
                ? item.excerpt.length > excerptLength
                  ? `${item.excerpt.slice(0, excerptLength).trimEnd()}…`
                  : item.excerpt
                : null;

              return (
                <article
                  key={item.id}
                  data-pg-card
                  className={[
                    "pg-item",
                    CARD_CLASS[cardStyle],
                    ANIM_CLASS[cardAnimation],
                    HOVER_CLASS[hoverEffect],
                  ].join(" ")}
                  style={{ ["--pg-delay" as string]: `${(index % productsPerPage) * 70}ms` }}
                >
                  {showFeaturedImage ? (
                    <div className={`pg-image ${ASPECT_CLASS[imageAspect]}`}>
                      {item.imageAssetId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/assets/${item.imageAssetId}`}
                          alt={item.name}
                          loading="lazy"
                          className="pg-image-el"
                        />
                      ) : (
                        <div className="pg-image-placeholder" aria-hidden>
                          <span>🛒</span>
                        </div>
                      )}
                      <div className="pg-badges">
                        {item.onSale && <span className="pg-badge pg-badge-sale">Sale</span>}
                        {item.featured && <span className="pg-badge pg-badge-featured">Featured</span>}
                        {out && <span className="pg-badge pg-badge-out">Sold out</span>}
                      </div>
                      {showWishlist ? (
                        <button
                          type="button"
                          aria-label={saved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
                          aria-pressed={saved}
                          className={`pg-wishlist${saved ? " is-saved" : ""}`}
                          onClick={() => toggleWishlist(item.id)}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                            <path
                              d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.1 5 5.6 5c2 0 3.4 1.1 4.4 2.6C11 6.1 12.4 5 14.4 5c3.5 0 5.2 3.6 3.6 6.8C19.5 16.4 12 21 12 21z"
                              fill={saved ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      ) : null}
                      {showAddToCart && !out ? (
                        <div className="pg-quick">
                          <button
                            type="button"
                            className={`pg-quick-btn${added[item.id] ? " is-added" : ""}`}
                            onClick={() => addToCart(item.id)}
                            disabled={adding[item.id]}
                          >
                            {added[item.id] ? "Added ✓" : adding[item.id] ? "Adding…" : "Add to cart"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="pg-body">
                    {showCategory && item.categories.length > 0 ? (
                      <div className="pg-category">{item.categories[0].name}</div>
                    ) : null}
                    <h3 className="pg-title">{item.name}</h3>
                    {showExcerpt && excerpt ? <p className="pg-excerpt">{excerpt}</p> : null}
                    {showRating && item.reviewCount > 0 ? (
                      <div className="pg-rating" aria-label={`Rated ${item.rating} out of 5 from ${item.reviewCount} reviews`}>
                        <span className="pg-stars" aria-hidden>
                          {[0, 1, 2, 3, 4].map((star) => (
                            <span
                              key={star}
                              className={`pg-star${item.rating >= star + 0.5 ? " is-on" : ""}`}
                            >
                              ★
                            </span>
                          ))}
                        </span>
                        <span className="pg-rating-count">({item.reviewCount})</span>
                      </div>
                    ) : null}
                    {showPrice ? (
                      <div className="pg-price-row">
                        <span className={`pg-price${item.onSale ? " is-sale" : ""}`}>{money(item.price)}</span>
                        {item.onSale && item.regularPrice > item.price ? (
                          <span className="pg-compare">{money(item.regularPrice)}</span>
                        ) : null}
                      </div>
                    ) : null}
                    {showAddToCart && !out ? (
                      <button
                        type="button"
                        className={`pg-cart-btn${added[item.id] ? " is-added" : ""}`}
                        onClick={() => addToCart(item.id)}
                        disabled={adding[item.id]}
                      >
                        {added[item.id] ? "Added to cart ✓" : adding[item.id] ? "Adding…" : "Add to cart"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
            {debouncedSearch || activeCategory ? "No products match your filters." : "No products published yet."}
          </div>
        )}

        {showPagination && data && data.totalPages > 1 ? (
          <nav className="pg-pagination" aria-label="Product pages">
            <button
              type="button"
              className="pg-page-btn"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              ← Prev
            </button>
            {pageNumbers(data.page, data.totalPages).map((value, i) =>
              value === "…" ? (
                <span key={`gap-${i}`} className="pg-page-gap">
                  …
                </span>
              ) : (
                <button
                  key={value}
                  type="button"
                  className={`pg-page-btn${value === data.page ? " is-active" : ""}`}
                  aria-current={value === data.page ? "page" : undefined}
                  onClick={() => setPage(value)}
                >
                  {value}
                </button>
              ),
            )}
            <button
              type="button"
              className="pg-page-btn"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next →
            </button>
          </nav>
        ) : null}
      </div>
    </section>
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
.pg-root { --pg-gap: 1.5rem; }
.pg-grid {
  display: grid;
  gap: var(--pg-gap);
  grid-template-columns: repeat(var(--pg-cols-mobile, 3), minmax(0, 1fr));
  transition: opacity 180ms ease;
}
.pg-grid.is-filtering { opacity: 0.35; }
@media (min-width: 640px) {
  .pg-grid { grid-template-columns: repeat(var(--pg-cols-tablet, 2), minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .pg-grid { grid-template-columns: repeat(var(--pg-cols-desktop, 3), minmax(0, 1fr)); }
}
.pg-grid-isotope { display: block; column-gap: var(--pg-gap); column-count: 1; }
@media (min-width: 640px) { .pg-grid-isotope { column-count: var(--pg-cols-tablet, 2); } }
@media (min-width: 1024px) { .pg-grid-isotope { column-count: var(--pg-cols-desktop, 3); } }
.pg-grid-isotope .pg-item { break-inside: avoid; margin-bottom: var(--pg-gap); display: inline-block; width: 100%; }

.pg-item {
  position: relative;
  overflow: hidden;
  background: #fff;
  border-radius: 0.9rem;
  transition: transform 320ms cubic-bezier(.2,.7,.3,1), box-shadow 320ms ease, border-color 320ms ease;
  opacity: 0;
}
.pg-item.is-visible { animation: pgEnter 620ms cubic-bezier(.2,.7,.3,1) both; animation-delay: var(--pg-delay, 0ms); }
.pg-anim-none.pg-item, .pg-item.pg-anim-none { opacity: 1; animation: none; }
@keyframes pgEnter {
  from { opacity: 0; transform: translateY(24px) scale(.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.pg-anim-zoomIn.is-visible { animation-name: pgEnterZoom; }
@keyframes pgEnterZoom {
  from { opacity: 0; transform: scale(.86); }
  to { opacity: 1; transform: scale(1); }
}
.pg-anim-flip.is-visible { animation-name: pgEnterFlip; }
@keyframes pgEnterFlip {
  from { opacity: 0; transform: perspective(900px) rotateX(-32deg) translateY(18px); }
  to { opacity: 1; transform: perspective(900px) rotateX(0) translateY(0); }
}
.pg-anim-slideIn.is-visible { animation-name: pgEnterSlide; }
@keyframes pgEnterSlide {
  from { opacity: 0; transform: translateX(-42px); }
  to { opacity: 1; transform: translateX(0); }
}

.pg-card-shadow { box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 12px 28px -18px rgba(0,0,0,.35); }
.pg-card-shadow.pg-hover-lift.is-visible:hover { transform: translateY(-8px); box-shadow: 0 18px 40px -20px rgba(0,0,0,.45); }
.pg-card-bordered { border: 1px solid #e4e4e7; }
.pg-card-bordered.pg-hover-lift.is-visible:hover { transform: translateY(-6px); border-color: #a1a1aa; }
.pg-card-minimal { background: transparent; }
.pg-card-minimal .pg-image { border-radius: 0.75rem; }

.pg-hover-zoom.is-visible:hover .pg-image-el { transform: scale(1.08); }
.pg-hover-glow.is-visible:hover { box-shadow: 0 0 0 2px #18181b, 0 0 32px -8px rgba(24,24,27,.55); transform: translateY(-4px); }
.pg-hover-overlay .pg-quick { opacity: 0; transform: translateY(12px); }
.pg-hover-overlay.is-visible:hover .pg-quick,
.pg-hover-overlay.is-visible:focus-within .pg-quick { opacity: 1; transform: translateY(0); }
.pg-hover-overlay.is-visible:hover .pg-image-el { transform: scale(1.06); }

.pg-image { position: relative; overflow: hidden; background: #f4f4f5; }
.pg-image-el { width: 100%; height: 100%; object-fit: cover; transition: transform 500ms cubic-bezier(.2,.7,.3,1); display: block; }
.pg-image-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 2rem; color: #a1a1aa; background: linear-gradient(135deg, #f4f4f5, #e4e4e7); }

.pg-badges { position: absolute; top: 0.65rem; left: 0.65rem; display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pg-badge { font-size: 0.65rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 999px; box-shadow: 0 4px 12px -6px rgba(0,0,0,.5); }
.pg-badge-sale { background: #dc2626; color: #fff; }
.pg-badge-featured { background: #18181b; color: #fff; }
.pg-badge-out { background: #fff; color: #52525b; border: 1px solid #d4d4d8; }

.pg-wishlist {
  position: absolute; top: 0.55rem; right: 0.55rem;
  display: grid; place-items: center;
  width: 2.1rem; height: 2.1rem; border-radius: 999px;
  background: rgba(255,255,255,.92); color: #52525b;
  border: 1px solid rgba(228,228,231,.9);
  transform: translateY(-6px); opacity: 0;
  transition: transform 260ms ease, opacity 260ms ease, color 200ms ease, background 200ms ease;
  cursor: pointer;
}
.pg-item.is-visible .pg-wishlist { transform: translateY(0); opacity: 1; }
.pg-wishlist:hover { color: #e11d48; background: #fff; transform: scale(1.08); }
.pg-wishlist.is-saved { color: #e11d48; background: #fff1f2; border-color: #fecdd3; }
.pg-item:hover .pg-wishlist, .pg-item:focus-within .pg-wishlist { transform: translateY(0) scale(1.04); }

.pg-quick {
  position: absolute; left: 0.65rem; right: 0.65rem; bottom: 0.65rem;
  opacity: 1; transform: translateY(0);
  transition: opacity 260ms ease, transform 260ms ease;
}
.pg-quick-btn {
  width: 100%; border: 0; border-radius: 0.6rem;
  background: rgba(24,24,27,.94); color: #fff;
  font-size: 0.8rem; font-weight: 600; padding: 0.55rem 0.75rem;
  cursor: pointer; backdrop-filter: blur(6px);
  transition: background 200ms ease, transform 200ms ease;
}
.pg-quick-btn:hover { background: #000; transform: translateY(-1px); }
.pg-quick-btn.is-added { background: #047857; }

.pg-body { padding: 0.95rem 1.05rem 1.1rem; }
.pg-card-minimal .pg-body { padding-left: 0; padding-right: 0; }
.pg-category { font-size: 0.7rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #71717a; }
.pg-title { margin-top: 0.2rem; font-size: 1rem; font-weight: 600; color: #18181b; line-height: 1.35; transition: color 200ms ease; }
.pg-item:hover .pg-title { color: #000; }
.pg-excerpt { margin-top: 0.35rem; font-size: 0.82rem; color: #71717a; line-height: 1.5; }
.pg-rating { display: flex; align-items: center; gap: 0.3rem; margin-top: 0.45rem; }
.pg-stars { display: inline-flex; gap: 0.05rem; color: #d4d4d8; font-size: 0.85rem; }
.pg-star.is-on { color: #f59e0b; }
.pg-rating-count { font-size: 0.72rem; color: #a1a1aa; }
.pg-price-row { display: flex; align-items: baseline; gap: 0.5rem; margin-top: 0.5rem; }
.pg-price { font-size: 1.02rem; font-weight: 700; color: #18181b; transition: color 200ms ease, transform 200ms ease; display: inline-block; }
.pg-item:hover .pg-price { transform: translateY(-1px); }
.pg-price.is-sale { color: #dc2626; }
.pg-compare { font-size: 0.82rem; color: #a1a1aa; text-decoration: line-through; }
.pg-cart-btn {
  margin-top: 0.75rem; width: 100%;
  border: 1px solid #18181b; background: #18181b; color: #fff;
  border-radius: 0.6rem; padding: 0.5rem 0.75rem;
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
  transition: background 200ms ease, color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}
.pg-cart-btn:hover:not(:disabled) { background: #fff; color: #18181b; transform: translateY(-2px); box-shadow: 0 10px 22px -14px rgba(0,0,0,.7); }
.pg-cart-btn:disabled { opacity: .65; cursor: default; }
.pg-cart-btn.is-added { background: #047857; border-color: #047857; color: #fff; }
.pg-cart-btn.is-added:hover { background: #065f46; color: #fff; transform: none; box-shadow: none; }

.pg-pills { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.pg-pill {
  border: 1px solid #e4e4e7; background: #fff; color: #52525b;
  border-radius: 999px; padding: 0.35rem 0.85rem;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
  transition: background 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.pg-pill:hover { border-color: #a1a1aa; color: #18181b; transform: translateY(-1px); }
.pg-pill.is-active { background: #18181b; border-color: #18181b; color: #fff; }

.pg-pagination { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.35rem; margin-top: 1.75rem; }
.pg-page-btn {
  min-width: 2.3rem; padding: 0.4rem 0.7rem;
  border: 1px solid #e4e4e7; background: #fff; color: #3f3f46;
  border-radius: 0.55rem; font-size: 0.82rem; font-weight: 600; cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
}
.pg-page-btn:hover:not(:disabled):not(.is-active) { border-color: #18181b; color: #18181b; transform: translateY(-1px); }
.pg-page-btn.is-active { background: #18181b; border-color: #18181b; color: #fff; }
.pg-page-btn:disabled { opacity: .4; cursor: default; }
.pg-page-gap { color: #a1a1aa; padding: 0 0.2rem; }

.pg-skeleton { pointer-events: none; }
.pg-skeleton-image { aspect-ratio: 16 / 9; background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 37%, #f4f4f5 63%); background-size: 400% 100%; animation: pgShimmer 1.4s ease infinite; }
.pg-skeleton-body { padding: 0.95rem 1.05rem 1.1rem; display: grid; gap: 0.55rem; }
.pg-skeleton-line { height: 0.7rem; border-radius: 999px; background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 37%, #f4f4f5 63%); background-size: 400% 100%; animation: pgShimmer 1.4s ease infinite; }
@keyframes pgShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

@media (prefers-reduced-motion: reduce) {
  .pg-item, .pg-item.is-visible { animation: none !important; opacity: 1 !important; transform: none !important; transition: none !important; }
  .pg-image-el { transition: none !important; }
}
`;
