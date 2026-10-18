"use client";

/**
 * Listing Template Tree Renderer — renders the shared page-builder tree model
 * (section → row → column → blocks) against a listing's view-model.
 *
 * Isomorphic: used by the public listing page (server → client props, ctx
 * rebuilt client-side from serializable listing + regionRows) and by the
 * admin Visual preview / Structure canvas leaf previews (sample ctx).
 * Data binding order: structured bindings (props.bindings) resolve first,
 * then {{token}} binding runs via ctx.bind on text fields.
 */
import { createContext, useContext, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Block, RowBlock, SectionBlock } from "@/lib/page-builder/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { resolveColumnWidths, renderColumnSpanClass } from "@/lib/page-builder/spans";
import { sanitizeHtml } from "@/lib/style-guide";
import type { ContainerSettings } from "@/lib/listing-templates/tree-types";
import { resolveListingBlockBindings, type ListingBindingData } from "@/lib/listing-templates/bindings";
import {
  buildListingViewContext,
  type ListingRowLike,
  type ListingViewContext,
  type RegionRow,
} from "./listing-view-model";
import { ListingHero } from "./ListingTemplateRenderer";
import { ContentSliderBlockBody } from "@/components/admin/page-builder/ContentSliderFrontend";
import { SHARED_RENDERERS } from "@/components/admin/page-builder/shared-blocks/renderers";
import { scopeDynamicStyle, styleScopeClass } from "@/lib/page-builder/style";
import { elementStylesNode, type ElementStyles } from "@/lib/page-builder/element-style";
import {
  AreasCard,
  CategoriesCard,
  ClaimCard,
  ContactCard,
  DetailsGrid,
  GalleryGrid,
  HoursCard,
  MapEmbed,
  QuickFactsCard,
  ReviewForm,
  ReviewsList,
  SocialCard,
  VideoEmbed,
} from "./parts";

/**
 * Legacy per-breakpoint style shape read by `applyBlockStyle`. Richer than the
 * narrow `StyleBreakpoints` kept in page-builder types (which only covers
 * typography) because older listing blocks persisted background, spacing and
 * border values here. New per-element styling lives in `elementStyles`.
 */
interface LegacyBreakpointStyle {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontSizeUnit?: string;
  fontWeight?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number;
  textTransform?: string;
  textDecoration?: string;
  textAlign?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundPosition?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  borderStyle?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  boxShadow?: string;
}

type LegacyBlockStyle = {
  mobile?: LegacyBreakpointStyle;
  sm?: LegacyBreakpointStyle;
  md?: LegacyBreakpointStyle;
  lg?: LegacyBreakpointStyle;
};

