import type React from "react";
import { type Block, type RowBlock, type SectionBlock, type StyleBreakpoints } from "@/lib/page-builder/types";
import {
  renderColumnSpanClass,
  resolveColumnWidths,
} from "@/lib/page-builder/spans";
import { renderStyleGuide, styleScopeClass } from "@/lib/page-builder/style";
import { renderLocalizedContent, type RegionContext } from "@/lib/localization/render";
import SliderCarousel from "./SliderCarousel";
import ContentGridFrontend from "./ContentGridFrontend";

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

function HeroBlock({ block, ctx }: { block: Block & { type: "hero" }; ctx: RegionContext }) {
  return styleScope(
    block,
    <section
      className="px-6 py-20 text-center"
      style={{ backgroundColor: block.props.bgColor, color: block.props.textColor }}
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
  );
}

function TextBlock({ block, ctx }: { block: Block & { type: "text" }; ctx: RegionContext }) {
  const alignCls =
    block.props.align === "center"
      ? "text-center"
      : block.props.align === "right"
        ? "text-right"
        : "text-left";
  return styleScope(
    block,
    <section className="px-6 py-10">
      <div
        className={`mx-auto max-w-3xl leading-relaxed text-zinc-700 rte-content ${alignCls}`}
        dangerouslySetInnerHTML={{ __html: renderLocalizedContent(block.props.content, ctx) }}
      />
    </section>,
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
    marginTop: p.margin?.top,
    marginRight: p.margin?.right,
    marginBottom: p.margin?.bottom,
    marginLeft: p.margin?.left,
    paddingTop: p.padding?.top,
    paddingRight: p.padding?.right,
    paddingBottom: p.padding?.bottom,
    paddingLeft: p.padding?.left,
    alignSelf: p.alignSelf,
    zIndex: p.zIndex,
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
    <div
      style={containerStyle}
      id={p.cssId || undefined}
      className={p.cssClasses || undefined}
    >
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
  );
}

function CtaBlock({ block, ctx }: { block: Block & { type: "cta" }; ctx: RegionContext }) {
  return styleScope(
    block,
    <section
      className="px-6 py-16 text-center"
      style={{ backgroundColor: block.props.bgColor }}
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
  );
}

function FeaturesBlock({ block, ctx }: { block: Block & { type: "features" }; ctx: RegionContext }) {
  const cols =
    block.props.columns === 2
      ? "sm:grid-cols-2"
      : block.props.columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return styleScope(
    block,
    <section className="px-6 py-16">
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
  );
}

function ButtonBlock({ block, ctx }: { block: Block & { type: "button" }; ctx: RegionContext }) {
  const alignCls =
    block.props.align === "center"
      ? "flex justify-center"
      : block.props.align === "right"
        ? "flex justify-end"
        : "flex justify-start";
  return styleScope(
    block,
    <section className="px-6 py-4">
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
  );
}

function EmbedBlock({ block }: { block: Block & { type: "embed" } }) {
  return (
    <section className="px-6 py-6">
      <div
        className="mx-auto max-w-6xl"
        dangerouslySetInnerHTML={{ __html: block.props.html }}
      />
    </section>
  );
}

function FaqBlock({ block, ctx }: { block: Block & { type: "faq" }; ctx: RegionContext }) {
  return styleScope(
    block,
    <section className="px-6 py-16">
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
    return styleScope(
      block,
      <section className="px-6 py-12">
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
    );
  }

  return styleScope(
    block,
    <section className="px-6 py-12">
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
  );
}

function SpacerBlock({ block }: { block: Block & { type: "spacer" } }) {
  return <div style={{ height: block.props.height }} />;
}

