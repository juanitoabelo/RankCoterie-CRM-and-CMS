import React from "react";
import { type Block, type RowBlock, type SectionBlock, type StyleBreakpoints, type IconListBlock, type VideoBlock } from "@/lib/page-builder/types";
import {
  renderColumnSpanClass,
  resolveColumnWidths,
} from "@/lib/page-builder/spans";
import { renderStyleGuide, styleScopeClass } from "@/lib/page-builder/style";
import { renderLocalizedContent, type RegionContext } from "@/lib/localization/render";
import SliderCarousel from "./SliderCarousel";
import ContentGridFrontend from "./ContentGridFrontend";
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
  getAdvancedSpacingStyle,
  getAdvancedPaddingStyle,
  getSectionPaddingStyle,
  buildAdvancedHoverCss,
  hasAdvancedHover,
  getAdvancedHoverTransition,
  parseCustomAttributes,
  getCacheAttribute,
  scopeCustomCss,
  isDateConditionVisible,
  needsClientGate,
} from "./renderHelpers";
import { BlockAdvancedFrame, DisplayConditionGate } from "./advanced-ui";

/** Wrap a block's markup so per-breakpoint style-guide CSS applies to it. */
function styleScope(block: Block, inner: React.ReactNode): React.ReactNode {
  const css = renderStyleGuide(block.id, (block.props as { style?: StyleBreakpoints }).style);
  if (!css) return inner;
  return (
    <>
      <style>{css}</style>
      <div className={styleScopeClass(block.id)}>{inner}</div>
    </>
  );
}

/**
 * Inline padding from the Advanced → Padding setting, applied to the block's
 * inner content section so it overrides the hard-coded Tailwind `py-*` default.
 * Explicit zeros are preserved, letting users shrink the default vertical gap.
 */
function sectionPadding(block: Block): React.CSSProperties {
  return getSectionPaddingStyle(
    (block.props as { padding?: { top?: number | string; right?: number | string; bottom?: number | string; left?: number | string } }).padding,
  );
}

function HeroBlock({ block, ctx }: { block: Block & { type: "hero" }; ctx: RegionContext }) {
  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section
          className="px-6 py-12 text-center"
          style={{ ...sectionPadding(block), backgroundColor: block.props.bgColor, color: block.props.textColor }}
        >
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {renderLocalizedContent(block.props.heading, ctx)}
            </h1>
            {block.props.subheading && (
              <p className="mt-4 text-lg opacity-80">
                {renderLocalizedContent(block.props.subheading, ctx)}
              </p>
            )}
          </div>
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function TextBlock({ block, ctx }: { block: Block & { type: "text" }; ctx: RegionContext }) {
  const p = block.props as typeof block.props & { textColor?: string };
  const alignCls =
    p.align === "center"
      ? "text-center"
      : p.align === "right"
        ? "text-right"
        : "text-left";
  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section className="px-6 py-4" style={sectionPadding(block)}>
          <div
            className={`mx-auto max-w-3xl leading-relaxed rte-content ${alignCls} ${p.textColor ? "" : "text-zinc-700"}`}
            style={p.textColor ? { color: p.textColor } : undefined}
            dangerouslySetInnerHTML={{ __html: renderLocalizedContent(p.content, ctx) }}
          />
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function ImageBlock({ block }: { block: Block & { type: "image" } }) {
  const p = block.props;
  
  const sizeToCss = (v: unknown, fallback?: string): string | undefined => {
    if (v === undefined || v === null) return fallback;
    if (typeof v === "number") return v === 0 ? fallback : `${v}px`;
    if (typeof v === "object" && v !== null && "value" in v) {
      const sv = v as { value: number; unit: string };
      return sv.value === 0 ? fallback : `${sv.value}${sv.unit}`;
    }
    return fallback;
  };

  const containerStyle: React.CSSProperties = {
    alignSelf: p.alignSelf,
  };

  const imgStyle: React.CSSProperties = {
    width: sizeToCss(p.imageWidth, "100%"),
    maxWidth: sizeToCss(p.imageMaxWidth),
    height: sizeToCss(p.imageHeight, "auto"),
    maxHeight: sizeToCss(p.imageMaxHeight),
    objectFit: sizeToCss(p.imageHeight) || sizeToCss(p.imageMaxHeight) ? "cover" : undefined,
    opacity: p.opacity !== undefined && p.opacity < 100 ? p.opacity / 100 : undefined,
    borderTopLeftRadius: p.borderRadiusTop ? `${p.borderRadiusTop}px` : undefined,
    borderTopRightRadius: p.borderRadiusRight ? `${p.borderRadiusRight}px` : undefined,
    borderBottomRightRadius: p.borderRadiusBottom ? `${p.borderRadiusBottom}px` : undefined,
    borderBottomLeftRadius: p.borderRadiusLeft ? `${p.borderRadiusLeft}px` : undefined,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle : undefined,
    borderWidth: p.borderWidth ? `${p.borderWidth}px` : undefined,
    borderColor: p.borderColor,
    boxShadow: p.boxShadow,
    transition: "opacity 0.3s ease",
  };

  const alignmentClass = p.alignment === "center" ? "mx-auto" : p.alignment === "right" ? "ml-auto" : "";

  return (
    <BlockAdvancedFrame block={block}>
      <div style={containerStyle}>
        <figure className={alignmentClass} style={{ maxWidth: "100%" }}>
          {p.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.src}
              alt={p.alt}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={imgStyle}
              className="hover:opacity-75"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-400">
              Image placeholder
            </div>
          )}
          {p.caption && (
            <figcaption className="mt-2 text-center text-sm text-zinc-500">
              {p.caption}
            </figcaption>
          )}
        </figure>
      </div>
    </BlockAdvancedFrame>
  );
}