/** Apply a block's StyleBreakpoints + Advanced tab props as scoped CSS class + style node. */
function applyBlockStyle(blockId: string, style?: LegacyBlockStyle, advanced?: Record<string, unknown>) {
  // Collect all CSS declarations from both StyleBreakpoints and Advanced tab
  const declarations: React.CSSProperties = {};

  // ── StyleBreakpoints (mobile base + responsive) ──────────────────────────
  if (style?.mobile) {
    const m = style.mobile;
    if (m.color) declarations.color = m.color;
    if (m.fontFamily) declarations.fontFamily = m.fontFamily;
    if (m.fontSize) declarations.fontSize = `${m.fontSize}${m.fontSizeUnit ?? "px"}`;
    if (m.fontWeight) declarations.fontWeight = m.fontWeight;
    if (m.lineHeight) declarations.lineHeight = m.lineHeight;
    if (m.letterSpacing) declarations.letterSpacing = `${m.letterSpacing}px`;
    if (m.textTransform) declarations.textTransform = m.textTransform;
    if (m.textDecoration) declarations.textDecoration = m.textDecoration;
    if (m.textAlign) declarations.textAlign = m.textAlign as React.CSSProperties["textAlign"];
    if (m.backgroundColor) declarations.backgroundColor = m.backgroundColor;
    if (m.backgroundImage) declarations.backgroundImage = `url(${m.backgroundImage})`;
    if (m.backgroundPosition) declarations.backgroundPosition = m.backgroundPosition;
    if (m.backgroundSize) declarations.backgroundSize = m.backgroundSize;
    if (m.backgroundRepeat) declarations.backgroundRepeat = m.backgroundRepeat;
    if (m.paddingTop !== undefined) declarations.paddingTop = m.paddingTop;
    if (m.paddingRight !== undefined) declarations.paddingRight = m.paddingRight;
    if (m.paddingBottom !== undefined) declarations.paddingBottom = m.paddingBottom;
    if (m.paddingLeft !== undefined) declarations.paddingLeft = m.paddingLeft;
    if (m.marginTop !== undefined) declarations.marginTop = m.marginTop;
    if (m.marginRight !== undefined) declarations.marginRight = m.marginRight;
    if (m.marginBottom !== undefined) declarations.marginBottom = m.marginBottom;
    if (m.marginLeft !== undefined) declarations.marginLeft = m.marginLeft;
    if (m.borderStyle) declarations.borderStyle = m.borderStyle;
    if (m.borderWidth !== undefined) declarations.borderWidth = m.borderWidth;
    if (m.borderColor) declarations.borderColor = m.borderColor;
    if (m.borderRadius !== undefined) declarations.borderRadius = m.borderRadius;
    if (m.boxShadow) declarations.boxShadow = m.boxShadow;
  }

  // ── Advanced tab props ───────────────────────────────────────────────────
  if (advanced) {
    const a = advanced;
    if (a.zIndex !== undefined) declarations.zIndex = a.zIndex as number;
    if (a.position) declarations.position = a.position as React.CSSProperties["position"];
    if (a.width === "full") declarations.width = "100%";
    else if (a.width === "boxed") { declarations.maxWidth = "1200px"; declarations.marginLeft = "auto"; declarations.marginRight = "auto"; }
    else if (a.width === "inline") declarations.display = "inline-block";

    // Margin/Padding from Advanced (override StyleBreakpoints)
    if (a.margin) {
      const m = a.margin as { top?: number; right?: number; bottom?: number; left?: number };
      if (m.top !== undefined) declarations.marginTop = m.top;
      if (m.right !== undefined) declarations.marginRight = m.right;
      if (m.bottom !== undefined) declarations.marginBottom = m.bottom;
      if (m.left !== undefined) declarations.marginLeft = m.left;
    }
    if (a.padding) {
      const p = a.padding as { top?: number; right?: number; bottom?: number; left?: number };
      if (p.top !== undefined) declarations.paddingTop = p.top;
      if (p.right !== undefined) declarations.paddingRight = p.right;
      if (p.bottom !== undefined) declarations.paddingBottom = p.bottom;
      if (p.left !== undefined) declarations.paddingLeft = p.left;
    }

    // Transform
    const transforms: string[] = [];
    if (a.rotateZ) transforms.push(`rotate(${a.rotateZ}deg)`);
    if (a.rotateX) transforms.push(`rotateX(${a.rotateX}deg)`);
    if (a.rotateY) transforms.push(`rotateY(${a.rotateY}deg)`);
    if (a.scaleX !== undefined || a.scaleY !== undefined) transforms.push(`scale(${a.scaleX ?? 1}, ${a.scaleY ?? 1})`);
    if (a.offsetX !== undefined || a.offsetY !== undefined) transforms.push(`translate(${a.offsetX ?? 0}px, ${a.offsetY ?? 0}px)`);
    if (a.skewX) transforms.push(`skewX(${a.skewX}deg)`);
    if (a.skewY) transforms.push(`skewY(${a.skewY}deg)`);
    if (a.flipH) transforms.push(`scaleX(-1)`);
    if (a.flipV) transforms.push(`scaleY(-1)`);
    if (transforms.length) declarations.transform = transforms.join(" ");

    // Hover states for background/border - handled via CSS pseudo-classes in scoped styles
    // We'll use the mobile style for hover by checking if hover variants exist
    if (a.hoverBgColor && style?.mobile) style.mobile.backgroundColor = a.hoverBgColor as string;
    if (a.hoverBorderColor && style?.mobile) style.mobile.borderColor = a.hoverBorderColor as string;
    if (a.hoverBorderWidth !== undefined && style?.mobile) style.mobile.borderWidth = a.hoverBorderWidth as number;

    // ── Background from Advanced tab ──────────────────────────────────────────
    // Handles both classic and gradient backgrounds
    if (a.bgType === "classic" || a.bgType === undefined) {
      if (a.bgColor) declarations.backgroundColor = a.bgColor as string;
      if (a.bgImage) declarations.backgroundImage = `url(${a.bgImage as string})`;
      if (a.bgPosition) declarations.backgroundPosition = a.bgPosition as string;
      if (a.bgSize) declarations.backgroundSize = a.bgSize as string;
      if (a.bgRepeat) declarations.backgroundRepeat = a.bgRepeat as string;
    } else if (a.bgType === "gradient") {
      const gradientType = a.bgGradientType === "radial" ? "radial-gradient" : "linear-gradient";
      const angle = a.bgGradientAngle ? `${a.bgGradientAngle as number}deg` : "180deg";
      const start = (a.bgGradientStart as string) || "#000000";
      const end = (a.bgGradientEnd as string) || "#ffffff";
      declarations.backgroundImage = `${gradientType}(${angle}, ${start}, ${end})`;
    }
  } // close if (advanced)

  // Responsive visibility - handled via wrapper in renderers
  const hideClasses: string[] = [];
  if (advanced?.hideOnDesktop) hideClasses.push("pb-hide-desktop");
  if (advanced?.hideOnTablet) hideClasses.push("pb-hide-tablet");
  if (advanced?.hideOnMobile) hideClasses.push("pb-hide-mobile");

  // Only create scoped style if there are declarations
  const hasDeclarations = Object.keys(declarations).length > 0;
  const scoped = hasDeclarations ? scopeDynamicStyle(`block-${blockId}`, declarations) : { className: "", node: null as React.ReactNode | null };

  // Scope class (stable pb-<id> anchor for element styles + custom CSS),
  // scoped declarations, and responsive hide classes.
  const combinedClass = [styleScopeClass(blockId), scoped.className, ...hideClasses].filter(Boolean).join(" ");

  // Include custom CSS if provided
  const customCssNode = advanced?.customCss
    ? <style data-pb-custom={blockId} dangerouslySetInnerHTML={{ __html: `.${styleScopeClass(blockId)} { ${advanced.customCss as string} }` }} />
    : null;

  return {
    className: combinedClass,
    node: scoped.node ? <>{scoped.node}{customCssNode}</> : customCssNode,
  };
}