function DividerBlock() {
  return (
    <div className="px-6 py-4">
      <hr className="mx-auto max-w-3xl border-zinc-200" />
    </div>
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

  // Responsive hide classes
  const hideClasses = [
    p.hideOnDesktop ? "hidden lg:block" : "",
    p.hideOnTablet ? "hidden md:block" : "",
    p.hideOnMobile ? "hidden sm:block" : "",
  ].filter(Boolean).join(" ");

  // Width classes
  const widthCls = p.width === "full" ? "w-full" : p.width === "boxed" ? "mx-auto max-w-3xl" : p.width === "inline" ? "inline-block" : "";

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
  if (p.blendMode) headingStyle.mixBlendMode = p.blendMode;

  // Margin
  if (p.margin) {
    headingStyle.marginTop = p.margin.top || undefined;
    headingStyle.marginRight = p.margin.right || undefined;
    headingStyle.marginBottom = p.margin.bottom || undefined;
    headingStyle.marginLeft = p.margin.left || undefined;
  }

  // Padding
  if (p.padding) {
    headingStyle.paddingTop = p.padding.top || undefined;
    headingStyle.paddingRight = p.padding.right || undefined;
    headingStyle.paddingBottom = p.padding.bottom || undefined;
    headingStyle.paddingLeft = p.padding.left || undefined;
  }

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

  // Z-Index
  if (p.zIndex !== undefined) headingStyle.zIndex = p.zIndex;

  // Transform
  const transforms: string[] = [];
  if (p.rotateZ) transforms.push(`rotate(${p.rotateZ}deg)`);
  if (p.rotateX) transforms.push(`rotateX(${p.rotateX}deg)`);
  if (p.rotateY) transforms.push(`rotateY(${p.rotateY}deg)`);
  if (p.scaleX || p.scaleY) transforms.push(`scale(${p.scaleX || 1}, ${p.scaleY || 1})`);
  if (p.skewX) transforms.push(`skewX(${p.skewX}deg)`);
  if (p.skewY) transforms.push(`skewY(${p.skewY}deg)`);
  if (p.offsetX || p.offsetY) transforms.push(`translate(${p.offsetX || 0}px, ${p.offsetY || 0}px)`);
  if (p.flipH) transforms.push("scaleX(-1)");
  if (p.flipV) transforms.push("scaleY(-1)");
  if (transforms.length > 0) headingStyle.transform = transforms.join(" ");

  // Entrance animation
  const animStyle = p.entranceAnimation ? { animation: `${p.entranceAnimation} 0.6s ease-out` } : {};

  // Custom CSS scope ID
  const scopeClass = `pb-${block.id}`;

  const headingContent = (
    <Tag
      className={`${HEADING_SIZES[p.level]} ${alignCls} ${widthCls} ${hideClasses}`}
      style={headingStyle}
      id={p.cssId || undefined}
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

  return styleScope(
    block,
    <section className={`px-6 py-6 ${p.cssClasses || ""}`} style={animStyle}>
      {wrapped}
      {p.customCss && (
        <style dangerouslySetInnerHTML={{ __html: `.${scopeClass} { ${p.customCss.replace(/selector/g, `.${scopeClass}`)} }` }} />
      )}
    </section>,
  );
}

function ListBlock({ block, ctx }: { block: Block & { type: "list" }; ctx: RegionContext }) {
  const items = block.props.items
    .map((item) => renderLocalizedContent(item, ctx))
    .filter((item) => item.trim());
  if (items.length === 0) return null;

  return styleScope(
    block,
    <section className="px-6 py-6">
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
  );
}

function SliderBlock({ block }: { block: Block & { type: "slider" } }) {
  return styleScope(
    block,
    <section className="px-6 py-6">
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
  );
}

function ContentGridBlock({ block }: { block: Block & { type: "contentGrid" } }) {
  return styleScope(
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
  );
}

function SectionBlock({ block, ctx }: { block: SectionBlock; ctx: RegionContext }) {
  const bg = block.props.bgImage
    ? {
        backgroundColor: block.props.bgColor,
        backgroundImage: `url(${block.props.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : { backgroundColor: block.props.bgColor };
  return (
    <section
      style={{
        ...bg,
        color: block.props.textColor,
        paddingTop: block.props.paddingTop ?? 48,
        paddingBottom: block.props.paddingBottom ?? 48,
      }}
    >
      {block.props.rows.map((row) => (
        <RowBlock key={row.id} block={row} ctx={ctx} />
      ))}
    </section>
  );
}

function RowBlock({ block, ctx }: { block: RowBlock; ctx: RegionContext }) {
  const bg = block.props.bgImage
    ? {
        backgroundColor: block.props.bgColor,
        backgroundImage: `url(${block.props.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : { backgroundColor: block.props.bgColor };

  const rowWidth = block.props.width ?? (block.props.fullWidth ? "full" : "boxed");
  const isBoxed = rowWidth === "boxed";

  return (
    <section
      className="py-6"
      style={{
        ...bg,
        color: block.props.textColor,
        paddingTop: block.props.paddingY,
        paddingBottom: block.props.paddingY,
        minHeight: block.props.minHeight,
      }}
    >
      <div
        className="grid grid-cols-12 mx-auto"
        style={{
          gap: block.props.gap,
          alignItems: block.props.align,
          maxWidth: isBoxed ? (block.props.maxWidth ? `${block.props.maxWidth}px` : "var(--theme-max-width, 1200px)") : "100%",
        }}
      >
        {block.props.columns.map((column) => {
          const colBg = column.bgImage
            ? {
                backgroundColor: column.bgColor,
                backgroundImage: `url(${column.bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : { backgroundColor: column.bgColor };
          return (
            <div
              key={column.id}
              className={renderColumnSpanClass(
                resolveColumnWidths(column, block.props.stackOnMobile !== false),
              )}
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: column.justifyContent ?? "flex-start",
                alignItems: column.alignItems ?? "stretch",
                minHeight: column.minHeight,
                ...colBg,
              }}
            >
              <RenderBlocks blocks={column.blocks} ctx={ctx} />
            </div>
          );
        })}
      </div>
    </section>
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