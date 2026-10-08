"use client";

/**
 * Geo Category Template Builder — Public Block Renderer
 *
 * Renders geo category template blocks for the public /g/* pages. Geo blocks
 * (hero, content, region nav, listings, FAQ, sidebar) render here; standard
 * blocks are delegated to the blog template renderer so both builders share
 * one implementation of the shared block library.
 */
import { createContext, useContext } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RegionFilterBar from "@/components/RegionFilterBar";
import type { Block } from "@/lib/page-builder/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { resolveColumnWidths, renderColumnSpanClass } from "@/lib/page-builder/spans";
import { styleScopeClass, renderStyleGuide, scopeDynamicStyle } from "@/lib/page-builder/style";
import type { StyleBreakpoints } from "@/lib/page-builder/types";
import {
  getEntranceAnimationClass,
  getVisibilityClasses,
  getHeightStyle,
  getBackgroundStyle,
  renderOverlay,
  renderShapeDivider,
  getStickyStyle,
  getTypographyScopeStyle,
  getVerticalAlignStyle,
  resolveTag,
  buildTransformCss,
  getAdvancedPositionStyle,
  getGridItemStyle,
  getMaskStyle,
  getAdvancedHoverTransition,
  buildAdvancedHoverCss,
  hasAdvancedHover,
  parseCustomAttributes,
  getCacheAttribute,
  scopeCustomCss,
  isDateConditionVisible,
  needsClientGate,
} from "../page-builder/renderHelpers";
import { BlockAdvancedFrame, DisplayConditionGate } from "../page-builder/advanced-ui";
import { sanitizeHtml } from "@/lib/style-guide";
import { BlogTemplateBlockRenderer } from "../blog-template-builder/BlogTemplateRenderer";
import type { ContainerSettings, GeoSidebarWidget } from "@/lib/geo-category-template/types";
import {
  resolveGeoBlockBindings,
  resolveGeoPropsBindings,
  type GeoBindingData,
} from "@/lib/geo-category-template/geo-bindings";

/* ── Geo Data Context ─────────────────────────────────────────────────────── */

export interface GeoStateLink {
  slug: string;
  state: string;
  stateFull: string;
  url: string;
}

export interface GeoTemplateListing {
  id: string;
  title: string;
  slug: string;
  href: string;
  summary?: string | null;
  city?: string | null;
  state?: string | null;
  image?: string | null;
  tier?: string | null;
}

export interface GeoFaqItem {
  q: string;
  a: string;
}

export interface GeoCityLink {
  slug: string;
  name: string;
  url: string;
}

export interface GeoTemplateContextValue {
  geo?: GeoBindingData | null;
  states?: GeoStateLink[];
  faq?: GeoFaqItem[];
  listings?: GeoTemplateListing[];
  /** Child-region links for a state page (feeds geoRegionChips). */
  cities?: GeoCityLink[];
  /** Page-specific replacement for the geoListings block body (region pages
   *  inject their sort/filter/pagination + rich listing cards here). */
  listingsSlot?: React.ReactNode;
  viewport?: "desktop" | "tablet" | "mobile";
}

export const GeoDataContext = createContext<GeoTemplateContextValue>({});

/* ── Style Scope Helper ───────────────────────────────────────────────────── */

function styleScope(block: Block, inner: React.ReactNode): React.ReactNode {
  const style = (block.props as { style?: StyleBreakpoints }).style;
  const css = renderStyleGuide(block.id, style);
  if (!css) return inner;
  return (
    <>
      <style>{css}</style>
      <div className={styleScopeClass(block.id)}>{inner}</div>
    </>
  );
}

/* ── Row Renderer (geo — binding-aware) ───────────────────────────────────── */