/* ── Listing Data Context ─────────────────────────────────────────────────── */

export const ListingDataContext = createContext<ListingViewContext | null>(null);

function useListingCtx(): ListingViewContext | null {
  return useContext(ListingDataContext);
}

/* ── Section / Row ────────────────────────────────────────────────────────── */

function SectionRenderer({ block }: { block: SectionBlock }) {
  const p = block.props;
  const outerStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: p.bgColor,
    backgroundImage: p.bgImage ? `url(${p.bgImage})` : undefined,
    backgroundPosition: p.bgImage ? (p.bgPosition || "center center") : undefined,
    backgroundSize: p.bgImage ? (p.bgSize || "cover") : undefined,
    backgroundRepeat: p.bgImage ? (p.bgRepeat || "no-repeat") : undefined,
    color: p.textColor,
    marginTop: p.margin?.top,
    marginRight: p.margin?.right,
    marginBottom: p.margin?.bottom,
    marginLeft: p.margin?.left,
    paddingTop: p.padding?.top ?? p.paddingTop,
    paddingRight: p.padding?.right,
    paddingBottom: p.padding?.bottom ?? p.paddingBottom,
    paddingLeft: p.padding?.left,
    position: "relative",
    overflow: "hidden",
  };
  const innerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: p.width === "boxed" ? `${p.maxWidth || 1200}px` : "100%",
    margin: p.width === "boxed" ? "0 auto" : undefined,
    minHeight: p.minHeight || undefined,
  };

  return (
    <section
      style={outerStyle}
      id={p.cssId || undefined}
      className={p.cssClasses || undefined}
    >
      {p.bgImage && p.overlayOpacity ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: p.overlayColor || "#000000",
            opacity: p.overlayOpacity / 100,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div style={{ ...innerStyle, position: "relative", zIndex: 1 }}>
        {p.rows.map((row) => (
          <RowRenderer key={row.id} block={row} />
        ))}
      </div>
    </section>
  );
}

