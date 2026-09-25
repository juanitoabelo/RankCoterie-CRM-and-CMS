"use client";

/**
 * Page Layout Builder — Public Block Renderer
 *
 * Renders page layout blocks for the public site. Reuses page builder
 * renderers for standard blocks.
 */
import Link from "next/link";
import type { Block } from "@/lib/page-builder/types";
import { PB_CONTAINER } from "@/components/admin/visual-editor/constants";
import type { PageLayoutBlock, ContainerSettings } from "@/lib/page-layout/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { resolveColumnWidths, renderColumnSpanClass } from "@/lib/page-builder/spans";
import { styleScopeClass, renderStyleGuide } from "@/lib/page-builder/style";
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

/* ── Style Scope Helper ─────────────────────────────────────────────────── */

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

/* ── Row Renderer ────────────────────────────────────────────────────────── */

function RowRenderer({ block }: { block: Block }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;

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
  const reverseTablet = p.reverseColumnsTablet ? "pb-reverse-tablet" : "";
  const reverseMobile = p.reverseColumnsMobile ? "pb-reverse-mobile" : "";
  const showOnClasses = [
    p.showOnDesktop === false ? "pb-hide-desktop" : "",
    p.showOnTablet === false ? "pb-hide-tablet" : "",
    p.showOnMobile === false ? "pb-hide-mobile" : "",
  ].filter(Boolean).join(" ");
  const rowClasses = [animClass, visClass, showOnClasses, p.cssClasses].filter(Boolean).join(" ");

  // Content Width: apply boxed or full-width constraints
  const rowWidth = p.width ?? (p.fullWidth ? "full" : "boxed");
  if (rowWidth === "boxed") {
    rowStyle.maxWidth = p.maxWidth ? `${p.maxWidth}px` : "var(--theme-max-width, 1200px)";
    rowStyle.marginLeft = "auto";
    rowStyle.marginRight = "auto";
  }

  const customCss = scopeCustomCss(p.customCss, block.id);
  const hoverCss = hasAdvancedHover(p) ? buildAdvancedHoverCss(block.id, p) : "";
  const rowAttrs = {
    ...parseCustomAttributes(p.customAttributes),
    ...getCacheAttribute(p.cacheSetting as string),
  };
  const dateVisible = isDateConditionVisible(p.displayCondition, p.displayConditionDate);
  const gateNeeded = needsClientGate(p.displayCondition);

  const RowTag = resolveTag(p.htmlTag, "div");

  const rowElement = (
    <RowTag
      style={rowStyle}
      id={p.cssId || undefined}
      data-pb-el={block.id}
      data-pb-kind="row"
      data-pb-type={block.type}
      className={rowClasses || undefined}
      {...rowAttrs}
    >
      {renderOverlay({ overlayColor: p.overlayColor, overlayOpacity: p.overlayOpacity })}
      {renderShapeDivider("top", p.shapeDividerTop, p.shapeDividerTopColor, p.shapeDividerTopWidth, p.shapeDividerTopHeight)}
      {renderShapeDivider("bottom", p.shapeDividerBottom, p.shapeDividerBottomColor, p.shapeDividerBottomWidth, p.shapeDividerBottomHeight)}
      <div
        className={`grid grid-cols-12 ${reverseTablet} ${reverseMobile}`}
        style={{
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
        }}
      >
        {p.columns.map((col: any, idx: number) => {
          const widths = resolveColumnWidths(col, p.stackOnMobile);
          const spanClass = renderColumnSpanClass(widths);
          const colStyle: React.CSSProperties = {
            backgroundColor: col.bgColor,
            backgroundImage: col.bgImage ? `url(${col.bgImage})` : undefined,
            backgroundPosition: col.bgImage ? (col.bgPosition || "center center") : undefined,
            backgroundSize: col.bgImage ? (col.bgSize || "cover") : undefined,
            backgroundRepeat: col.bgImage ? (col.bgRepeat || "no-repeat") : undefined,
            borderStyle: col.borderStyle !== "none" ? col.borderStyle : undefined,
            borderWidth: col.borderWidth,
            borderColor: col.borderColor,
            borderRadius: col.borderRadius,
            boxShadow: col.boxShadow,
            marginTop: col.margin?.top ? `${col.margin.top}px` : undefined,
            marginRight: col.margin?.right ? `${col.margin.right}px` : undefined,
            marginBottom: col.margin?.bottom ? `${col.margin.bottom}px` : undefined,
            marginLeft: col.margin?.left ? `${col.margin.left}px` : undefined,
            paddingTop: col.padding?.top ? `${col.padding.top}px` : undefined,
            paddingRight: col.padding?.right ? `${col.padding.right}px` : undefined,
            paddingBottom: col.padding?.bottom ? `${col.padding.bottom}px` : undefined,
            paddingLeft: col.padding?.left ? `${col.padding.left}px` : undefined,
            zIndex: col.zindex,
            position: "relative" as const,
            display: "flex",
            flexDirection: "column",
            justifyContent: col.justifyContent ?? "flex-start",
            alignItems: col.alignItems ?? "stretch",
            minHeight: col.minHeight,
            order: idx,
          };
          const colOverlayStyle: React.CSSProperties | undefined = col.bgImage && col.overlayOpacity
            ? {
                position: "absolute",
                inset: 0,
                backgroundColor: col.overlayColor || "#000000",
                opacity: col.overlayOpacity / 100,
                pointerEvents: "none",
              }
            : undefined;
          return (
            <div
              key={col.id}
              className={[spanClass, col.cssClasses || ""].filter(Boolean).join(" ")}
              style={colStyle}
              id={col.cssId || undefined}
              data-pb-el={col.id}
              data-pb-kind="column"
            >
              {colOverlayStyle && <div style={colOverlayStyle} />}
              <RenderBlocks blocks={col.blocks as PageLayoutBlock[]} />
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

/* ── Simple Leaf Renderers ─────────────────────────────────────────────── */

const HEADING_SIZES = {
  1: "text-4xl font-bold tracking-tight sm:text-5xl",
  2: "text-3xl font-bold tracking-tight sm:text-4xl",
  3: "text-2xl font-bold sm:text-3xl",
  4: "text-xl font-semibold sm:text-2xl",
  5: "text-lg font-semibold",
  6: "text-base font-semibold",
} as const;

function HeadingRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  const level = (p.level as number) || 2;
  const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"] as const)[level - 1] as React.ElementType;

  const alignCls =
    p.align === "center"
      ? "text-center"
      : p.align === "right"
        ? "text-right"
        : p.align === "justify"
          ? "text-justify"
          : "text-left";

  const widthCls = p.width === "full" ? "w-full" : p.width === "boxed" ? "mx-auto max-w-3xl" : p.width === "inline" ? "inline-block" : "";

  const headingStyle: React.CSSProperties = {};

  if (p.textColor) headingStyle.color = p.textColor as string;
  else headingStyle.color = "rgb(24, 24, 27)";
  if (p.fontFamily) headingStyle.fontFamily = p.fontFamily as string;
  if (p.fontWeight) headingStyle.fontWeight = p.fontWeight as string;
  if (p.fontSize) headingStyle.fontSize = `${p.fontSize}${p.fontSizeUnit || "px"}`;
  if (p.textTransform) headingStyle.textTransform = p.textTransform as React.CSSProperties["textTransform"];
  if (p.textDecoration) headingStyle.textDecoration = p.textDecoration as React.CSSProperties["textDecoration"];
  if (p.lineHeight) headingStyle.lineHeight = p.lineHeight as number;
  if (p.letterSpacing !== undefined) headingStyle.letterSpacing = p.letterSpacing as number;
  if (p.wordSpacing !== undefined) headingStyle.wordSpacing = p.wordSpacing as number;
  if (p.textShadow) headingStyle.textShadow = p.textShadow as string;
  if (p.blendMode) headingStyle.mixBlendMode = p.blendMode as React.CSSProperties["mixBlendMode"];

  if (p.borderStyle && p.borderStyle !== "none") {
    headingStyle.borderStyle = p.borderStyle as string;
    headingStyle.borderWidth = p.borderWidth ? `${p.borderWidth}px` : "1px";
    headingStyle.borderColor = (p.borderColor as string) || "#000";
  }

  if (p.borderRadiusTop || p.borderRadiusRight || p.borderRadiusBottom || p.borderRadiusLeft) {
    headingStyle.borderTopLeftRadius = p.borderRadiusTop ? `${p.borderRadiusTop}px` : undefined;
    headingStyle.borderTopRightRadius = p.borderRadiusRight ? `${p.borderRadiusRight}px` : undefined;
    headingStyle.borderBottomRightRadius = p.borderRadiusBottom ? `${p.borderRadiusBottom}px` : undefined;
    headingStyle.borderBottomLeftRadius = p.borderRadiusLeft ? `${p.borderRadiusLeft}px` : undefined;
  }

  if (p.boxShadow) headingStyle.boxShadow = p.boxShadow as string;
  if (p.bgColor) headingStyle.backgroundColor = p.bgColor as string;

  if (p.bgImage) {
    headingStyle.backgroundImage = `url(${p.bgImage})`;
    headingStyle.backgroundPosition = (p.bgPosition as string) || "center center";
    headingStyle.backgroundSize = (p.bgSize as string) || "cover";
    headingStyle.backgroundRepeat = (p.bgRepeat as string) || "no-repeat";
  }

  const headingContent = (
    <Tag
      className={`${HEADING_SIZES[level as keyof typeof HEADING_SIZES] || HEADING_SIZES[2]} ${alignCls} ${widthCls}`}
      style={headingStyle}
    >
      {p.text as string}
    </Tag>
  );

  const wrapped = p.link ? (
    <a href={p.link as string} target={(p.linkTarget as string) || undefined} className="no-underline" style={{ color: "inherit" }}>
      {headingContent}
    </a>
  ) : headingContent;

  return (
    <BlockAdvancedFrame block={block}>
      <div>
        {wrapped}
      </div>
    </BlockAdvancedFrame>
  );
}

function TextRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  return (
    <BlockAdvancedFrame block={block}>
      <div
        style={{
          textAlign: (p.align as React.CSSProperties["textAlign"]) || undefined,
          color: (p.textColor as string) || undefined,
        }}
        dangerouslySetInnerHTML={{ __html: p.content as string }}
      />
    </BlockAdvancedFrame>
  );
}

function ImageRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  if (!p.src) return null;

  const sizeToCss = (v: unknown, fallback?: string): string | undefined => {
    if (v === undefined || v === null) return fallback;
    if (typeof v === "number") return v === 0 ? fallback : `${v}px`;
    if (typeof v === "object" && v !== null && "value" in v) {
      const sv = v as { value: number; unit: string };
      return sv.value === 0 ? fallback : `${sv.value}${sv.unit}`;
    }
    return fallback;
  };

  const alignment = (p.alignment as string) ?? "left";
  const alignClass = alignment === "center" ? "mx-auto" : alignment === "right" ? "ml-auto" : "";

  const imgStyle: React.CSSProperties = {
    width: sizeToCss(p.imageWidth, "100%"),
    maxWidth: sizeToCss(p.imageMaxWidth),
    height: sizeToCss(p.imageHeight, "auto"),
    maxHeight: sizeToCss(p.imageMaxHeight),
    objectFit: sizeToCss(p.imageHeight) || sizeToCss(p.imageMaxHeight) ? "cover" : undefined,
    opacity: p.opacity !== undefined && (p.opacity as number) < 100 ? (p.opacity as number) / 100 : undefined,
    borderTopLeftRadius: p.borderRadiusTop ? `${p.borderRadiusTop}px` : undefined,
    borderTopRightRadius: p.borderRadiusRight ? `${p.borderRadiusRight}px` : undefined,
    borderBottomRightRadius: p.borderRadiusBottom ? `${p.borderRadiusBottom}px` : undefined,
    borderBottomLeftRadius: p.borderRadiusLeft ? `${p.borderRadiusLeft}px` : undefined,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle as string : undefined,
    borderWidth: p.borderWidth ? `${p.borderWidth}px` : undefined,
    borderColor: p.borderColor as string,
    boxShadow: p.boxShadow as string,
    transition: "opacity 0.3s ease",
  };

  return (
    <BlockAdvancedFrame block={block}>
      <figure className={alignClass}>
        <img src={p.src as string} alt={(p.alt as string) || ""} style={imgStyle} className="hover:opacity-75" />
        {(p.caption as string) && (
          <figcaption className="mt-2 text-center text-sm text-zinc-500">
            {p.caption as string}
          </figcaption>
        )}
      </figure>
    </BlockAdvancedFrame>
  );
}

function ButtonRenderer({ block }: { block: Block }) {
  const p = block.props as { text: string; url: string; align: string; variant: string };
  return (
    <BlockAdvancedFrame block={block}>
      <div style={{ textAlign: p.align as React.CSSProperties["textAlign"] }}>
        <a
          href={p.url}
          className={`inline-block px-6 py-3 text-sm font-medium ${
            p.variant === "outline"
              ? "border-2 border-current"
              : "btn"
          }`}
        >
          {p.text}
        </a>
      </div>
    </BlockAdvancedFrame>
  );
}

function SpacerRenderer({ block }: { block: Block }) {
  const p = block.props as { height: number };
  return (
    <BlockAdvancedFrame block={block}>
      <div style={{ height: p.height }} />
    </BlockAdvancedFrame>
  );
}

function DividerRenderer({ block }: { block: Block }) {
  return (
    <BlockAdvancedFrame block={block}>
      <hr className="border-zinc-200" />
    </BlockAdvancedFrame>
  );
}

function EmbedRenderer({ block }: { block: Block }) {
  const p = block.props as { html: string };
  return (
    <BlockAdvancedFrame block={block}>
      <div dangerouslySetInnerHTML={{ __html: p.html }} />
    </BlockAdvancedFrame>
  );
}

function TestimonialRenderer({ block }: { block: Block }) {
  const p = block.props as {
    items: Array<{ quote: string; author: string; role: string; rating: number; avatar?: string }>;
    display: "grid" | "slider";
    columns: 1 | 2 | 3;
    itemsPerView: number;
    heading?: string;
  };
  const items = p.items ?? [];
  const columns = p.columns ?? 2;

  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  if (p.display === "slider") {
    return (
      <BlockAdvancedFrame block={block}>
        <div className="overflow-x-auto py-4">
          <div className="flex gap-6" style={{ minWidth: "min-content" }}>
            {items.map((item, i) => (
              <figure
                key={i}
                className="flex-shrink-0 rounded-2xl bg-zinc-50 px-8 py-10 text-center"
                style={{ width: `${100 / (p.itemsPerView ?? 2)}%`, minWidth: "300px" }}
              >
                {item.rating > 0 && (
                  <div className="text-amber-400">
                    {"★".repeat(Math.max(0, Math.min(5, item.rating)))}
                  </div>
                )}
                <blockquote className="mt-4 text-lg font-medium leading-relaxed text-zinc-800">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-4 text-sm text-zinc-500">
                  {item.avatar && (
                    <img
                      src={item.avatar}
                      alt={item.author}
                      className="mx-auto mb-2 h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  — {item.author}
                  {item.role ? `, ${item.role}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </BlockAdvancedFrame>
    );
  }

  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-4">
        {p.heading && (
          <h2 className="mb-6 text-center text-2xl font-bold text-zinc-900">
            {p.heading}
          </h2>
        )}
        <div className={`mx-auto grid max-w-6xl gap-6 ${colClass}`}>
          {items.map((item, i) => (
            <figure key={i} className="rounded-2xl bg-zinc-50 px-8 py-10 text-center">
              {item.rating > 0 && (
                <div className="text-amber-400">
                  {"★".repeat(Math.max(0, Math.min(5, item.rating)))}
                </div>
              )}
              <blockquote className="mt-4 text-lg font-medium leading-relaxed text-zinc-800">
                {item.quote}
              </blockquote>
              <figcaption className="mt-4 text-sm text-zinc-500">
                {item.avatar && (
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="mx-auto mb-2 h-10 w-10 rounded-full object-cover"
                  />
                )}
                — {item.author}
                {item.role ? `, ${item.role}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

function HeroRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; subheading: string; bgColor: string; textColor: string };
  return (
    <BlockAdvancedFrame block={block}>
      <div
        className="py-16 text-center"
        style={{ backgroundColor: p.bgColor, color: p.textColor }}
      >
        <h1 className="text-4xl font-bold">{p.heading}</h1>
        <p className="mt-4 text-lg opacity-80" dangerouslySetInnerHTML={{ __html: p.subheading }} />
      </div>
    </BlockAdvancedFrame>
  );
}

function CtaRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; body: string; buttonText: string; buttonUrl: string; bgColor: string };
  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-12 text-center" style={{ backgroundColor: p.bgColor }}>
        <h2 className="text-2xl font-bold">{p.heading}</h2>
        <p className="mt-2 text-zinc-600">{p.body}</p>
        <a href={p.buttonUrl} className="mt-4 inline-block btn px-6 py-3 text-sm font-medium">
          {p.buttonText}
        </a>
      </div>
    </BlockAdvancedFrame>
  );
}

function FeaturesRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; items: Array<{ icon: string; title: string; description: string }>; columns: number };
  const colClass = p.columns === 2 ? "sm:grid-cols-2" : p.columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-8">
        {p.heading && <h2 className="mb-6 text-center text-2xl font-bold">{p.heading}</h2>}
        <div className={`grid gap-6 ${colClass}`}>
          {p.items.map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl">{item.icon}</div>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

function FaqRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; items: Array<{ question: string; answer: string }> };
  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-8">
        {p.heading && <h2 className="mb-6 text-2xl font-bold">{p.heading}</h2>}
        <div className="space-y-4">
          {p.items.map((item, i) => (
            <div key={i} className="border-b border-zinc-200 pb-4">
              <h3 className="font-medium">{item.question}</h3>
              <p className="mt-1 text-sm text-zinc-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

function ListRenderer({ block }: { block: Block }) {
  const p = block.props as { ordered: boolean; items: string[] };
  const Tag = p.ordered ? "ol" : "ul";
  return (
    <BlockAdvancedFrame block={block}>
      <Tag className="list-inside list-disc space-y-1">
        {p.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </Tag>
    </BlockAdvancedFrame>
  );
}

function ContentGridRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; columns: number };
  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-8">
        {p.heading && <h2 className="mb-6 text-2xl font-bold">{p.heading}</h2>}
        <p className="text-sm text-zinc-500">Content grid placeholder</p>
      </div>
    </BlockAdvancedFrame>
  );
}

function SliderRenderer({ block }: { block: Block }) {
  const p = block.props as { slides: Array<{ src: string; alt: string; title: string }> };
  return (
    <BlockAdvancedFrame block={block}>
      <div className="overflow-x-auto">
        <div className="flex gap-4">
          {p.slides.map((slide, i) => (
            <div key={i} className="flex-shrink-0">
              {slide.src && <img src={slide.src} alt={slide.alt} className="h-64 w-auto" />}
              {slide.title && <p className="mt-2 text-sm font-medium">{slide.title}</p>}
            </div>
          ))}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

/* ── Block Renderer Map ──────────────────────────────────────────────── */

const BLOCK_RENDERERS: Record<string, React.ComponentType<{ block: Block }>> = {
  heading: HeadingRenderer,
  text: TextRenderer,
  image: ImageRenderer,
  button: ButtonRenderer,
  spacer: SpacerRenderer,
  divider: DividerRenderer,
  embed: EmbedRenderer,
  testimonial: TestimonialRenderer,
  hero: HeroRenderer,
  cta: CtaRenderer,
  features: FeaturesRenderer,
  faq: FaqRenderer,
  list: ListRenderer,
  contentGrid: ContentGridRenderer,
  slider: SliderRenderer,
};

/* ── Render Blocks ────────────────────────────────────────────────────── */

function RenderBlocks({ blocks }: { blocks: PageLayoutBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <PageLayoutBlockRenderer key={block.id} block={block as Block} />
      ))}
    </>
  );
}

/* ── Main Block Renderer ──────────────────────────────────────────────── */

export function PageLayoutBlockRenderer({ block }: { block: Block }) {
  if (isRowBlock(block)) {
    return styleScope(block, <RowRenderer block={block} />);
  }

  if (isSectionBlock(block)) {
    const p = block.props as {
      rows: Block[];
      width?: "full" | "boxed";
      maxWidth?: number;
      minHeight?: number;
      direction?: string;
      justifyContent?: string;
      alignItems?: string;
      gapCol?: number;
      gapRow?: number;
      wrap?: string;
      bgColor?: string;
      bgImage?: string;
      bgPosition?: string;
      bgSize?: string;
      bgRepeat?: string;
      bgType?: string;
      bgGradientStart?: string;
      bgGradientEnd?: string;
      bgGradientAngle?: number;
      overlayColor?: string;
      overlayOpacity?: number;
      textColor?: string;
      borderStyle?: string;
      borderWidth?: number;
      borderColor?: string;
      borderRadius?: number;
      boxShadow?: string;
      paddingTop?: number;
      paddingBottom?: number;
      margin?: { top: number; right: number; bottom: number; left: number };
      padding?: { top: number; right: number; bottom: number; left: number };
      zindex?: number;
      cssId?: string;
      cssClasses?: string;
      height?: string;
      verticalAlign?: string;
      overflow?: string;
      htmlTag?: string;
      stretchSection?: boolean;
      sticky?: string;
      entranceAnimation?: string;
      hideOnDesktop?: boolean;
      hideOnTablet?: boolean;
      hideOnMobile?: boolean;
      headingColor?: string;
      linkColor?: string;
      linkHoverColor?: string;
      textAlign?: string;
      shapeDividerTop?: string;
      shapeDividerTopColor?: string;
      shapeDividerTopWidth?: number;
      shapeDividerTopHeight?: number;
      shapeDividerBottom?: string;
      shapeDividerBottomColor?: string;
      shapeDividerBottomWidth?: number;
      shapeDividerBottomHeight?: number;
      customCss?: string;
    } & Record<string, unknown>;

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

    const outerStyle: React.CSSProperties = {
      width: "100%",
      ...bgStyle,
      color: p.textColor,
      borderStyle: p.borderStyle !== "none" ? p.borderStyle : undefined,
      borderWidth: p.borderWidth,
      borderColor: p.borderColor,
      borderRadius: p.borderRadius,
      boxShadow: p.boxShadow,
      marginTop: p.margin?.top,
      marginRight: p.margin?.right,
      marginBottom: p.margin?.bottom,
      marginLeft: p.margin?.left,
      paddingTop: p.padding?.top ?? p.paddingTop,
      paddingRight: p.padding?.right,
      paddingBottom: p.padding?.bottom ?? p.paddingBottom,
      paddingLeft: p.padding?.left,
      zIndex: p.zindex || undefined,
      position: "relative",
      overflow: p.overflow && p.overflow !== "default" ? p.overflow : undefined,
      ...getStickyStyle(p.sticky),
      ...getAdvancedPositionStyle(p.position as string),
      ...getGridItemStyle(p.gridColumnSpan, p.gridRowSpan),
      ...(buildTransformCss(p as Record<string, unknown>) ? { transform: buildTransformCss(p as Record<string, unknown>) } : {}),
      ...getMaskStyle(p.mask as boolean),
      ...(hasAdvancedHover(p as Record<string, unknown>) ? getAdvancedHoverTransition() : {}),
    };

    const heightStyle = getHeightStyle(p.height, p.minHeight);
    if (heightStyle) Object.assign(outerStyle, heightStyle);

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
    const sectionClasses = ["pb-section", animClass, visClass, showOnClasses, p.cssClasses].filter(Boolean).join(" ");

    const customCss = scopeCustomCss(p.customCss, block.id);
    const hoverCss = hasAdvancedHover(p as Record<string, unknown>) ? buildAdvancedHoverCss(block.id, p as Record<string, unknown>) : "";
    const sectionAttrs = {
      ...parseCustomAttributes(p.customAttributes as string),
      ...getCacheAttribute(p.cacheSetting as string),
    };
    const dateVisible = isDateConditionVisible(p.displayCondition as string, p.displayConditionDate as string);
    const gateNeeded = needsClientGate(p.displayCondition as string);

    const SectionTag = resolveTag(p.htmlTag, "div");

    const innerStyle: React.CSSProperties = {
      maxWidth: p.width === "boxed" ? p.maxWidth : "100%",
      margin: p.width === "boxed" ? "0 auto" : undefined,
      display: "flex",
      flexDirection: p.direction === "column" ? "column" : "row",
      justifyContent: p.justifyContent,
      alignItems: p.alignItems,
      columnGap: p.gapCol,
      rowGap: p.gapRow,
      flexWrap: p.wrap === "wrap" ? "wrap" : undefined,
      ...getVerticalAlignStyle(p.verticalAlign, p.direction === "column" ? "column" : "row"),
      ...getTypographyScopeStyle({
        headingColor: p.headingColor,
        textColor: p.textColor,
        linkColor: p.linkColor,
        linkHoverColor: p.linkHoverColor,
        textAlign: p.textAlign,
      }),
    };

    const sectionElement = (
      <SectionTag
        style={outerStyle}
        id={p.cssId || undefined}
        data-pb-el={block.id}
        data-pb-kind="section"
        data-pb-type={block.type}
        className={sectionClasses || undefined}
        {...sectionAttrs}
      >
        {renderOverlay({ overlayColor: p.overlayColor, overlayOpacity: p.overlayOpacity })}
        {renderShapeDivider("top", p.shapeDividerTop, p.shapeDividerTopColor, p.shapeDividerTopWidth, p.shapeDividerTopHeight)}
        {renderShapeDivider("bottom", p.shapeDividerBottom, p.shapeDividerBottomColor, p.shapeDividerBottomWidth, p.shapeDividerBottomHeight)}
        <div style={innerStyle}>
          <RenderBlocks blocks={p.rows as PageLayoutBlock[]} />
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

  const Renderer = BLOCK_RENDERERS[block.type];
  if (Renderer) {
    return styleScope(block, <Renderer block={block} />);
  }

  return null;
}

/* ── Default Export (for site integration) ─────────────────────────────── */

export default function PageLayoutRenderer({
  blocks,
  containerSettings,
}: {
  blocks: PageLayoutBlock[];
  containerSettings?: ContainerSettings;
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
    innerStyle.maxWidth = containerSettings.width === "boxed" ? containerSettings.maxWidth : "100%";
    innerStyle.margin = containerSettings.width === "boxed" ? "0 auto" : undefined;
    innerStyle.minHeight = containerSettings.minHeight || undefined;
    innerStyle.zIndex = containerSettings.zindex || undefined;
  }

  return (
    <div style={outerStyle} data-pb-el={PB_CONTAINER} data-pb-kind="container">
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
        <RenderBlocks blocks={blocks} />
      </div>
    </div>
  );
}