function GeoRowRenderer({ block }: { block: Block }) {
  const { geo } = useContext(GeoDataContext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = resolveGeoPropsBindings("row", block.props as Record<string, unknown>, geo) as any;

  const bgStyle = getBackgroundStyle({
    bgType: p.bgType,
    bgColor: p.bgColor,
    bgImage: p.bgImage,
    bgSize: p.bgSize,
    bgPosition: p.bgPosition,
    bgRepeat: p.bgRepeat,
    bgGradientStart: p.bgGradientStart,
    bgGradientEnd: p.bgGradientEnd,
    bgGradientAngle: p.bgGradientAngle,
  });

  const rowStyle: React.CSSProperties = {
    width: "100%",
    ...bgStyle,
    color: p.textColor,
    paddingTop: p.padding?.top ?? p.paddingY,
    paddingRight: p.padding?.right,
    paddingBottom: p.padding?.bottom ?? p.paddingY,
    paddingLeft: p.padding?.left,
    marginTop: p.margin?.top,
    marginRight: p.margin?.right,
    marginBottom: p.margin?.bottom,
    marginLeft: p.margin?.left,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle : undefined,
    borderWidth: p.borderWidth,
    borderColor: p.borderColor,
    borderRadius: p.borderRadius,
    boxShadow: p.boxShadow,
    zIndex: p.zindex || undefined,
    position: "relative",
    overflow: p.overflow && p.overflow !== "default" ? p.overflow : undefined,
    ...getStickyStyle(p.sticky),
    ...getAdvancedPositionStyle(p.position as string),
    ...getGridItemStyle(p.gridColumnSpan, p.gridRowSpan),
    ...(buildTransformCss(p) ? { transform: buildTransformCss(p) } : {}),
    ...getMaskStyle(p.mask as boolean),
    ...(hasAdvancedHover(p) ? getAdvancedHoverTransition() : {}),
  };

  const heightStyle = getHeightStyle(p.height, p.minHeight);
  if (heightStyle) Object.assign(rowStyle, heightStyle);

  const animClass = getEntranceAnimationClass(p.entranceAnimation);
  const visClass = getVisibilityClasses({
    hideOnDesktop: p.hideOnDesktop,
    hideOnTablet: p.hideOnTablet,
    hideOnMobile: p.hideOnMobile,
  });
  const showOnClasses = [
    p.showOnDesktop === false ? "pb-hide-desktop" : "",
    p.showOnTablet === false ? "pb-hide-tablet" : "",
    p.showOnMobile === false ? "pb-hide-mobile" : "",
  ].filter(Boolean).join(" ");
  const reverseTablet = p.reverseColumnsTablet ? "pb-reverse-tablet" : "";
  const reverseMobile = p.reverseColumnsMobile ? "pb-reverse-mobile" : "";
  const rowClasses = [animClass, visClass, showOnClasses, p.cssClasses].filter(Boolean).join(" ");

  const rowWidth = p.width ?? (p.fullWidth ? "full" : "boxed");
  if (rowWidth === "boxed") {
    rowStyle.maxWidth = p.maxWidth ? `${p.maxWidth}px` : "var(--theme-max-width, 1200px)";
    rowStyle.marginLeft = "auto";
    rowStyle.marginRight = "auto";
  }

  const RowTag = resolveTag(p.htmlTag, "div");

  const customCss = scopeCustomCss(p.customCss, block.id);
  const hoverCss = hasAdvancedHover(p) ? buildAdvancedHoverCss(block.id, p) : "";
  const rowAttrs = {
    ...parseCustomAttributes(p.customAttributes),
    ...getCacheAttribute(p.cacheSetting as string),
  };
  const dateVisible = isDateConditionVisible(p.displayCondition, p.displayConditionDate);
  const gateNeeded = needsClientGate(p.displayCondition);

  const rowScoped = scopeDynamicStyle(`${block.id}-row`, rowStyle);
  const gridScoped = scopeDynamicStyle(`${block.id}-grid`, {
    gap: p.gap,
    rowGap: p.gapRow,
    alignItems: p.align,
    flexDirection: p.direction === "column" ? "column" : undefined,
    flexWrap: p.wrap === "wrap" ? "wrap" : undefined,
    ...getVerticalAlignStyle(p.verticalAlign),
    ...getTypographyScopeStyle({
      headingColor: p.headingColor,
      textColor: p.textColor,
      linkColor: p.linkColor,
      linkHoverColor: p.linkHoverColor,
      textAlign: p.textAlign,
    }),
  });

  const rowElement = (
    // eslint-disable-next-line react-hooks/static-components -- resolveTag is a module-level TAG_MAP lookup, not created during render
    <RowTag id={p.cssId || undefined} className={[rowClasses, rowScoped.className].filter(Boolean).join(" ") || undefined} {...rowAttrs}>
      {rowScoped.node}
      {renderOverlay({ overlayColor: p.overlayColor, overlayOpacity: p.overlayOpacity })}
      {renderShapeDivider("top", p.shapeDividerTop, p.shapeDividerTopColor, p.shapeDividerTopWidth, p.shapeDividerTopHeight)}
      {renderShapeDivider("bottom", p.shapeDividerBottom, p.shapeDividerBottomColor, p.shapeDividerBottomWidth, p.shapeDividerBottomHeight)}
      <div className={`grid grid-cols-12 ${reverseTablet} ${reverseMobile} ${gridScoped.className}`.trim()}>
        {gridScoped.node}
        {p.columns.map((col: Record<string, unknown>, idx: number) => {
              const columnProps = resolveGeoPropsBindings("column", col, geo);
              const widths = resolveColumnWidths(col as never, p.stackOnMobile);
              const spanClass = renderColumnSpanClass(widths);
              const colStyle: React.CSSProperties = {
                backgroundColor: col.bgColor as string | undefined,
                backgroundImage: columnProps.bgImage ? `url(${columnProps.bgImage})` : undefined,
                backgroundPosition: columnProps.bgImage ? ((col.bgPosition as string) || "center center") : undefined,
                backgroundSize: columnProps.bgImage ? ((col.bgSize as string) || "cover") : undefined,
                backgroundRepeat: columnProps.bgImage ? ((col.bgRepeat as string) || "no-repeat") : undefined,
                borderStyle: col.borderStyle !== "none" ? (col.borderStyle as string) : undefined,
                borderWidth: col.borderWidth as number | undefined,
                borderColor: col.borderColor as string | undefined,
                borderRadius: col.borderRadius as number | undefined,
                boxShadow: col.boxShadow as string | undefined,
                marginTop: col.margin ? `${(col.margin as { top?: number }).top ?? 0}px` : undefined,
                marginRight: col.margin ? `${(col.margin as { right?: number }).right ?? 0}px` : undefined,
                marginBottom: col.margin ? `${(col.margin as { bottom?: number }).bottom ?? 0}px` : undefined,
                marginLeft: col.margin ? `${(col.margin as { left?: number }).left ?? 0}px` : undefined,
                paddingTop: col.padding ? `${(col.padding as { top?: number }).top ?? 0}px` : undefined,
                paddingRight: col.padding ? `${(col.padding as { right?: number }).right ?? 0}px` : undefined,
                paddingBottom: col.padding ? `${(col.padding as { bottom?: number }).bottom ?? 0}px` : undefined,
                paddingLeft: col.padding ? `${(col.padding as { left?: number }).left ?? 0}px` : undefined,
                zIndex: col.zindex as number | undefined,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: (col.justifyContent as string) ?? "flex-start",
                alignItems: (col.alignItems as string) ?? "stretch",
                minHeight: col.minHeight as number | undefined,
                order: idx,
              };
              const colScoped = scopeDynamicStyle(`${block.id}-col-${col.id as string}`, colStyle);
              const colOverlayScoped = scopeDynamicStyle(
                `${block.id}-col-${col.id as string}-overlay`,
                columnProps.bgImage && col.overlayOpacity
                  ? {
                      position: "absolute",
                      inset: 0,
                      backgroundColor: (col.overlayColor as string) || "#000000",
                      opacity: (col.overlayOpacity as number) / 100,
                      pointerEvents: "none",
                    }
                  : undefined,
              );
              return (
                <div
                  key={col.id as string}
                  className={[spanClass, (col.cssClasses as string) || "", colScoped.className].filter(Boolean).join(" ")}
                  id={(col.cssId as string) || undefined}
                >
                  {colScoped.node}
                  {colOverlayScoped.node}
                  {colOverlayScoped.className && (
                    <div className={colOverlayScoped.className} aria-hidden="true" />
                  )}
                  <RenderGeoBlocks blocks={col.blocks as Block[]} />
                </div>
              );
            })}
      </div>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {hoverCss && <style dangerouslySetInnerHTML={{ __html: hoverCss }} />}
    </RowTag>
  );

  if (dateVisible === false) return null;
  if (gateNeeded) {
    return (
      <DisplayConditionGate
        condition={p.displayCondition ?? "always"}
        date={p.displayConditionDate}
        urlFragment={p.displayConditionUrl}
      >
        {rowElement}
      </DisplayConditionGate>
    );
  }
  return rowElement;
}

/* ── Geo Leaf Renderers ───────────────────────────────────────────────────── */

function GeoHeroRenderer({ block }: { block: Block }) {
  const { geo } = useContext(GeoDataContext);
  const p = block.props as {
    layout?: "standard" | "centered";
    showImage?: boolean;
    showBreadcrumb?: boolean;
    showDescription?: boolean;
    heading?: string;
    subheading?: string;
    image?: string;
    bgColor?: string;
    textColor?: string;
  };

  const categoryTitle = geo?.category?.title ?? "Directory";
  const heading = p.heading || categoryTitle;
  const descriptionHtml = p.subheading
    ? sanitizeHtml(p.subheading)
    : geo?.category?.description
      ? sanitizeHtml(geo.category.description)
      : "";
  const imageSrc = p.image || geo?.heroImage || null;
  const centered = p.layout === "centered";
  const regionName = geo?.region?.displayName || geo?.region?.stateFull || null;
  const heroScoped = scopeDynamicStyle(`${block.id}-hero`, {
    backgroundColor: p.bgColor || undefined,
    color: p.textColor || undefined,
  });

  return (
    <BlockAdvancedFrame block={block}>
      <div
        className={`rounded-xl border border-zinc-200 bg-white ${centered ? "text-center" : ""} ${heroScoped.className}`.trim()}
      >
        {heroScoped.node}
        <div className="p-6 sm:p-8">
          {p.showBreadcrumb !== false && (
            <nav className={`mb-3 text-xs text-zinc-500 ${centered ? "text-center" : ""}`} aria-label="Breadcrumb">
              <Link href="/" className="hover:text-zinc-800">
                Directory
              </Link>
              {" / "}
              <Link href={`/g/${geo?.category?.slug ?? ""}/`} className="hover:text-zinc-800">
                {categoryTitle}
              </Link>
              {regionName && geo?.categoryUrl && (
                <>
                  {" / "}
                  <span className="text-zinc-700">{regionName}</span>
                </>
              )}
            </nav>
          )}
          <h1 className={`text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl ${centered ? "mx-auto" : ""}`}>
            {heading}
          </h1>
          {p.showDescription !== false && descriptionHtml && (
            <div
              className={`prose-sm mt-3 max-w-3xl text-zinc-700 ${centered ? "mx-auto" : ""}`}
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}
          {p.showImage !== false && imageSrc && (
            <figure className={`mt-5 ${centered ? "mx-auto max-w-3xl" : "max-w-3xl"}`}>
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={geo?.heroImageAlt || geo?.category?.title || ""}
                  title={geo?.heroImageCaption || undefined}
                  className="h-full w-full object-cover"
                />
              </div>
              {geo?.heroImageCaption && (
                <figcaption className="mt-2 text-xs text-zinc-500">{geo.heroImageCaption}</figcaption>
              )}
            </figure>
          )}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

function GeoContentRenderer({ block }: { block: Block }) {
  const p = block.props as {
    showHeading?: boolean;
    heading?: string;
    content?: string;
    maxWidth?: number;
  };
  const html = p.content ? sanitizeHtml(p.content) : "";
  if (!html) return null;
  const widthScoped = scopeDynamicStyle(`${block.id}-content`, {
    maxWidth: p.maxWidth ? `${p.maxWidth}px` : undefined,
  });

  return (
    <BlockAdvancedFrame block={block}>
      <div className={widthScoped.className || undefined}>
        {widthScoped.node}
        {p.showHeading && p.heading && (
          <h2 className="mb-3 text-xl font-semibold text-zinc-900">{p.heading}</h2>
        )}
        <div className="prose-sm text-zinc-700" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </BlockAdvancedFrame>
  );
}

function GeoRegionNavRenderer({ block }: { block: Block }) {
  const { states } = useContext(GeoDataContext);
  const p = block.props as { heading?: string; columns?: 2 | 3 | 4; showCount?: boolean; emptyMessage?: string };
  if (!states || states.length === 0) {
    if (!p.emptyMessage) return null;
    return (
      <BlockAdvancedFrame block={block}>
        <div className="py-4">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900">{p.heading || "Programs by state"}</h2>
          <p className="text-sm text-zinc-500">{p.emptyMessage}</p>
        </div>
      </BlockAdvancedFrame>
    );
  }

  const colClass =
    p.columns === 2
      ? "sm:grid-cols-2"
      : p.columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-4">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          {p.heading || "Programs by state"}
          {p.showCount && (
            <span className="ml-2 text-sm font-normal text-zinc-500">({states.length})</span>
          )}
        </h2>
        <ul className={`grid grid-cols-1 gap-3 ${colClass}`}>
          {states.map((s) => (
            <li key={s.slug}>
              <Link
                href={s.url}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300"
              >
                <span className="font-medium text-zinc-800">{s.stateFull}</span>
                <span className="text-sm text-zinc-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </BlockAdvancedFrame>
  );
}

function GeoListingCard({ listing }: { listing: GeoTemplateListing }) {
  return (
    <a
      href={listing.href}
      className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm"
    >
      {listing.image && (
        <div className="relative aspect-[16/9] bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.image} alt={listing.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-zinc-900">{listing.title}</h3>
        {(listing.city || listing.state) && (
          <p className="mt-1 text-xs text-zinc-500">
            {[listing.city, listing.state].filter(Boolean).join(", ")}
          </p>
        )}
        {listing.summary && (
          <p className="mt-2 line-clamp-3 text-xs text-zinc-600">{listing.summary}</p>
        )}
      </div>
    </a>
  );
}

function GeoListingsRenderer({ block }: { block: Block }) {
  const { listings, listingsSlot, geo } = useContext(GeoDataContext);
  const p = block.props as {
    heading?: string;
    limit?: number;
    columnsDesktop?: 1 | 2 | 3;
    showDescription?: boolean;
    showCount?: boolean;
    emptyMessage?: string;
  };
  // Region pages supply their own full-featured listings UI (filter bar,
  // rich cards, pagination) — render it in place of the built-in grid.
  if (listingsSlot) {
    return <BlockAdvancedFrame block={block}>{listingsSlot}</BlockAdvancedFrame>;
  }
  const items = (listings ?? []).slice(0, p.limit ?? 9);
  if (items.length === 0) {
    if (!p.emptyMessage) return null;
    return (
      <BlockAdvancedFrame block={block}>
        <div className="py-4">
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
            {p.emptyMessage}
          </p>
        </div>
      </BlockAdvancedFrame>
    );
  }

  const total = geo?.listingsCount;
  const showCount = p.showCount && total !== undefined && total !== null;
  const showHeading = Boolean(p.heading) || showCount;

  const colClass =
    p.columnsDesktop === 1
      ? "sm:grid-cols-1"
      : p.columnsDesktop === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-4">
        {showHeading && (
          <h2 className="mb-4 text-xl font-semibold text-zinc-900">
            {p.heading || "Listings"}
            {showCount && (
              <span className="ml-2 text-sm font-normal text-zinc-500">({total})</span>
            )}
          </h2>
        )}
        <div className={`grid grid-cols-1 gap-4 ${colClass}`}>
          {items.map((listing) => (
            <GeoListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

function GeoFaqRenderer({ block }: { block: Block }) {
  const { faq } = useContext(GeoDataContext);
  const p = block.props as { heading?: string };
  if (!faq || faq.length === 0) return null;

  return (
    <BlockAdvancedFrame block={block}>
      <section className="py-4" aria-label="Frequently asked questions">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          {p.heading || "Frequently asked questions"}
        </h2>
        <dl className="space-y-4">
          {faq.map((f) => (
            <div key={f.q} className="rounded-lg border border-zinc-200 bg-white p-4">
              <dt className="font-medium text-zinc-900">{f.q}</dt>
              <dd
                className="prose-sm mt-1 text-sm text-zinc-600"
                dangerouslySetInnerHTML={{ __html: f.a }}
              />
            </div>
          ))}
        </dl>
      </section>
    </BlockAdvancedFrame>
  );
}

/* ── City chips ("Cities in {state}") — legacy region-page pill links ─────── */

function GeoRegionChipsRenderer({ block }: { block: Block }) {
  const { cities, geo } = useContext(GeoDataContext);
  const p = block.props as { heading?: string; showHeading?: boolean };
  if (!cities || cities.length === 0) return null;

  const regionName = geo?.region?.displayName || geo?.region?.stateFull || null;
  const heading = p.heading || (regionName ? `Cities in ${regionName}` : "Nearby cities");

  return (
    <BlockAdvancedFrame block={block}>
      <div className="mt-8">
        {p.showHeading !== false && (
          <h2 className="text-lg font-semibold text-zinc-900">{heading}</h2>
        )}
        <ul className="mt-3 flex flex-wrap gap-2">
          {cities.map((c) => (
            <li key={c.slug}>
              <Link
                href={c.url}
                className="inline-block rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-300"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </BlockAdvancedFrame>
  );
}

/* ── Filter bar — legacy region sort/tier/rating selects (region pages) ───── */

function GeoFilterBarRenderer({ block }: { block: Block }) {
  const { geo } = useContext(GeoDataContext);
  const searchParams = useSearchParams();
  const categorySlug = geo?.category?.slug;
  const regionSlug = geo?.region?.slug;
  if (!categorySlug || !regionSlug) return null;

  return (
    <BlockAdvancedFrame block={block}>
      <RegionFilterBar
        categorySlug={categorySlug}
        regionSlug={regionSlug}
        currentSort={searchParams.get("sort") ?? "featured"}
        currentTier={searchParams.get("tier") ?? ""}
        currentRating={searchParams.get("rating") ?? ""}
      />
    </BlockAdvancedFrame>
  );
}

function GeoSidebarWidgetView({ widget }: { widget: GeoSidebarWidget }) {
  const { states = [], listings = [], faq = [] } = useContext(GeoDataContext);

  let body: React.ReactNode = null;
  if (widget.type === "states") {
    const items = states.slice(0, widget.limit ?? 12);
    body = items.length ? (
      <ul className="space-y-1.5">
        {items.map((s) => (
          <li key={s.slug}>
            <Link href={s.url} className="text-sm text-zinc-700 hover:text-amber-700 hover:underline">
              {s.stateFull}
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-zinc-400">No state guides yet.</p>
    );
  } else if (widget.type === "listings") {
    const items = listings.slice(0, widget.limit ?? 5);
    body = items.length ? (
      <ul className="space-y-2">
        {items.map((listing) => (
          <li key={listing.id}>
            <a href={listing.href} className="block text-sm font-medium text-zinc-800 hover:text-amber-700">
              {listing.title}
            </a>
            {(listing.city || listing.state) && (
              <span className="block text-xs text-zinc-500">
                {[listing.city, listing.state].filter(Boolean).join(", ")}
              </span>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-zinc-400">No listings yet.</p>
    );
  } else if (widget.type === "faq") {
    const items = faq.slice(0, widget.limit ?? 5);
    body = items.length ? (
      <ul className="space-y-3">
        {items.map((f) => (
          <li key={f.q}>
            <p className="text-sm font-medium text-zinc-800">{f.q}</p>
            <p className="mt-0.5 line-clamp-3 text-xs text-zinc-600">{f.a.replace(/<[^>]+>/g, "")}</p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-zinc-400">No FAQs yet.</p>
    );
  } else {
    body = (
      <div
        className="prose-sm text-sm text-zinc-700"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(widget.content ?? "") }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      {widget.heading && (
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
          {widget.heading}
        </h3>
      )}
      {body}
    </div>
  );
}

function GeoSidebarRenderer({ block }: { block: Block }) {
  const p = block.props as { widgets?: GeoSidebarWidget[] };
  const widgets = p.widgets ?? [];
  if (widgets.length === 0) return null;

  return (
    <BlockAdvancedFrame block={block}>
      <aside className="space-y-4">
        {widgets.map((widget, index) => (
          <GeoSidebarWidgetView key={`${widget.type}-${index}`} widget={widget} />
        ))}
      </aside>
    </BlockAdvancedFrame>
  );
}

/* ── Block Dispatch ───────────────────────────────────────────────────────── */

const GEO_BLOCK_RENDERERS: Record<string, (props: { block: Block }) => React.ReactNode> = {
  geoHero: GeoHeroRenderer,
  geoContent: GeoContentRenderer,
  geoRegionNav: GeoRegionNavRenderer,
  geoListings: GeoListingsRenderer,
  geoFaq: GeoFaqRenderer,
  geoSidebar: GeoSidebarRenderer,
  geoRegionChips: GeoRegionChipsRenderer,
  geoFilterBar: GeoFilterBarRenderer,
};

function RenderGeoBlocks({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((block) => <GeoBlockRenderer key={block.id} block={block} />)}</>;
}

/**
 * Resolve geo bindings for a block and render it: containers and geo blocks
 * render here, standard blocks delegate to the shared blog template renderer
 * (whose article bindings resolve to static fallbacks when no article is set).
 */
export function GeoBlockRenderer({ block: sourceBlock }: { block: Block }) {
  const { geo } = useContext(GeoDataContext);
  const block = resolveGeoBlockBindings(sourceBlock, geo);

  if (isRowBlock(block)) {
    return styleScope(block, <GeoRowRenderer block={block} />);
  }

  if (isSectionBlock(block)) {
    const p = block.props as Record<string, unknown> & { rows: Block[] };

    const bgStyle = getBackgroundStyle({
      bgType: p.bgType as string,
      bgColor: p.bgColor as string | undefined,
      bgImage: p.bgImage as string | undefined,
      bgSize: p.bgSize as string | undefined,
      bgPosition: p.bgPosition as string | undefined,
      bgRepeat: p.bgRepeat as string | undefined,
      bgGradientStart: p.bgGradientStart as string | undefined,
      bgGradientEnd: p.bgGradientEnd as string | undefined,
      bgGradientAngle: p.bgGradientAngle as number | undefined,
    });

    const outerStyle: React.CSSProperties = {
      width: "100%",
      ...bgStyle,
      color: p.textColor as string | undefined,
      borderStyle: p.borderStyle !== "none" ? (p.borderStyle as string) : undefined,
      borderWidth: p.borderWidth as number | undefined,
      borderColor: p.borderColor as string | undefined,
      borderRadius: p.borderRadius as number | undefined,
      boxShadow: p.boxShadow as string | undefined,
      marginTop: (p.margin as { top?: number })?.top,
      marginRight: (p.margin as { right?: number })?.right,
      marginBottom: (p.margin as { bottom?: number })?.bottom,
      marginLeft: (p.margin as { left?: number })?.left,
      paddingTop: (p.padding as { top?: number })?.top ?? (p.paddingTop as number | undefined),
      paddingRight: (p.padding as { right?: number })?.right,
      paddingBottom: (p.padding as { bottom?: number })?.bottom ?? (p.paddingBottom as number | undefined),
      paddingLeft: (p.padding as { left?: number })?.left,
      zIndex: (p.zindex as number) || undefined,
      position: "relative",
      overflow: p.overflow && p.overflow !== "default" ? (p.overflow as string) : undefined,
      ...getStickyStyle(p.sticky as string),
      ...getAdvancedPositionStyle(p.position as string),
      ...getGridItemStyle(p.gridColumnSpan as number, p.gridRowSpan as number),
      ...(buildTransformCss(p) ? { transform: buildTransformCss(p) } : {}),
      ...getMaskStyle(p.mask as boolean),
      ...(hasAdvancedHover(p) ? getAdvancedHoverTransition() : {}),
    };

    const heightStyle = getHeightStyle(p.height as string, p.minHeight as number);
    if (heightStyle) Object.assign(outerStyle, heightStyle);

    const animClass = getEntranceAnimationClass(p.entranceAnimation as string);
    const visClass = getVisibilityClasses({
      hideOnDesktop: p.hideOnDesktop as boolean,
      hideOnTablet: p.hideOnTablet as boolean,
      hideOnMobile: p.hideOnMobile as boolean,
    });
    const showOnClasses = [
      p.showOnDesktop === false ? "pb-hide-desktop" : "",
      p.showOnTablet === false ? "pb-hide-tablet" : "",
      p.showOnMobile === false ? "pb-hide-mobile" : "",
    ].filter(Boolean).join(" ");
    const sectionClasses = ["pb-section", animClass, visClass, showOnClasses, p.cssClasses as string]
      .filter(Boolean)
      .join(" ");

    const SectionTag = resolveTag(p.htmlTag as string, "div");
    const sectionScoped = scopeDynamicStyle(`${block.id}-section`, outerStyle);

    const innerStyle: React.CSSProperties = {
      width: "100%",
      maxWidth: p.width === "boxed" ? `${(p.maxWidth as number) || 1200}px` : "100%",
      margin: p.width === "boxed" ? "0 auto" : undefined,
      display: "flex",
      flexDirection: p.direction === "column" ? "column" : "row",
      justifyContent: p.justifyContent as React.CSSProperties["justifyContent"],
      alignItems: p.alignItems as React.CSSProperties["alignItems"],
      columnGap: p.gapCol as number,
      rowGap: p.gapRow as number,
      flexWrap: p.wrap === "wrap" ? "wrap" : undefined,
      ...getVerticalAlignStyle(p.verticalAlign as string, p.direction === "column" ? "column" : "row"),
      ...getTypographyScopeStyle({
        headingColor: p.headingColor as string,
        textColor: p.textColor as string,
        linkColor: p.linkColor as string,
        linkHoverColor: p.linkHoverColor as string,
        textAlign: p.textAlign as string,
      }),
    };
    const innerScoped = scopeDynamicStyle(`${block.id}-section-inner`, innerStyle);

    const customCss = scopeCustomCss(p.customCss as string, block.id);
    const hoverCss = hasAdvancedHover(p) ? buildAdvancedHoverCss(block.id, p) : "";
    const sectionAttrs = {
      ...parseCustomAttributes(p.customAttributes as string),
      ...getCacheAttribute(p.cacheSetting as string),
    };
    const dateVisible = isDateConditionVisible(p.displayCondition as string, p.displayConditionDate as string);
    const gateNeeded = needsClientGate(p.displayCondition as string);

    const sectionElement = (
      // eslint-disable-next-line react-hooks/static-components -- resolveTag is a module-level TAG_MAP lookup, not created during render
      <SectionTag id={(p.cssId as string) || undefined} className={[sectionClasses, sectionScoped.className].filter(Boolean).join(" ") || undefined} {...sectionAttrs}>
        {sectionScoped.node}
        {renderOverlay({ overlayColor: p.overlayColor as string, overlayOpacity: p.overlayOpacity as number })}
        {renderShapeDivider("top", p.shapeDividerTop as string, p.shapeDividerTopColor as string, p.shapeDividerTopWidth as number, p.shapeDividerTopHeight as number)}
        {renderShapeDivider("bottom", p.shapeDividerBottom as string, p.shapeDividerBottomColor as string, p.shapeDividerBottomWidth as number, p.shapeDividerBottomHeight as number)}
        <div className={innerScoped.className || undefined}>
          {innerScoped.node}
          <RenderGeoBlocks blocks={p.rows as Block[]} />
        </div>
        {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
        {hoverCss && <style dangerouslySetInnerHTML={{ __html: hoverCss }} />}
      </SectionTag>
    );

    if (dateVisible === false) return null;
    if (gateNeeded) {
      return (
        <DisplayConditionGate
          condition={(p.displayCondition as string) ?? "always"}
          date={p.displayConditionDate as string}
          urlFragment={p.displayConditionUrl as string}
        >
          {sectionElement}
        </DisplayConditionGate>
      );
    }
    return sectionElement;
  }

  const Renderer = GEO_BLOCK_RENDERERS[block.type];
  if (Renderer) {
    return styleScope(block, <Renderer block={block} />);
  }

  // Standard blocks share the blog template renderer implementation.
  return <BlogTemplateBlockRenderer block={block} />;
}

/* ── Default Export (for site integration) ─────────────────────────────────── */

export default function GeoCategoryTemplateRenderer({
  blocks,
  containerSettings,
  geo,
  states,
  faq,
  listings,
  cities,
  listingsSlot,
  viewport,
}: {
  blocks: Block[];
  containerSettings?: ContainerSettings;
  geo?: GeoBindingData | null;
  states?: GeoStateLink[];
  faq?: GeoFaqItem[];
  listings?: GeoTemplateListing[];
  cities?: GeoCityLink[];
  listingsSlot?: React.ReactNode;
  viewport?: "desktop" | "tablet" | "mobile";
}) {
  const outerStyle: React.CSSProperties = {
    width: "100%",
  };

  if (containerSettings) {
    outerStyle.backgroundColor = containerSettings.bgColor;
    outerStyle.backgroundImage = containerSettings.bgImage ? `url(${containerSettings.bgImage})` : undefined;
    outerStyle.backgroundPosition = containerSettings.bgImage ? (containerSettings.bgPosition || "center center") : undefined;
    outerStyle.backgroundSize = containerSettings.bgImage ? (containerSettings.bgSize || "cover") : undefined;
    outerStyle.backgroundRepeat = containerSettings.bgImage ? (containerSettings.bgRepeat || "no-repeat") : undefined;
    outerStyle.borderStyle = containerSettings.borderStyle !== "none" ? containerSettings.borderStyle : undefined;
    outerStyle.borderWidth = containerSettings.borderWidth;
    outerStyle.borderColor = containerSettings.borderColor;
    outerStyle.borderRadius = containerSettings.borderRadius;
    outerStyle.marginTop = containerSettings.margin.top;
    outerStyle.marginRight = containerSettings.margin.right;
    outerStyle.marginBottom = containerSettings.margin.bottom;
    outerStyle.marginLeft = containerSettings.margin.left;
    outerStyle.paddingTop = containerSettings.padding.top;
    outerStyle.paddingRight = containerSettings.padding.right;
    outerStyle.paddingBottom = containerSettings.padding.bottom;
    outerStyle.paddingLeft = containerSettings.padding.left;
    outerStyle.position = "relative";
    outerStyle.overflow = "hidden";
  }

  const innerStyle: React.CSSProperties = {};
  if (containerSettings) {
    innerStyle.width = "100%";
    innerStyle.maxWidth = containerSettings.width === "boxed" ? `${containerSettings.maxWidth || 1200}px` : "100%";
    innerStyle.margin = containerSettings.width === "boxed" ? "0 auto" : undefined;
    innerStyle.minHeight = containerSettings.minHeight || undefined;
    innerStyle.zIndex = containerSettings.zindex || undefined;
  }
  const outerScoped = scopeDynamicStyle("geo-container-outer", outerStyle);
  const innerScoped = scopeDynamicStyle("geo-container-inner", { ...innerStyle, position: "relative", zIndex: 1 });
  const overlayScoped = scopeDynamicStyle("geo-container-overlay",
    containerSettings?.bgImage && containerSettings.overlayOpacity
      ? {
          position: "absolute",
          inset: 0,
          backgroundColor: containerSettings.overlayColor || "#000000",
          opacity: containerSettings.overlayOpacity / 100,
          pointerEvents: "none",
        }
      : undefined,
  );

  return (
    <GeoDataContext.Provider value={{ geo, states, faq, listings, cities, listingsSlot, viewport }}>
      <div className={outerScoped.className || undefined}>
        {outerScoped.node}
        {overlayScoped.node}
        {overlayScoped.className ? (
          <div className={overlayScoped.className} aria-hidden="true" />
        ) : null}
        <div className={innerScoped.className || undefined}>
          {innerScoped.node}
          <RenderGeoBlocks blocks={blocks} />
        </div>
      </div>
    </GeoDataContext.Provider>
  );
}