function RowRenderer({ block }: { block: RowBlock }) {
  const p = block.props;
  const rowStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: p.bgColor,
    backgroundImage: p.bgImage ? `url(${p.bgImage})` : undefined,
    backgroundPosition: p.bgImage ? (p.bgPosition || "center center") : undefined,
    backgroundSize: p.bgImage ? (p.bgSize || "cover") : undefined,
    backgroundRepeat: p.bgImage ? (p.bgRepeat || "no-repeat") : undefined,
    color: p.textColor,
    paddingTop: p.padding?.top ?? p.paddingY,
    paddingRight: p.padding?.right,
    paddingBottom: p.padding?.bottom ?? p.paddingY,
    paddingLeft: p.padding?.left,
    marginTop: p.margin?.top,
    marginRight: p.margin?.right,
    marginBottom: p.margin?.bottom,
    marginLeft: p.margin?.left,
    maxWidth: p.width === "boxed" ? (p.maxWidth ? `${p.maxWidth}px` : "var(--theme-max-width, 1200px)") : undefined,
  };
  if (p.width === "boxed") {
    rowStyle.marginLeft = "auto";
    rowStyle.marginRight = "auto";
  }

  return (
    <div style={rowStyle} id={p.cssId || undefined} className={p.cssClasses || undefined}>
      <div className={`grid grid-cols-1`} style={{ gap: p.gap, alignItems: p.align === "stretch" ? "stretch" : undefined }}>
        <div className="grid grid-cols-12" style={{ gap: p.gap, rowGap: p.gapRow }}>
          {p.columns.map((col) => {
            const widths = resolveColumnWidths(col, p.stackOnMobile);
            const spanClass = renderColumnSpanClass(widths);
            const colStyle: React.CSSProperties = {
              backgroundColor: col.bgColor,
              backgroundImage: col.bgImage ? `url(${col.bgImage})` : undefined,
              backgroundPosition: col.bgImage ? (col.bgPosition || "center center") : undefined,
              backgroundSize: col.bgImage ? (col.bgSize || "cover") : undefined,
              backgroundRepeat: col.bgImage ? (col.bgRepeat || "no-repeat") : undefined,
              borderStyle: col.borderStyle && col.borderStyle !== "none" ? col.borderStyle : undefined,
              borderWidth: col.borderWidth,
              borderColor: col.borderColor,
              borderRadius: col.borderRadius,
              marginTop: col.margin?.top,
              marginRight: col.margin?.right,
              marginBottom: col.margin?.bottom,
              marginLeft: col.margin?.left,
              paddingTop: col.padding?.top,
              paddingRight: col.padding?.right,
              paddingBottom: col.padding?.bottom,
              paddingLeft: col.padding?.left,
              minHeight: col.minHeight,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: col.justifyContent ?? "flex-start",
              alignItems: col.alignItems ?? "stretch",
              gap: 24,
            };
            return (
              <div key={col.id} className={spanClass} style={colStyle} id={col.cssId || undefined}>
                {col.blocks.map((child) => (
                  <ListingTemplateBlockRenderer key={child.id} block={child} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Listing Leaf Renderers ───────────────────────────────────────────────── */

function card(className = "") {
  return `rounded-xl border border-zinc-200 bg-white p-6 ${className}`;
}

function ListingHeroRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as {
    variant?: string;
    showBreadcrumb?: boolean;
    showCover?: boolean;
    showAvatar?: boolean;
    showContact?: boolean;
    showAddress?: boolean;
    showSummary?: boolean;
    style?: import("@/lib/page-builder/types").StyleBreakpoints;
    elementStyles?: ElementStyles;
    zIndex?: number;
    position?: string;
    width?: string;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    padding?: { top?: number; right?: number; bottom?: number; left?: number };
    rotateZ?: number;
    rotateX?: number;
    rotateY?: number;
    scaleX?: number;
    scaleY?: number;
    offsetX?: number;
    offsetY?: number;
    skewX?: number;
    skewY?: number;
    flipH?: boolean;
    flipV?: boolean;
    hoverBgColor?: string;
    hoverBorderColor?: string;
    hoverBorderWidth?: number;
    hideOnDesktop?: boolean;
    hideOnTablet?: boolean;
    hideOnMobile?: boolean;
    customCss?: string;
    customAttributes?: string;
    cssId?: string;
    cssClasses?: string;
    displayCondition?: string;
    displayConditionDate?: string;
    displayConditionUrl?: string;
    cacheSetting?: string;
    scrollingEffects?: boolean;
    mouseEffects?: boolean;
    sticky?: string;
    entranceAnimation?: string;
    bgType?: string;
    bgColor?: string;
    bgImage?: string;
    bgPosition?: string;
    bgSize?: string;
    bgRepeat?: string;
    bgGradientStart?: string;
    bgGradientEnd?: string;
    bgGradientAngle?: number;
    bgGradientType?: string;
    borderStyle?: string;
    borderWidth?: number;
    borderColor?: string;
    borderRadiusTop?: number;
    borderRadiusRight?: number;
    borderRadiusBottom?: number;
    borderRadiusLeft?: number;
    boxShadow?: string;
    mask?: boolean;
  };

  const blockStyle = applyBlockStyle(block.id, p.style, p);

  return (
    <div className={blockStyle.className}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      {p.showBreadcrumb !== false && (
        <nav className="mb-6 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900 hover:underline">Home</Link>
          {" / "}
          <Link href={`/g/${ctx.listing.categories[0]?.category?.slug}`} className="hover:text-zinc-900 hover:underline">
            {ctx.listing.categories[0]?.category?.title}
          </Link>
          {" / "}
          <span className="text-zinc-700">{ctx.listing.title}</span>
        </nav>
      )}
      <ListingHero ctx={ctx} variant={p.variant ?? "default"} />
      {p.showSummary !== false && ctx.renderedSummary && (
        <p className="mt-4 max-w-3xl text-zinc-600" data-lp-el="summary">{ctx.renderedSummary}</p>
      )}
    </div>
  );
}

function ListingAboutRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx || !ctx.renderedSummary) return null;
  const p = block.props as { heading?: string; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <div className={blockStyle.className}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <section className={card()}>
        {p.heading !== "" && (
          <h2 className="text-lg font-semibold text-zinc-900" data-lp-el="heading">{ctx.bind(p.heading) || "About"}</h2>
        )}
        <p className="mt-3 text-zinc-600" data-lp-el="content">{ctx.renderedSummary}</p>
      </section>
    </div>
  );
}

function ListingDescriptionRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx || !ctx.renderedDescription) return null;
  const p = block.props as { heading?: string; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <div className={blockStyle.className}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <section className={card()}>
        {p.heading !== "" && (
          <h2 className="text-lg font-semibold text-zinc-900" data-lp-el="heading">{ctx.bind(p.heading) || "Description"}</h2>
        )}
        <div
          className="prose prose-zinc mt-4 max-w-none"
          data-lp-el="content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(ctx.renderedDescription) }}
        />
      </section>
    </div>
  );
}

function ListingDetailsRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { heading?: string; items?: string[]; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <div className={blockStyle.className}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <section className={card()}>
        <h2 className="text-lg font-semibold text-zinc-900" data-lp-el="heading">{ctx.bind(p.heading) || "Details"}</h2>
        <div className="mt-4">
          <DetailsGrid ctx={ctx} items={p.items} />
        </div>
      </section>
    </div>
  );
}

function ListingGalleryRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { limit?: number; hideIfEmpty?: boolean; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  if (ctx.galleryIds.length === 0 && p.hideIfEmpty !== false) return null;
  return (
    <div className={blockStyle.className}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <GalleryGrid ctx={ctx} limit={p.limit ?? 4} />
    </div>
  );
}

function ListingMapRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { hideIfEmpty?: boolean; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  if (!ctx.mapEmbedSrc && p.hideIfEmpty !== false) return null;
  if (!ctx.mapEmbedSrc) return null;
  return (
    <div className={blockStyle.className}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <MapEmbed ctx={ctx} />
    </div>
  );
}

function ListingVideoRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { hideIfEmpty?: boolean; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  if (!ctx.videoSrc && p.hideIfEmpty !== false) return null;
  if (!ctx.videoSrc) return null;
  return (
    <div className={blockStyle.className}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <VideoEmbed ctx={ctx} />
    </div>
  );
}

function ListingReviewsRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { heading?: string; limit?: number; showResponse?: boolean; showCount?: boolean; hideIfEmpty?: boolean; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  if (ctx.reviews.length === 0 && p.hideIfEmpty !== false) return null;
  return (
    <section className={`${card()} ${blockStyle.className}`}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900" data-lp-el="heading">
          {ctx.bind(p.heading) || "Reviews"}
          {p.showCount !== false ? ` (${ctx.listing.reviewCount})` : ""}
        </h2>
        <Link href={`/listing/${ctx.listing.slug}/reviews`} className="text-sm text-blue-600 hover:underline">
          View all
        </Link>
      </div>
      <ReviewsList ctx={ctx} limit={p.limit ?? 3} showResponse={p.showResponse !== false} />
    </section>
  );
}

function ListingReviewFormRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { heading?: string; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <section className={`${card()} ${blockStyle.className}`}>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <h2 className="mb-4 text-lg font-semibold text-zinc-900" data-lp-el="heading">{ctx.bind(p.heading) || "Write a Review"}</h2>
      <ReviewForm ctx={ctx} />
    </section>
  );
}

function ListingContactFormRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { title?: string; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <ContactCard ctx={ctx} title={ctx.bind(p.title) || "Contact This Business"} className={blockStyle.className} />
    </>
  );
}

function ListingQuickFactsRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <QuickFactsCard ctx={ctx} className={blockStyle.className} />
    </>
  );
}

function ListingHoursRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { title?: string; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <HoursCard ctx={ctx} title={ctx.bind(p.title) || "Hours"} className={blockStyle.className} />
    </>
  );
}

function ListingAreasRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { title?: string; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <AreasCard ctx={ctx} title={ctx.bind(p.title) || "Areas Served"} className={blockStyle.className} />
    </>
  );
}

function ListingCategoriesRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { title?: string; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <CategoriesCard ctx={ctx} title={ctx.bind(p.title) || "Categories"} className={blockStyle.className} />
    </>
  );
}

function ListingSocialRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { title?: string; style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <SocialCard ctx={ctx} title={ctx.bind(p.title) || "Connect"} className={blockStyle.className} />
    </>
  );
}

function ListingClaimRenderer({ block }: { block: Block }) {
  const ctx = useListingCtx();
  if (!ctx) return null;
  const p = block.props as { style?: import("@/lib/page-builder/types").StyleBreakpoints } & Record<string, unknown>;
  const blockStyle = applyBlockStyle(block.id, p.style, p);
  return (
    <>
      {blockStyle.node}
      {elementStylesNode(block.id, p.elementStyles as ElementStyles | undefined)}
      <ClaimCard ctx={ctx} className={blockStyle.className} />
    </>
  );
}