function CtaBlock({ block, ctx }: { block: Block & { type: "cta" }; ctx: RegionContext }) {
  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section
          className="px-6 py-8 text-center"
          style={{ ...sectionPadding(block), backgroundColor: block.props.bgColor }}
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold text-zinc-900">
              {renderLocalizedContent(block.props.heading, ctx)}
            </h2>
            {block.props.body && (
              <div
                className="mt-3 text-zinc-600 rte-content"
                dangerouslySetInnerHTML={{ __html: renderLocalizedContent(block.props.body, ctx) }}
              />
            )}
            {block.props.buttonText && (
              <a
                href={block.props.buttonUrl}
                className="mt-6 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
              >
                {renderLocalizedContent(block.props.buttonText, ctx)}
              </a>
            )}
          </div>
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function FeaturesBlock({ block, ctx }: { block: Block & { type: "features" }; ctx: RegionContext }) {
  const cols =
    block.props.columns === 2
      ? "sm:grid-cols-2"
      : block.props.columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section className="px-6 py-8" style={sectionPadding(block)}>
          <div className="mx-auto max-w-5xl">
            {block.props.heading && (
              <h2 className="text-center text-2xl font-bold text-zinc-900">
                {renderLocalizedContent(block.props.heading, ctx)}
              </h2>
            )}
            <div className={`mt-10 grid gap-8 ${cols}`}>
              {block.props.items.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl text-zinc-700">
                    {item.icon}
                  </div>
                  <h3 className="mt-4 font-semibold text-zinc-900">
                    {renderLocalizedContent(item.title, ctx)}
                  </h3>
                  {item.description && (
                    <p
                      className="mt-2 text-sm text-zinc-600 rte-content"
                      dangerouslySetInnerHTML={{
                        __html: renderLocalizedContent(item.description, ctx),
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function ButtonBlock({ block, ctx }: { block: Block & { type: "button" }; ctx: RegionContext }) {
  const alignCls =
    block.props.align === "center"
      ? "flex justify-center"
      : block.props.align === "right"
        ? "flex justify-end"
        : "flex justify-start";
  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section className="px-6 py-2" style={sectionPadding(block)}>
          <div className={`mx-auto max-w-6xl ${alignCls}`}>
            <a
              href={block.props.url}
              className={`inline-block rounded-lg px-6 py-3 text-sm font-medium transition-colors ${
                block.props.variant === "outline"
                  ? "border border-zinc-900 text-zinc-900 hover:bg-zinc-100"
                  : "bg-zinc-900 text-white hover:bg-zinc-700"
              }`}
            >
              {renderLocalizedContent(block.props.text, ctx)}
            </a>
          </div>
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function EmbedBlock({ block }: { block: Block & { type: "embed" } }) {
  return (
    <BlockAdvancedFrame block={block}>
      <section className="px-6 py-3" style={sectionPadding(block)}>
        <div
          className="mx-auto max-w-6xl"
          dangerouslySetInnerHTML={{ __html: block.props.html }}
        />
      </section>
    </BlockAdvancedFrame>
  );
}

function FaqBlock({ block, ctx }: { block: Block & { type: "faq" }; ctx: RegionContext }) {
  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section className="px-6 py-8" style={sectionPadding(block)}>
          <div className="mx-auto max-w-3xl">
            {block.props.heading && (
              <h2 className="text-center text-2xl font-bold text-zinc-900">
                {renderLocalizedContent(block.props.heading, ctx)}
              </h2>
            )}
            <div className="mt-8 space-y-3">
              {block.props.items.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-lg border border-zinc-200 bg-white open:shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-zinc-900">
                    {renderLocalizedContent(item.question, ctx)}
                    <span className="text-zinc-400 transition-transform group-open:rotate-45">＋</span>
                  </summary>
                  <div className="border-t border-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600 rte-content">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderLocalizedContent(item.answer, ctx),
                      }}
                    />
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function TestimonialBlock({ block, ctx }: { block: Block & { type: "testimonial" }; ctx: RegionContext }) {
  const items = block.props.items ?? [];
  const display = block.props.display ?? "grid";
  const columns = block.props.columns ?? 2;

  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  if (display === "slider") {
    return (
      <BlockAdvancedFrame block={block}>
        {styleScope(
          block,
          <section className="px-6 py-6" style={sectionPadding(block)}>
            {block.props.heading && (
              <h2 className="mb-8 text-center text-3xl font-bold text-zinc-900">
                {renderLocalizedContent(block.props.heading, ctx)}
              </h2>
            )}
            <div className="overflow-x-auto">
              <div className="flex gap-6" style={{ minWidth: "min-content" }}>
                {items.map((item: { quote: string; author: string; role: string; rating: number; avatar?: string }, i: number) => (
                  <figure
                    key={i}
                    className="flex-shrink-0 rounded-2xl bg-zinc-50 px-8 py-10 text-center"
                    style={{ width: `${100 / (block.props.itemsPerView ?? 2)}%`, minWidth: "300px" }}
                  >
                    {item.rating > 0 && (
                      <div className="text-amber-400">
                        {"★".repeat(Math.max(0, Math.min(5, item.rating)))}
                      </div>
                    )}
                    <blockquote className="mt-4 text-lg font-medium leading-relaxed text-zinc-800">
                      <div
                        className="rte-content"
                        dangerouslySetInnerHTML={{
                          __html: renderLocalizedContent(item.quote, ctx),
                        }}
                      />
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
          </section>,
        )}
      </BlockAdvancedFrame>
    );
  }

  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section className="px-6 py-6" style={sectionPadding(block)}>
          {block.props.heading && (
            <h2 className="mb-8 text-center text-3xl font-bold text-zinc-900">
              {renderLocalizedContent(block.props.heading, ctx)}
            </h2>
          )}
          <div className={`mx-auto grid max-w-6xl gap-6 ${colClass}`}>
            {items.map((item: { quote: string; author: string; role: string; rating: number; avatar?: string }, i: number) => (
              <figure key={i} className="rounded-2xl bg-zinc-50 px-8 py-10 text-center">
                {item.rating > 0 && (
                  <div className="text-amber-400">
                    {"★".repeat(Math.max(0, Math.min(5, item.rating)))}
                  </div>
                )}
                <blockquote className="mt-4 text-lg font-medium leading-relaxed text-zinc-800">
                  <div
                    className="rte-content"
                    dangerouslySetInnerHTML={{
                      __html: renderLocalizedContent(item.quote, ctx),
                    }}
                  />
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
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function SpacerBlock({ block }: { block: Block & { type: "spacer" } }) {
  return (
    <BlockAdvancedFrame block={block}>
      <div style={{ height: block.props.height }} />
    </BlockAdvancedFrame>
  );
}

function DividerBlock({ block }: { block: Block & { type: "divider" } }) {
  return (
    <BlockAdvancedFrame block={block}>
      <div className="px-6 py-2" style={sectionPadding(block)}>
        <hr className="mx-auto max-w-3xl border-zinc-200" />
      </div>
    </BlockAdvancedFrame>
  );
}

const HEADING_SIZES = {
  1: "text-4xl font-bold tracking-tight sm:text-5xl",
  2: "text-3xl font-bold tracking-tight sm:text-4xl",
  3: "text-2xl font-bold text-zinc-900 sm:text-3xl",
  4: "text-xl font-semibold text-zinc-900 sm:text-2xl",
  5: "text-lg font-semibold text-zinc-900",
  6: "text-base font-semibold text-zinc-900",
} as const;

function HeadingBlock({ block, ctx }: { block: Block & { type: "heading" }; ctx: RegionContext }) {
  const p = block.props;
  const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"] as const)[p.level - 1] as React.ElementType;

  const alignCls =
    p.align === "center"
      ? "text-center"
      : p.align === "right"
        ? "text-right"
        : p.align === "justify"
          ? "text-justify"
          : "text-left";

  // Build inline styles
  const headingStyle: React.CSSProperties = {};

  // Typography
  if (p.textColor) headingStyle.color = p.textColor;
  if (p.fontFamily) headingStyle.fontFamily = p.fontFamily;
  if (p.fontWeight) headingStyle.fontWeight = p.fontWeight;
  if (p.fontSize) headingStyle.fontSize = `${p.fontSize}${p.fontSizeUnit || "px"}`;
  if (p.textTransform) headingStyle.textTransform = p.textTransform as React.CSSProperties["textTransform"];
  if (p.textDecoration) headingStyle.textDecoration = p.textDecoration as React.CSSProperties["textDecoration"];
  if (p.lineHeight) headingStyle.lineHeight = p.lineHeight;
  if (p.letterSpacing !== undefined) headingStyle.letterSpacing = p.letterSpacing;
  if (p.wordSpacing !== undefined) headingStyle.wordSpacing = p.wordSpacing;

  // Text stroke (uses -webkit-text-stroke)
  if (p.textStroke) {
    (headingStyle as Record<string, unknown>)["WebkitTextStroke"] = `${p.textStroke}px ${p.textColor || "#000"}`;
  }

  // Text shadow
  if (p.textShadow) headingStyle.textShadow = p.textShadow;

  // Blend mode
  if (p.blendMode) headingStyle.mixBlendMode = p.blendMode as React.CSSProperties["mixBlendMode"];

  // Border
  if (p.borderStyle && p.borderStyle !== "none") {
    headingStyle.borderStyle = p.borderStyle;
    headingStyle.borderWidth = p.borderWidth ? `${p.borderWidth}px` : "1px";
    headingStyle.borderColor = p.borderColor || "#000";
  }

  // Border radius
  const hasRadius = p.borderRadiusTop || p.borderRadiusRight || p.borderRadiusBottom || p.borderRadiusLeft;
  if (hasRadius) {
    headingStyle.borderTopLeftRadius = p.borderRadiusTop ? `${p.borderRadiusTop}px` : undefined;
    headingStyle.borderTopRightRadius = p.borderRadiusRight ? `${p.borderRadiusRight}px` : undefined;
    headingStyle.borderBottomRightRadius = p.borderRadiusBottom ? `${p.borderRadiusBottom}px` : undefined;
    headingStyle.borderBottomLeftRadius = p.borderRadiusLeft ? `${p.borderRadiusLeft}px` : undefined;
  }

  // Box shadow
  if (p.boxShadow) headingStyle.boxShadow = p.boxShadow;

  // Background
  if (p.bgColor) headingStyle.backgroundColor = p.bgColor;
  if (p.bgImage) {
    headingStyle.backgroundImage = `url(${p.bgImage})`;
    headingStyle.backgroundPosition = p.bgPosition || "center center";
    headingStyle.backgroundSize = p.bgSize || "cover";
    headingStyle.backgroundRepeat = p.bgRepeat || "no-repeat";
  }

  const headingContent = (
    <Tag
      className={`${HEADING_SIZES[p.level]} ${alignCls}`}
      style={headingStyle}
    >
      {renderLocalizedContent(p.text, ctx)}
    </Tag>
  );

  // Wrap in link if provided
  const wrapped = p.link ? (
    <a href={p.link} target={p.linkTarget || undefined} className="no-underline" style={{ color: "inherit" }}>
      {headingContent}
    </a>
  ) : headingContent;

  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(block, <section className="px-6 py-2" style={sectionPadding(block)}>{wrapped}</section>)}
    </BlockAdvancedFrame>
  );
}

function ListBlock({ block, ctx }: { block: Block & { type: "list" }; ctx: RegionContext }) {
  const items = block.props.items
    .map((item) => renderLocalizedContent(item, ctx))
    .filter((item) => item.trim());
  if (items.length === 0) return null;

  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section className="px-6 py-3" style={sectionPadding(block)}>
          <div className="mx-auto max-w-3xl text-zinc-700">
            {block.props.ordered ? (
              <ol className="list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-zinc-900">
                {items.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5 marker:text-zinc-400">
                {items.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function SliderBlock({ block }: { block: Block & { type: "slider" } }) {
  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <section className="px-6 py-3" style={sectionPadding(block)}>
          <div className="mx-auto max-w-6xl">
            <SliderCarousel
              slides={block.props.slides}
              height={block.props.height ?? "md"}
              itemsPerView={block.props.itemsPerView ?? 1}
              imageFit={block.props.imageFit ?? "cover"}
              captionLayout={block.props.captionLayout ?? "bottom"}
            />
          </div>
        </section>,
      )}
    </BlockAdvancedFrame>
  );
}

function ContentGridBlock({ block }: { block: Block & { type: "contentGrid" } }) {
  return (
    <BlockAdvancedFrame block={block}>
      {styleScope(
        block,
        <ContentGridFrontend
          heading={block.props.heading}
          source={block.props.source}
          categoryId={block.props.categoryId}
          perPage={block.props.perPage}
          columns={block.props.columns}
          showExcerpt={block.props.showExcerpt}
          order={block.props.order}
        />,
      )}
    </BlockAdvancedFrame>
  );
}

function SectionBlock({ block, ctx }: { block: SectionBlock; ctx: RegionContext }) {
  const p = block.props as SectionBlock["props"] & Record<string, unknown>;
  const isBoxed = (p.width ?? "full") === "boxed";

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
    borderWidth: p.borderWidth ? `${p.borderWidth}px` : undefined,
    borderColor: p.borderColor,
    borderRadius: p.borderRadius ? `${p.borderRadius}px` : undefined,
    boxShadow: p.boxShadow,
    position: "relative",
    zIndex: p.zindex,
    marginTop: p.margin?.top ? `${p.margin.top}px` : undefined,
    marginRight: p.margin?.right ? `${p.margin.right}px` : undefined,
    marginBottom: p.margin?.bottom ? `${p.margin.bottom}px` : undefined,
    marginLeft: p.margin?.left ? `${p.margin.left}px` : undefined,
    overflow: p.overflow && p.overflow !== "default" ? p.overflow : undefined,
    ...getStickyStyle(p.sticky),
    ...getAdvancedPositionStyle(p.position as string),
    ...getGridItemStyle(p.gridColumnSpan, p.gridRowSpan),
    ...(buildTransformCss(p) ? { transform: buildTransformCss(p) } : {}),
    ...getMaskStyle(p.mask as boolean),
    ...(hasAdvancedHover(p) ? getAdvancedHoverTransition() : {}),
  };

  const heightStyle = getHeightStyle(p.height, p.minHeight);

  const innerStyle: React.CSSProperties = {
    maxWidth: isBoxed ? (p.maxWidth || 1200) : "100%",
    margin: isBoxed ? "0 auto" : undefined,
    ...(heightStyle || {}),
    display: "flex",
    flexDirection: p.direction === "row" ? "row" : "column",
    justifyContent: p.justifyContent || "flex-start",
    alignItems: p.alignItems || "stretch",
    columnGap: p.gapCol ? `${p.gapCol}px` : undefined,
    rowGap: p.gapRow ? `${p.gapRow}px` : undefined,
    flexWrap: p.wrap === "wrap" ? "wrap" : undefined,
    paddingTop: p.padding?.top ? `${p.padding.top}px` : p.paddingTop ? `${p.paddingTop}px` : undefined,
    paddingRight: p.padding?.right ? `${p.padding.right}px` : undefined,
    paddingBottom: p.padding?.bottom ? `${p.padding.bottom}px` : p.paddingBottom ? `${p.paddingBottom}px` : undefined,
    paddingLeft: p.padding?.left ? `${p.padding.left}px` : undefined,
    ...getVerticalAlignStyle(p.verticalAlign, p.direction === "row" ? "row" : "column"),
    zIndex: 1,
    position: "relative" as const,
    ...getTypographyScopeStyle({
      headingColor: p.headingColor,
      textColor: p.textColor,
      linkColor: p.linkColor,
      linkHoverColor: p.linkHoverColor,
      textAlign: p.textAlign,
    }),
  };

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
  const hoverCss = hasAdvancedHover(p) ? buildAdvancedHoverCss(block.id, p) : "";
  const sectionAttrs = {
    ...parseCustomAttributes(p.customAttributes),
    ...getCacheAttribute(p.cacheSetting as string),
  };
  const dateVisible = isDateConditionVisible(p.displayCondition, p.displayConditionDate);
  const gateNeeded = needsClientGate(p.displayCondition);

  const SectionTag = resolveTag(p.htmlTag, "section");

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
      {renderOverlay({
        overlayBgType: p.overlayBgType,
        overlayColor: p.overlayColor,
        overlayColor2: p.overlayColor2,
        overlayGradientStart: p.overlayGradientStart,
        overlayGradientEnd: p.overlayGradientEnd,
        overlayGradientAngle: p.overlayGradientAngle,
        overlayOpacity: p.overlayOpacity,
      })}
      {renderShapeDivider("top", p.shapeDividerTop, p.shapeDividerTopColor, p.shapeDividerTopWidth, p.shapeDividerTopHeight)}
      {renderShapeDivider("bottom", p.shapeDividerBottom, p.shapeDividerBottomColor, p.shapeDividerBottomWidth, p.shapeDividerBottomHeight)}
      <div style={innerStyle}>
        {p.rows.map((row) => (
          <RowBlock key={row.id} block={row} ctx={ctx} />
        ))}
      </div>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {hoverCss && <style dangerouslySetInnerHTML={{ __html: hoverCss }} />}
    </SectionTag>
  );

  if (dateVisible === false) return null;
  if (gateNeeded) {
    return (
      <DisplayConditionGate
        condition={p.displayCondition ?? "always"}
        date={p.displayConditionDate}
        urlFragment={p.displayConditionUrl}
      >
        {sectionElement}
      </DisplayConditionGate>
    );
  }
  return sectionElement;
}

function RowBlock({ block, ctx }: { block: RowBlock; ctx: RegionContext }) {
  const p = block.props as RowBlock["props"] & Record<string, unknown>;
  const rowWidth = p.width ?? (p.fullWidth ? "full" : "boxed");
  const isBoxed = rowWidth === "boxed";

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
    position: "relative",
    zIndex: p.zindex,
    marginTop: p.margin?.top ? `${p.margin.top}px` : undefined,
    marginRight: p.margin?.right ? `${p.margin.right}px` : undefined,
    marginBottom: p.margin?.bottom ? `${p.margin.bottom}px` : undefined,
    marginLeft: p.margin?.left ? `${p.margin.left}px` : undefined,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle : undefined,
    borderWidth: p.borderWidth ? `${p.borderWidth}px` : undefined,
    borderColor: p.borderColor,
    borderRadius: p.borderRadius ? `${p.borderRadius}px` : undefined,
    boxShadow: p.boxShadow,
    overflow: p.overflow && p.overflow !== "default" ? p.overflow : undefined,
    ...getStickyStyle(p.sticky),
    ...getAdvancedPositionStyle(p.position as string),
    ...getGridItemStyle(p.gridColumnSpan, p.gridRowSpan),
    ...(buildTransformCss(p) ? { transform: buildTransformCss(p) } : {}),
    ...getMaskStyle(p.mask as boolean),
    ...(hasAdvancedHover(p) ? getAdvancedHoverTransition() : {}),
  };

  const heightStyle = getHeightStyle(p.height, p.minHeight);

  const innerStyle: React.CSSProperties = {
    maxWidth: isBoxed ? (p.maxWidth ? `${p.maxWidth}px` : "var(--theme-max-width, 1200px)") : "100%",
    margin: isBoxed ? "0 auto" : undefined,
    ...(heightStyle || {}),
    paddingTop: p.paddingY ? `${p.paddingY}px` : p.padding?.top ? `${p.padding.top}px` : undefined,
    paddingRight: p.padding?.right ? `${p.padding.right}px` : undefined,
    paddingBottom: p.paddingY ? `${p.paddingY}px` : p.padding?.bottom ? `${p.padding.bottom}px` : undefined,
    paddingLeft: p.padding?.left ? `${p.padding.left}px` : undefined,
    position: "relative" as const,
    zIndex: 1,
  };

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

  const customCss = scopeCustomCss(p.customCss, block.id);
  const hoverCss = hasAdvancedHover(p) ? buildAdvancedHoverCss(block.id, p) : "";
  const rowAttrs = {
    ...parseCustomAttributes(p.customAttributes),
    ...getCacheAttribute(p.cacheSetting as string),
  };
  const dateVisible = isDateConditionVisible(p.displayCondition, p.displayConditionDate);
  const gateNeeded = needsClientGate(p.displayCondition);

  const RowTag = resolveTag(p.htmlTag, "section");

  const rowElement = (
    <RowTag
      style={outerStyle}
      id={p.cssId || undefined}
      data-pb-el={block.id}
      data-pb-kind="row"
      data-pb-type={block.type}
      className={rowClasses || undefined}
      {...rowAttrs}
    >
      {renderOverlay({
        overlayBgType: p.overlayBgType,
        overlayColor: p.overlayColor,
        overlayColor2: p.overlayColor2,
        overlayGradientStart: p.overlayGradientStart,
        overlayGradientEnd: p.overlayGradientEnd,
        overlayGradientAngle: p.overlayGradientAngle,
        overlayOpacity: p.overlayOpacity,
      })}
      {renderShapeDivider("top", p.shapeDividerTop, p.shapeDividerTopColor, p.shapeDividerTopWidth, p.shapeDividerTopHeight)}
      {renderShapeDivider("bottom", p.shapeDividerBottom, p.shapeDividerBottomColor, p.shapeDividerBottomWidth, p.shapeDividerBottomHeight)}
      <div style={innerStyle}>
        <div
          className={`grid grid-cols-12 ${reverseTablet} ${reverseMobile}`}
          style={{
            gap: p.gap,
            alignItems: p.align,
            ...getVerticalAlignStyle(p.verticalAlign, "row"),
          }}
        >
          {p.columns.map((column, idx) => {
            const colBg = column.bgImage
              ? {
                  backgroundColor: column.bgColor,
                  backgroundImage: `url(${column.bgImage})`,
                  backgroundSize: column.bgSize || "cover",
                  backgroundPosition: column.bgPosition || "center center",
                  backgroundRepeat: column.bgRepeat || "no-repeat",
                }
              : { backgroundColor: column.bgColor };
            const totalCols = p.columns.length;
            const reversedIdx = totalCols - 1 - idx;
            return (
              <div
                key={column.id}
                id={column.cssId || undefined}
                data-pb-el={column.id}
                data-pb-kind="column"
                className={[
                  renderColumnSpanClass(
                    resolveColumnWidths(column, p.stackOnMobile !== false),
                  ),
                  column.cssClasses || "",
                ].filter(Boolean).join(" ")}
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: column.justifyContent ?? "flex-start",
                  alignItems: column.alignItems ?? "stretch",
                  minHeight: column.minHeight,
                  borderStyle: column.borderStyle !== "none" ? column.borderStyle : undefined,
                  borderWidth: column.borderWidth ? `${column.borderWidth}px` : undefined,
                  borderColor: column.borderColor,
                  borderRadius: column.borderRadius ? `${column.borderRadius}px` : undefined,
                  boxShadow: column.boxShadow,
                  order: idx,
                  ...colBg,
                  zIndex: column.zindex,
                  marginTop: column.margin?.top ? `${column.margin.top}px` : undefined,
                  marginRight: column.margin?.right ? `${column.margin.right}px` : undefined,
                  marginBottom: column.margin?.bottom ? `${column.margin.bottom}px` : undefined,
                  marginLeft: column.margin?.left ? `${column.margin.left}px` : undefined,
                  paddingTop: column.padding?.top ? `${column.padding.top}px` : undefined,
                  paddingRight: column.padding?.right ? `${column.padding.right}px` : undefined,
                  paddingBottom: column.padding?.bottom ? `${column.padding.bottom}px` : undefined,
                  paddingLeft: column.padding?.left ? `${column.padding.left}px` : undefined,
                }}
              >
                <RenderBlocks blocks={column.blocks} ctx={ctx} />
              </div>
            );
          })}
        </div>
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

function IconListBlock({ block }: { block: Block; ctx: RegionContext }) {
  const p = block.props as IconListBlock["props"];
  const isInline = p.layout === "inline";
  const gap = p.iconGap ?? 8;
  const space = p.spaceBetween ?? 0;

  const textStyle: React.CSSProperties = {};
  if (p.textColor) textStyle.color = p.textColor;
  if (p.typography?.fontFamily) textStyle.fontFamily = p.typography.fontFamily;
  if (p.typography?.fontWeight) textStyle.fontWeight = p.typography.fontWeight;
  if (p.typography?.fontSize) textStyle.fontSize = `${p.typography.fontSize}${p.typography.fontSizeUnit || "px"}`;
  if (p.typography?.lineHeight) textStyle.lineHeight = p.typography.lineHeight;
  if (p.typography?.letterSpacing !== undefined) textStyle.letterSpacing = p.typography.letterSpacing;
  if (p.typography?.textTransform) textStyle.textTransform = p.typography.textTransform as React.CSSProperties["textTransform"];
  if (p.typography?.textDecoration) textStyle.textDecoration = p.typography.textDecoration as React.CSSProperties["textDecoration"];
  if (p.textShadow) textStyle.textShadow = p.textShadow;

  const listStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isInline ? "row" : "column",
    alignItems: p.align === "center" ? "center" : p.align === "right" ? "flex-end" : "flex-start",
    gap: isInline ? `${gap * 2}px` : `${space}px`,
    listStyle: "none",
    margin: 0,
    padding: 0,
  };

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: p.iconVerticalAlign === "top" ? "flex-start" : p.iconVerticalAlign === "bottom" ? "flex-end" : "center",
    gap: `${gap}px`,
  };

  return (
    <BlockAdvancedFrame block={block}>
      <ul style={listStyle}>
      {p.items.map((item, i) => {
        const iconStyle: React.CSSProperties = {
          color: p.iconColor || "#1e40af",
          fontSize: `${p.iconSize ?? 14}px`,
          lineHeight: 1,
          flexShrink: 0,
        };

        const content = (
          <li key={i} style={itemStyle}>
            {item.icon && <span style={iconStyle}>{item.icon}</span>}
            <span style={textStyle}>{item.text}</span>
          </li>
        );

        if (item.link && p.applyLinkOn !== "icon_only") {
          const relParts: string[] = [];
          if (p.openInNewTab) relParts.push("noopener", "noreferrer");
          if (p.linkRel) relParts.push(...p.linkRel.split(" ").filter(Boolean));
          const relAttr = relParts.length > 0 ? relParts.join(" ") : undefined;

          return (
            <a
              key={i}
              href={item.link}
              target={p.openInNewTab ? "_blank" : undefined}
              rel={relAttr}
              style={{ ...itemStyle, textDecoration: "none", color: "inherit" }}
              className="group"
            >
              {item.icon && <span style={iconStyle}>{item.icon}</span>}
              <span
                style={{
                  ...textStyle,
                  color: p.textHoverColor || undefined,
                }}
                className="transition-colors"
              >
                {item.text}
              </span>
            </a>
          );
        }

        return content;
      })}
    </ul>
    </BlockAdvancedFrame>
  );
}

function GoogleMapBlock({ block }: { block: Block; ctx: RegionContext }) {
  const p = block.props as Extract<Block, { type: "googleMap" }>["props"];
  const location = p.location || "London Eye, London, United Kingdom";
  const zoom = p.zoom ?? 10;
  const height = p.height ?? 400;

  const filters: string[] = [];
  if (p.cssFilterBlur) filters.push(`blur(${p.cssFilterBlur}px)`);
  if (p.cssFilterBrightness && p.cssFilterBrightness !== 100) filters.push(`brightness(${p.cssFilterBrightness}%)`);
  if (p.cssFilterContrast && p.cssFilterContrast !== 100) filters.push(`contrast(${p.cssFilterContrast}%)`);
  if (p.cssFilterSaturation && p.cssFilterSaturation !== 100) filters.push(`saturate(${p.cssFilterSaturation}%)`);
  if (p.cssFilterHue) filters.push(`hue-rotate(${p.cssFilterHue}deg)`);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: `${height}px`,
    position: "relative",
    overflow: "hidden",
  };

  const iframeStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    border: 0,
  };
  if (filters.length > 0) {
    iframeStyle.filter = filters.join(" ");
  }

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;

  return (
    <BlockAdvancedFrame block={block}>
      <div style={containerStyle}>
        <iframe
          src={mapUrl}
          style={iframeStyle}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map: ${location}`}
        />
      </div>
    </BlockAdvancedFrame>
  );
}

function VideoBlock({ block }: { block: Block; ctx: RegionContext }) {
  const p = block.props as VideoBlock["props"];
  const source = p.source || "youtube";
  const link = p.link || "";
  const aspectRatio = p.aspectRatio || "16:9";

  const filters: string[] = [];
  if (p.cssFilterBlur) filters.push(`blur(${p.cssFilterBlur}px)`);
  if (p.cssFilterBrightness && p.cssFilterBrightness !== 100) filters.push(`brightness(${p.cssFilterBrightness}%)`);
  if (p.cssFilterContrast && p.cssFilterContrast !== 100) filters.push(`contrast(${p.cssFilterContrast}%)`);
  if (p.cssFilterSaturation && p.cssFilterSaturation !== 100) filters.push(`saturate(${p.cssFilterSaturation}%)`);
  if (p.cssFilterHue) filters.push(`hue-rotate(${p.cssFilterHue}deg)`);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: p.borderRadiusTop ? `${p.borderRadiusTop}px` : undefined,
    borderTopRightRadius: p.borderRadiusRight ? `${p.borderRadiusRight}px` : undefined,
    borderBottomRightRadius: p.borderRadiusBottom ? `${p.borderRadiusBottom}px` : undefined,
    borderBottomLeftRadius: p.borderRadiusLeft ? `${p.borderRadiusLeft}px` : undefined,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle : undefined,
    borderWidth: p.borderWidth ? `${p.borderWidth}px` : undefined,
    borderColor: p.borderColor,
    boxShadow: p.boxShadow,
  };

  const aspectMap: Record<string, string> = {
    "16:9": "56.25%",
    "4:3": "75%",
    "1:1": "100%",
    "21:9": "42.86%",
  };
  containerStyle.paddingBottom = aspectMap[aspectRatio] || "56.25%";

  const iframeStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: 0,
  };
  if (filters.length > 0) {
    iframeStyle.filter = filters.join(" ");
  }

  let videoUrl = "";
  const params: string[] = [];

  if (p.autoplay) params.push("autoplay=1");
  if (p.mute) params.push("mute=1");
  if (p.loop) params.push("loop=1");
  if (!p.playerControls) params.push("controls=0");
  if (p.captions) params.push("cc_load_policy=1");
  if (p.privacyMode && (source === "youtube" || source === "vimeo")) params.push("dnt=1");
  if (p.startTime) params.push(`start=${p.startTime}`);
  if (p.endTime) params.push(`end=${p.endTime}`);
  if (p.suggestedVideos === "any") params.push("rel=1");

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";

  if (source === "youtube") {
    const videoId = link.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1] || "";
    videoUrl = videoId ? `https://www.youtube.com/embed/${videoId}${queryString}` : "";
  } else if (source === "vimeo") {
    const videoId = link.match(/vimeo\.com\/(\d+)/)?.[1] || "";
    videoUrl = videoId ? `https://player.vimeo.com/video/${videoId}${queryString}` : "";
  } else if (source === "dailymotion") {
    const videoId = link.match(/dailymotion\.com\/video\/([^_]+)/)?.[1] || "";
    videoUrl = videoId ? `https://www.dailymotion.com/embed/video/${videoId}${queryString}` : "";
  }

  const playIconStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "68px",
    height: "48px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: p.playIconType === "circle" ? "50%" : "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 2,
  };

  const playIconSymbol = p.playIconType === "upArrow" ? "▲" : p.playIconType === "star" ? "★" : "▶";

  return (
    <BlockAdvancedFrame block={block}>
      <div style={containerStyle}>
        {p.imageOverlay && p.overlayImage ? (
        <div className="relative h-full w-full">
          <img
            src={p.overlayImage}
            alt="Video thumbnail"
            className="h-full w-full object-cover"
            style={filters.length > 0 ? { filter: filters.join(" ") } : undefined}
          />
          {p.playIcon && (
            <div style={playIconStyle}>
              <span style={{ color: "white", fontSize: "20px", marginLeft: "3px" }}>{playIconSymbol}</span>
            </div>
          )}
        </div>
      ) : videoUrl ? (
        <iframe
          src={videoUrl}
          style={iframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading={p.lazyLoad ? "lazy" : "eager"}
          title="Video"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-200">
          <div className="text-center text-zinc-500">
            <span className="text-4xl">▶</span>
            <p className="mt-2 text-sm">Choose your video</p>
          </div>
        </div>
      )}
      </div>
    </BlockAdvancedFrame>
  );
}

const RENDERERS: Record<string, React.ComponentType<{ block: Block; ctx: RegionContext }>> = {
  hero: HeroBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  text: TextBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  image: ImageBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  cta: CtaBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  features: FeaturesBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  button: ButtonBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  embed: EmbedBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  faq: FaqBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  testimonial: TestimonialBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  spacer: SpacerBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  divider: DividerBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  heading: HeadingBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  list: ListBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  iconList: IconListBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  googleMap: GoogleMapBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  video: VideoBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  slider: SliderBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  contentGrid: ContentGridBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  row: RowBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  section: SectionBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
};

function RenderBlocks({
  blocks,
  ctx,
}: {
  blocks: Block[];
  ctx: RegionContext;
}) {
  return (
    <>
      {blocks.map((block) => {
        const Renderer = RENDERERS[block.type];
        if (!Renderer) return null;
        return <Renderer key={block.id} block={block} ctx={ctx} />;
      })}
    </>
  );
}

export default function BlockRenderer({
  blocks,
  ctx = {},
}: {
  blocks: Block[];
  ctx?: RegionContext;
}) {
  return (
    <div>
      <RenderBlocks blocks={blocks} ctx={ctx} />
    </div>
  );
}