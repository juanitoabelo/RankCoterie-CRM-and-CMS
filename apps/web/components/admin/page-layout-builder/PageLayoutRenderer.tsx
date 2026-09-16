"use client";

/**
 * Page Layout Builder — Public Block Renderer
 *
 * Renders page layout blocks for the public site. Reuses page builder
 * renderers for standard blocks.
 */
import Link from "next/link";
import type { Block } from "@/lib/page-builder/types";
import type { PageLayoutBlock, ContainerSettings } from "@/lib/page-layout/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { resolveColumnWidths, renderColumnSpanClass } from "@/lib/page-builder/spans";
import { styleScopeClass, renderStyleGuide } from "@/lib/page-builder/style";
import type { StyleBreakpoints } from "@/lib/page-builder/types";

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
  const p = block.props as {
    columns: Array<{
      id: string;
      span: number;
      spanMd?: number;
      spanSm?: number;
      blocks: Block[];
      bgColor?: string;
      bgImage?: string;
      bgPosition?: string;
      bgSize?: string;
      bgRepeat?: string;
      overlayColor?: string;
      overlayOpacity?: number;
      borderStyle?: string;
      borderWidth?: number;
      borderColor?: string;
      borderRadius?: number;
      boxShadow?: string;
      margin?: { top: number; right: number; bottom: number; left: number };
      padding?: { top: number; right: number; bottom: number; left: number };
      zindex?: number;
      cssId?: string;
      cssClasses?: string;
    }>;
    gap: number;
    align: string;
    stackOnMobile: boolean;
    paddingY: number;
    fullWidth: boolean;
    bgColor?: string;
    bgImage?: string;
    bgPosition?: string;
    bgSize?: string;
    bgRepeat?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    textColor?: string;
    direction?: string;
    justifyContent?: string;
    gapRow?: number;
    wrap?: string;
    borderStyle?: string;
    borderWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    boxShadow?: string;
    margin?: { top: number; right: number; bottom: number; left: number };
    padding?: { top: number; right: number; bottom: number; left: number };
    zindex?: number;
    cssId?: string;
    cssClasses?: string;
  };

  const rowStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: p.bgColor,
    backgroundImage: p.bgImage ? `url(${p.bgImage})` : undefined,
    backgroundPosition: p.bgPosition,
    backgroundSize: p.bgSize,
    backgroundRepeat: p.bgRepeat,
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
    minHeight: p.minHeight,
  };

  const overlayStyle: React.CSSProperties | undefined = p.bgImage && p.overlayOpacity
    ? {
        position: "absolute",
        inset: 0,
        backgroundColor: p.overlayColor || "#000000",
        opacity: p.overlayOpacity / 100,
        pointerEvents: "none",
      }
    : undefined;

  // Content Width: apply boxed or full-width constraints
  const rowWidth = p.width ?? (p.fullWidth ? "full" : "boxed");
  if (rowWidth === "boxed") {
    rowStyle.maxWidth = p.maxWidth ? `${p.maxWidth}px` : "var(--theme-max-width, 1200px)";
    rowStyle.marginLeft = "auto";
    rowStyle.marginRight = "auto";
  }

  return (
    <div
      style={rowStyle}
      id={p.cssId || undefined}
      className={p.cssClasses || undefined}
    >
      {overlayStyle && <div style={overlayStyle} />}
      <div
        className="grid grid-cols-12"
        style={{ gap: p.gap, rowGap: p.gapRow, alignItems: p.align, flexDirection: p.direction === "column" ? "column" : undefined, flexWrap: p.wrap === "wrap" ? "wrap" : undefined }}
      >
        {p.columns.map((col) => {
          const widths = resolveColumnWidths(col, p.stackOnMobile);
          const spanClass = renderColumnSpanClass(widths);
          const colStyle: React.CSSProperties = {
            backgroundColor: col.bgColor,
            backgroundImage: col.bgImage ? `url(${col.bgImage})` : undefined,
            backgroundPosition: col.bgPosition,
            backgroundSize: col.bgSize,
            backgroundRepeat: col.bgRepeat,
            borderStyle: col.borderStyle !== "none" ? col.borderStyle : undefined,
            borderWidth: col.borderWidth,
            borderColor: col.borderColor,
            borderRadius: col.borderRadius,
            boxShadow: col.boxShadow,
            marginTop: col.margin?.top,
            marginRight: col.margin?.right,
            marginBottom: col.margin?.bottom,
            marginLeft: col.margin?.left,
            paddingTop: col.padding?.top,
            paddingRight: col.padding?.right,
            paddingBottom: col.padding?.bottom,
            paddingLeft: col.padding?.left,
            zIndex: col.zindex || undefined,
            position: "relative" as const,
            display: "flex",
            flexDirection: "column",
            justifyContent: col.justifyContent ?? "flex-start",
            alignItems: col.alignItems ?? "stretch",
            minHeight: col.minHeight,
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
              className={spanClass}
              style={colStyle}
              id={col.cssId || undefined}
            >
              {colOverlayStyle && <div style={colOverlayStyle} />}
              <RenderBlocks blocks={col.blocks as PageLayoutBlock[]} />
            </div>
          );
        })}
      </div>
    </div>
  );
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

  const hideClasses = [
    p.hideOnDesktop ? "hidden lg:block" : "",
    p.hideOnTablet ? "hidden md:block" : "",
    p.hideOnMobile ? "hidden sm:block" : "",
  ].filter(Boolean).join(" ");

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
  if (p.blendMode) headingStyle.mixBlendMode = p.blendMode as string;

  if (p.margin) {
    const m = p.margin as Record<string, string>;
    headingStyle.marginTop = m.top || undefined;
    headingStyle.marginRight = m.right || undefined;
    headingStyle.marginBottom = m.bottom || undefined;
    headingStyle.marginLeft = m.left || undefined;
  }

  if (p.padding) {
    const pad = p.padding as Record<string, string>;
    headingStyle.paddingTop = pad.top || undefined;
    headingStyle.paddingRight = pad.right || undefined;
    headingStyle.paddingBottom = pad.bottom || undefined;
    headingStyle.paddingLeft = pad.left || undefined;
  }

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
  if (p.zIndex !== undefined) headingStyle.zIndex = p.zIndex as number;

  if (p.bgImage) {
    headingStyle.backgroundImage = `url(${p.bgImage})`;
    headingStyle.backgroundPosition = (p.bgPosition as string) || "center center";
    headingStyle.backgroundSize = (p.bgSize as string) || "cover";
    headingStyle.backgroundRepeat = (p.bgRepeat as string) || "no-repeat";
  }

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

  const animStyle = p.entranceAnimation ? { animation: `${p.entranceAnimation} 0.6s ease-out` } : {};

  const headingContent = (
    <Tag
      className={`${HEADING_SIZES[level as keyof typeof HEADING_SIZES] || HEADING_SIZES[2]} ${alignCls} ${widthCls} ${hideClasses}`}
      style={headingStyle}
      id={(p.cssId as string) || undefined}
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
    <div className={(p.cssClasses as string) || ""} {...animStyle}>
      {wrapped}
    </div>
  );
}

function TextRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  return (
    <div
      style={{
        textAlign: (p.align as React.CSSProperties["textAlign"]) || undefined,
        color: (p.textColor as string) || undefined,
      }}
      dangerouslySetInnerHTML={{ __html: p.content as string }}
    />
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

  const marginToCss = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "number") return v === 0 ? undefined : `${v}px`;
    if (typeof v === "string") return v || undefined;
    return undefined;
  };

  const alignment = (p.alignment as string) ?? "left";
  const alignClass = alignment === "center" ? "mx-auto" : alignment === "right" ? "ml-auto" : "";

  const containerStyle: React.CSSProperties = {
    marginTop: marginToCss(p.margin?.top),
    marginRight: marginToCss(p.margin?.right),
    marginBottom: marginToCss(p.margin?.bottom),
    marginLeft: marginToCss(p.margin?.left),
    paddingTop: marginToCss(p.padding?.top),
    paddingRight: marginToCss(p.padding?.right),
    paddingBottom: marginToCss(p.padding?.bottom),
    paddingLeft: marginToCss(p.padding?.left),
  };

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
    <div style={containerStyle}>
      <figure className={alignClass}>
        <img src={p.src as string} alt={(p.alt as string) || ""} style={imgStyle} className="hover:opacity-75" />
        {(p.caption as string) && (
          <figcaption className="mt-2 text-center text-sm text-zinc-500">
            {p.caption as string}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

function ButtonRenderer({ block }: { block: Block }) {
  const p = block.props as { text: string; url: string; align: string; variant: string };
  return (
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
  );
}

function SpacerRenderer({ block }: { block: Block }) {
  const p = block.props as { height: number };
  return <div style={{ height: p.height }} />;
}

function DividerRenderer() {
  return <hr className="border-zinc-200" />;
}

function EmbedRenderer({ block }: { block: Block }) {
  const p = block.props as { html: string };
  return <div dangerouslySetInnerHTML={{ __html: p.html }} />;
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
    );
  }

  return (
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
  );
}

function HeroRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; subheading: string; bgColor: string; textColor: string };
  return (
    <div
      className="py-16 text-center"
      style={{ backgroundColor: p.bgColor, color: p.textColor }}
    >
      <h1 className="text-4xl font-bold">{p.heading}</h1>
      <p className="mt-4 text-lg opacity-80" dangerouslySetInnerHTML={{ __html: p.subheading }} />
    </div>
  );
}

function CtaRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; body: string; buttonText: string; buttonUrl: string; bgColor: string };
  return (
    <div className="py-12 text-center" style={{ backgroundColor: p.bgColor }}>
      <h2 className="text-2xl font-bold">{p.heading}</h2>
      <p className="mt-2 text-zinc-600">{p.body}</p>
      <a href={p.buttonUrl} className="mt-4 inline-block btn px-6 py-3 text-sm font-medium">
        {p.buttonText}
      </a>
    </div>
  );
}

function FeaturesRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; items: Array<{ icon: string; title: string; description: string }>; columns: number };
  const colClass = p.columns === 2 ? "sm:grid-cols-2" : p.columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
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
  );
}

function FaqRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; items: Array<{ question: string; answer: string }> };
  return (
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
  );
}

function ListRenderer({ block }: { block: Block }) {
  const p = block.props as { ordered: boolean; items: string[] };
  const Tag = p.ordered ? "ol" : "ul";
  return (
    <Tag className="list-inside list-disc space-y-1">
      {p.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}

function ContentGridRenderer({ block }: { block: Block }) {
  const p = block.props as { heading: string; columns: number };
  return (
    <div className="py-8">
      {p.heading && <h2 className="mb-6 text-2xl font-bold">{p.heading}</h2>}
      <p className="text-sm text-zinc-500">Content grid placeholder</p>
    </div>
  );
}

function SliderRenderer({ block }: { block: Block }) {
  const p = block.props as { slides: Array<{ src: string; alt: string; title: string }> };
  return (
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
    };

    const outerStyle: React.CSSProperties = {
      width: "100%",
      backgroundColor: p.bgColor,
      backgroundImage: p.bgImage ? `url(${p.bgImage})` : undefined,
      backgroundPosition: p.bgPosition,
      backgroundSize: p.bgSize || "cover",
      backgroundRepeat: p.bgRepeat,
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
    };

    const innerStyle: React.CSSProperties = {
      maxWidth: p.width === "boxed" ? p.maxWidth : "100%",
      margin: p.width === "boxed" ? "0 auto" : undefined,
      minHeight: p.minHeight || undefined,
      display: "flex",
      flexDirection: p.direction === "column" ? "column" : "row",
      justifyContent: p.justifyContent,
      alignItems: p.alignItems,
      columnGap: p.gapCol,
      rowGap: p.gapRow,
      flexWrap: p.wrap === "wrap" ? "wrap" : undefined,
    };

    const overlayStyle: React.CSSProperties | undefined = p.bgImage && p.overlayOpacity
      ? {
          position: "absolute",
          inset: 0,
          backgroundColor: p.overlayColor || "#000000",
          opacity: p.overlayOpacity / 100,
          pointerEvents: "none",
        }
      : undefined;

    return (
      <div
        style={outerStyle}
        id={p.cssId || undefined}
        className={p.cssClasses || undefined}
      >
        {overlayStyle && <div style={overlayStyle} />}
        <div style={innerStyle}>
          <RenderBlocks blocks={p.rows as PageLayoutBlock[]} />
        </div>
      </div>
    );
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
    outerStyle.backgroundPosition = containerSettings.bgPosition;
    outerStyle.backgroundSize = containerSettings.bgSize;
    outerStyle.backgroundRepeat = containerSettings.bgRepeat;
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
        <RenderBlocks blocks={blocks} />
      </div>
    </div>
  );
}