/* ── Generic Leaf Renderers (token-bound) ─────────────────────────────────── */

function HeadingLeaf({ block }: { block: Block }) {
  const ctx = useListingCtx();
  const p = block.props as Record<string, unknown>;
  const bind = ctx?.bind ?? ((t: string | null | undefined) => t ?? "");
  const text = bind(p.text as string);
  if (!text) return null;
  const level = (p.level as number) || 2;
  const tags = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
  const Tag = tags[Math.min(5, Math.max(0, level - 1))];
  const alignCls = p.align === "center" ? "text-center" : p.align === "right" ? "text-right" : "text-left";
  return (
    <Tag className={`text-xl font-semibold tracking-tight text-zinc-900 ${alignCls}`} style={{ color: (p.textColor as string) || undefined }}>
      {text}
    </Tag>
  );
}

function TextLeaf({ block }: { block: Block }) {
  const ctx = useListingCtx();
  const p = block.props as Record<string, unknown>;
  const bind = ctx?.bind ?? ((t: string | null | undefined) => t ?? "");
  const content = bind(p.content as string);
  if (!content) return null;
  const isHtml = /<[a-z][\S\s]*>/i.test(content);
  return (
    <div
      style={{
        textAlign: (p.align as React.CSSProperties["textAlign"]) || undefined,
        color: (p.textColor as string) || undefined,
      }}
      className="text-zinc-600"
      {...(isHtml
        ? { dangerouslySetInnerHTML: { __html: sanitizeHtml(content) } }
        : {})}
    >
      {isHtml ? null : content}
    </div>
  );
}

function ImageLeaf({ block }: { block: Block }) {
  const ctx = useListingCtx();
  const p = block.props as Record<string, unknown> & { field?: string };
  let src = (p.src as string) || "";
  if (!src && p.field && ctx) {
    if (p.field === "feed" && ctx.listing.feedImage) src = `/api/assets/${ctx.listing.feedImage}/`;
    else if (p.field === "avatar" && ctx.listing.avatarImage) src = `/api/assets/${ctx.listing.avatarImage}/`;
    else if (p.field === "gallery" && ctx.galleryIds[0]) {
      const first = ctx.galleryIds[0];
      src = first.startsWith("http") ? first : `/api/assets/${first}/`;
    }
  }
  if (!src) return null;
  return (
    <figure>
      <Image src={src} alt={(p.alt as string) || ctx?.listing.title || ""} width={800} height={400} className="w-full rounded-xl border border-zinc-200 object-cover" />
      {(p.caption as string) && (
        <figcaption className="mt-2 text-center text-sm text-zinc-500">{p.caption as string}</figcaption>
      )}
    </figure>
  );
}

function ButtonLeaf({ block }: { block: Block }) {
  const ctx = useListingCtx();
  const p = block.props as Record<string, unknown>;
  const bind = ctx?.bind ?? ((t: string | null | undefined) => t ?? "");
  const label = bind(p.text as string);
  const href = bind(p.url as string);
  if (!label || !href) return null;
  const alignCls = p.align === "center" ? "text-center" : p.align === "right" ? "text-right" : "";
  return (
    <div className={alignCls}>
      <Link href={href} className="inline-flex items-center rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
        {label}
      </Link>
    </div>
  );
}

function DividerLeaf() {
  return <hr className="border-zinc-200" />;
}

function SpacerLeaf({ block }: { block: Block }) {
  const p = block.props as { height?: number };
  return <div style={{ height: p.height ?? 24 }} aria-hidden />;
}

/* ── Renderer Map ─────────────────────────────────────────────────────────── */

const LISTING_BLOCK_RENDERERS: Record<string, React.ComponentType<{ block: Block }>> = {
  listingHero: ListingHeroRenderer,
  listingAbout: ListingAboutRenderer,
  listingDescription: ListingDescriptionRenderer,
  listingDetails: ListingDetailsRenderer,
  listingGallery: ListingGalleryRenderer,
  listingMap: ListingMapRenderer,
  listingVideo: ListingVideoRenderer,
  listingReviews: ListingReviewsRenderer,
  listingReviewForm: ListingReviewFormRenderer,
  listingContactForm: ListingContactFormRenderer,
  listingQuickFacts: ListingQuickFactsRenderer,
  listingHours: ListingHoursRenderer,
  listingAreas: ListingAreasRenderer,
  listingCategories: ListingCategoriesRenderer,
  listingSocial: ListingSocialRenderer,
  listingClaim: ListingClaimRenderer,
  heading: HeadingLeaf,
  text: TextLeaf,
  image: ImageLeaf,
  button: ButtonLeaf,
  divider: DividerLeaf,
  spacer: SpacerLeaf,
  blogArticleSlider: ContentSliderBlockBody,
  productSlider: ContentSliderBlockBody,
  listingSlider: ContentSliderBlockBody,
  companySlider: ContentSliderBlockBody,
  geoCategorySlider: ContentSliderBlockBody,
  sectionSlider: ContentSliderBlockBody,
  topicSubTopicSlider: ContentSliderBlockBody,
  imageSlider: ContentSliderBlockBody,
  videoSlider: ContentSliderBlockBody,
  ...Object.fromEntries(
    Object.entries(SHARED_RENDERERS).map(([type, R]) => [
      type,
      ({ block }: { block: Block }) => <R block={block} ctx={{}} />,
    ]),
  ),
};

/* ── Main Block Renderer ──────────────────────────────────────────────────── */

function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block) => (
        <ListingTemplateBlockRenderer key={block.id} block={block} />
      ))}
    </>
  );
}

export function ListingTemplateBlockRenderer({ block: sourceBlock }: { block: Block }) {
  const ctx = useListingCtx();
  const block = resolveListingBlockBindings(sourceBlock, bindingDataFromCtx(ctx));

  if (isSectionBlock(block)) return <SectionRenderer block={block as SectionBlock} />;
  if (isRowBlock(block)) return <RowRenderer block={block as RowBlock} />;

  const Renderer = LISTING_BLOCK_RENDERERS[block.type];
  if (Renderer) return <Renderer block={block} />;
  return null;
}

function bindingDataFromCtx(ctx: ListingViewContext | null): ListingBindingData | undefined {
  if (!ctx) return undefined;
  const { listing } = ctx;
  return {
    title: listing.title,
    companyName: listing.companyName,
    summary: listing.summary,
    description: listing.description,
    phone: listing.phone,
    email: listing.email,
    website: listing.website,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    slug: listing.slug,
    tier: listing.tier,
    status: listing.status,
    averageRating: listing.averageRating,
    reviewCount: listing.reviewCount,
    avatarImage: listing.avatarImage,
    feedImage: listing.feedImage,
    createdAt: listing.createdAt,
    category: ctx.categoryName ? { title: ctx.categoryName } : null,
    region: ctx.regionName,
    listingUrl: `/listing/${listing.slug}`,
  };
}

/* ── Default Export (public page + visual preview) ────────────────────────── */

export default function ListingTemplateTreeRenderer({
  blocks,
  containerSettings,
  listing,
  regionRows,
  siteUrl,
}: {
  blocks: Block[];
  containerSettings?: ContainerSettings;
  listing: ListingRowLike;
  regionRows: RegionRow[];
  siteUrl?: string;
}) {
  const ctx = useMemo(
    () => buildListingViewContext(listing, regionRows, siteUrl),
    [listing, regionRows, siteUrl],
  );

  const outerStyle: React.CSSProperties = { width: "100%" };
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

  return (
    <ListingDataContext.Provider value={ctx}>
      <div style={outerStyle}>
        {containerSettings?.bgImage && containerSettings.overlayOpacity ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: containerSettings.overlayColor || "#000000",
              opacity: containerSettings.overlayOpacity / 100,
              pointerEvents: "none",
            }}
          />
        ) : null}
        <div style={{ ...innerStyle, position: "relative", zIndex: 1 }}>
          <div className="mx-auto max-w-6xl px-4 py-10">
            <RenderBlocks blocks={blocks} />
          </div>
        </div>
      </div>
    </ListingDataContext.Provider>
  );
}
