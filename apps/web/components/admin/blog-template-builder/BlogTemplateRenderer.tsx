"use client";

/**
 * Blog Template Builder — Public Block Renderer
 *
 * Renders blog template blocks for the public site. Reuses page builder
 * renderers for standard blocks, adds blog-specific renderers.
 */
import { createContext, useContext } from "react";
import Link from "next/link";
import type { Block } from "@/lib/page-builder/types";
import type { ContainerSettings } from "@/lib/blog-template/types";
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
} from "../page-builder/renderHelpers";

/* ── Blog Data Context ──────────────────────────────────────────────────── */

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  metaDesc: string | null;
  ogImage: string | null;
  createdAt: Date;
  category?: { slug: string; title: string } | null;
}

interface BlogDataContextValue {
  articles?: BlogArticle[];
  article?: BlogArticle;
  templateType?: "listing" | "single";
  viewport?: "desktop" | "tablet" | "mobile";
}

export const BlogDataContext = createContext<BlogDataContextValue>({});

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
  const rowClasses = [animClass, visClass, p.cssClasses].filter(Boolean).join(" ");

  const rowWidth = p.width ?? (p.fullWidth ? "full" : "boxed");
  if (rowWidth === "boxed") {
    rowStyle.maxWidth = p.maxWidth ? `${p.maxWidth}px` : "var(--theme-max-width, 1200px)";
    rowStyle.marginLeft = "auto";
    rowStyle.marginRight = "auto";
  }

  const RowTag = resolveTag(p.htmlTag, "div");

  return (
    <RowTag
      style={rowStyle}
      id={p.cssId || undefined}
      className={rowClasses || undefined}
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
              className={spanClass}
              style={colStyle}
              id={col.cssId || undefined}
            >
              {colOverlayStyle && <div style={colOverlayStyle} />}
              <RenderBlocks blocks={col.blocks as Block[]} />
            </div>
          );
        })}
      </div>
      {p.customCss && <style dangerouslySetInnerHTML={{ __html: p.customCss }} />}
    </RowTag>
  );
}

/* ── Standard Leaf Renderers ────────────────────────────────────────────── */

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

  const alignment = (p.alignment as string) ?? "left";
  const alignClass = alignment === "center" ? "mx-auto" : alignment === "right" ? "ml-auto" : "";

  return (
    <div>
      <figure className={alignClass}>
        <img src={p.src as string} alt={(p.alt as string) || ""} className="w-full" />
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

function VideoRenderer({ block }: { block: Block }) {
  const p = block.props as { source: string; link: string; aspectRatio?: string };
  return (
    <div className="py-4">
      <p className="text-sm text-zinc-500">Video placeholder ({p.source})</p>
    </div>
  );
}

/* ── Blog-Specific Renderers ────────────────────────────────────────────── */

function BlogPostGridRenderer({ block }: { block: Block }) {
  const { articles, viewport } = useContext(BlogDataContext);
  const p = block.props as Record<string, unknown>;
  const heading = (p.heading as string) || "Latest Posts";
  const layout = (p.layout as string) || "grid";
  const columnsDesktop = (p.columnsDesktop as number) || (p.columns as number) || 3;
  const columnsTablet = (p.columnsTablet as number) || columnsDesktop;
  const columnsMobile = (p.columnsMobile as number) || 1;
  const showExcerpt = p.showExcerpt !== false;
  const showFeaturedImage = p.showFeaturedImage !== false;
  const showAuthor = p.showAuthor !== false;
  const showDate = p.showDate !== false;
  const showCategory = p.showCategory !== false;

  const COL_CLASS: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
  };
  const SM_COL_CLASS: Record<number, string> = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
  };
  const LG_COL_CLASS: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
  };

  const activeColumns = viewport === "mobile"
    ? columnsMobile
    : viewport === "tablet"
      ? columnsTablet
      : columnsDesktop;

  const colClass = viewport
    ? COL_CLASS[activeColumns] ?? "grid-cols-3"
    : `${COL_CLASS[columnsMobile] ?? "grid-cols-1"} ${SM_COL_CLASS[columnsTablet] ?? "sm:grid-cols-1"} ${LG_COL_CLASS[columnsDesktop] ?? "lg:grid-cols-3"}`;

  const posts = articles && articles.length > 0
    ? articles.map((a) => ({
        id: a.id,
        title: a.title,
        excerpt: a.metaDesc || "",
        image: a.ogImage || "",
        author: "Author",
        date: new Date(a.createdAt).toLocaleDateString(),
        category: a.category?.title || "",
        slug: a.slug,
      }))
    : Array.from({ length: 6 }, (_, i) => ({
        id: `placeholder-${i}`,
        title: `Blog Post Title ${i + 1}`,
        excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        image: "",
        author: "Author Name",
        date: "Jan 1, 2025",
        category: "Category",
        slug: "#",
      }));

  return (
    <div className="py-8">
      {heading && <h2 className="mb-6 text-2xl font-bold text-zinc-900">{heading}</h2>}
      <div className={layout === "list" ? "space-y-6" : `grid gap-6 ${colClass}`}>
        {posts.map((post) => (
          <article key={post.id} className="group rounded-lg border border-zinc-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
            {showFeaturedImage && post.image && (
              <Link href={`/article/${post.slug}`}>
                <img src={post.image} alt={post.title} className="aspect-video w-full object-cover" />
              </Link>
            )}
            {showFeaturedImage && !post.image && (
              <div className="aspect-video bg-zinc-100" />
            )}
            <div className="p-4">
              {showCategory && post.category && (
                <span className="text-xs font-medium text-amber-600">{post.category}</span>
              )}
              <h3 className="mt-1 text-lg font-semibold text-zinc-900 group-hover:text-amber-600 transition-colors">
                <Link href={`/article/${post.slug}`}>{post.title}</Link>
              </h3>
              {showExcerpt && post.excerpt && (
                <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{post.excerpt}</p>
              )}
              {(showAuthor || showDate) && (
                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                  {showAuthor && <span>{post.author}</span>}
                  {showDate && <span>{post.date}</span>}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function BlogSidebarRenderer({ block }: { block: Block }) {
  const p = block.props as { widgets: Array<{ type: string; heading?: string; limit?: number }> };
  const widgets = p.widgets ?? [];

  return (
    <aside className="space-y-6">
      {widgets.map((widget, i) => (
        <div key={i} className="rounded-lg border border-zinc-200 bg-white p-4">
          {widget.heading && (
            <h3 className="mb-3 text-sm font-bold text-zinc-900">{widget.heading}</h3>
          )}
          {widget.type === "search" && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search..."
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                Search
              </button>
            </div>
          )}
          {widget.type === "categories" && (
            <ul className="space-y-2 text-sm">
              {["Technology", "Design", "Business", "Marketing", "Development"].map((cat) => (
                <li key={cat}>
                  <a href="#" className="text-zinc-600 hover:text-amber-600 transition-colors">
                    {cat}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {widget.type === "recentPosts" && (
            <ul className="space-y-3 text-sm">
              {["Recent Post One", "Recent Post Two", "Recent Post Three"].map((title) => (
                <li key={title}>
                  <a href="#" className="font-medium text-zinc-900 hover:text-amber-600 transition-colors">
                    {title}
                  </a>
                  <p className="text-xs text-zinc-500">Jan 1, 2025</p>
                </li>
              ))}
            </ul>
          )}
          {widget.type === "tags" && (
            <div className="flex flex-wrap gap-2">
              {["React", "Next.js", "TypeScript", "Tailwind", "Design"].map((tag) => (
                <a
                  key={tag}
                  href="#"
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 transition-colors"
                >
                  {tag}
                </a>
              ))}
            </div>
          )}
          {widget.type === "custom" && (
            <div className="text-sm text-zinc-500">
              Custom HTML content
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}

function ArticleContentRenderer({ block }: { block: Block }) {
  const { article } = useContext(BlogDataContext);
  const p = block.props as Record<string, unknown>;
  const showTitle = p.showTitle !== false;
  const showMeta = p.showMeta !== false;
  const showAuthor = p.showAuthor !== false;
  const showDate = p.showDate !== false;
  const showCategory = p.showCategory !== false;
  const showFeaturedImage = p.showFeaturedImage !== false;
  const showSocialShare = p.showSocialShare !== false;
  const showNavigation = p.showNavigation !== false;
  const maxWidth = (p.maxWidth as number) || 720;

  const title = article?.title || "Article Title Placeholder";
  const body = article?.body || "<p>Article content will be injected server-side. This is a placeholder showing the layout and structure of the article content area.</p>";
  const category = article?.category?.title;
  const date = article?.createdAt ? new Date(article.createdAt).toLocaleDateString() : "January 1, 2025";
  const image = article?.ogImage;

  return (
    <article style={{ maxWidth }} className="mx-auto">
      {showCategory && category && (
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          {category}
        </span>
      )}
      {showTitle && (
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">
          {title}
        </h1>
      )}
      {showMeta && (
        <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
          {showAuthor && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-zinc-200" />
              <span>Author</span>
            </div>
          )}
          {showDate && <span>{date}</span>}
        </div>
      )}
      {showFeaturedImage && image && (
        <img src={image} alt={title} className="mt-6 w-full rounded-lg object-cover" style={{ maxHeight: 400 }} />
      )}
      {showFeaturedImage && !image && (
        <div className="mt-6 aspect-video rounded-lg bg-zinc-100" />
      )}
      <div
        className="prose prose-zinc mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: body ?? "" }}
      />
      {showSocialShare && (
        <div className="mt-8 flex items-center gap-4 border-t border-zinc-200 pt-6">
          <span className="text-sm font-medium text-zinc-700">Share:</span>
          <div className="flex gap-2">
            {["Twitter", "Facebook", "LinkedIn"].map((platform) => (
              <a
                key={platform}
                href="#"
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                {platform}
              </a>
            ))}
          </div>
        </div>
      )}
      {showNavigation && (
        <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6">
          <a href="#" className="text-sm text-zinc-600 hover:text-amber-600 transition-colors">
            ← Previous Article
          </a>
          <a href="#" className="text-sm text-zinc-600 hover:text-amber-600 transition-colors">
            Next Article →
          </a>
        </div>
      )}
    </article>
  );
}

function ArticleHeroRenderer({ block }: { block: Block }) {
  const { article } = useContext(BlogDataContext);
  const p = block.props as Record<string, unknown>;
  const layout = (p.layout as string) || "standard";
  const showBreadcrumb = p.showBreadcrumb !== false;
  const showCategory = p.showCategory !== false;
  const showAuthor = p.showAuthor !== false;
  const showDate = p.showDate !== false;

  const title = article?.title || "Article Title Placeholder";
  const category = article?.category?.title;
  const date = article?.createdAt ? new Date(article.createdAt).toLocaleDateString() : "January 1, 2025";

  return (
    <div
      className={`py-12 ${layout === "centered" ? "text-center" : ""}`}
      style={{
        backgroundColor: (p.bgColor as string) || undefined,
        color: (p.textColor as string) || undefined,
      }}
    >
      {showBreadcrumb && (
        <nav className="mb-4 text-sm text-zinc-500">
          <a href="/" className="hover:text-amber-600 transition-colors">Home</a>
          <span className="mx-2">/</span>
          <a href="/blog" className="hover:text-amber-600 transition-colors">Blog</a>
          <span className="mx-2">/</span>
          <span className="text-zinc-700">{title}</span>
        </nav>
      )}
      {showCategory && category && (
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          {category}
        </span>
      )}
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">
        {title}
      </h1>
      {(showAuthor || showDate) && (
        <div className={`mt-4 flex items-center gap-4 text-sm text-zinc-500 ${layout === "centered" ? "justify-center" : ""}`}>
          {showAuthor && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-zinc-200" />
              <span>Author</span>
            </div>
          )}
          {showDate && <span>{date}</span>}
        </div>
      )}
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
  video: VideoRenderer,
  blogPostGrid: BlogPostGridRenderer,
  blogSidebar: BlogSidebarRenderer,
  articleContent: ArticleContentRenderer,
  articleHero: ArticleHeroRenderer,
};

/* ── Render Blocks ────────────────────────────────────────────────────── */

function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block) => (
        <BlogTemplateBlockRenderer key={block.id} block={block} />
      ))}
    </>
  );
}

/* ── Main Block Renderer ──────────────────────────────────────────────── */

export function BlogTemplateBlockRenderer({ block }: { block: Block }) {
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
    };

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
    };

    const heightStyle = getHeightStyle(p.height, p.minHeight);
    if (heightStyle) Object.assign(outerStyle, heightStyle);

    const animClass = getEntranceAnimationClass(p.entranceAnimation);
    const visClass = getVisibilityClasses({
      hideOnDesktop: p.hideOnDesktop,
      hideOnTablet: p.hideOnTablet,
      hideOnMobile: p.hideOnMobile,
    });
    const sectionClasses = ["pb-section", animClass, visClass, p.cssClasses].filter(Boolean).join(" ");

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
      ...getVerticalAlignStyle(p.verticalAlign),
      ...getTypographyScopeStyle({
        headingColor: p.headingColor,
        textColor: p.textColor,
        linkColor: p.linkColor,
        linkHoverColor: p.linkHoverColor,
        textAlign: p.textAlign,
      }),
    };

    return (
      <SectionTag
        style={outerStyle}
        id={p.cssId || undefined}
        className={sectionClasses || undefined}
      >
        {renderOverlay({ overlayColor: p.overlayColor, overlayOpacity: p.overlayOpacity })}
        {renderShapeDivider("top", p.shapeDividerTop, p.shapeDividerTopColor, p.shapeDividerTopWidth, p.shapeDividerTopHeight)}
        {renderShapeDivider("bottom", p.shapeDividerBottom, p.shapeDividerBottomColor, p.shapeDividerBottomWidth, p.shapeDividerBottomHeight)}
        <div style={innerStyle}>
          <RenderBlocks blocks={p.rows as Block[]} />
        </div>
        {p.customCss && <style dangerouslySetInnerHTML={{ __html: p.customCss }} />}
      </SectionTag>
    );
  }

  const Renderer = BLOCK_RENDERERS[block.type];
  if (Renderer) {
    return styleScope(block, <Renderer block={block} />);
  }

  return null;
}

/* ── Default Export (for site integration) ─────────────────────────────── */

export default function BlogTemplateRenderer({
  blocks,
  containerSettings,
  articles,
  article,
  templateType,
  viewport,
}: {
  blocks: Block[];
  containerSettings?: ContainerSettings;
  articles?: BlogArticle[];
  article?: BlogArticle;
  templateType?: "listing" | "single";
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
    innerStyle.maxWidth = containerSettings.width === "boxed" ? containerSettings.maxWidth : "100%";
    innerStyle.margin = containerSettings.width === "boxed" ? "0 auto" : undefined;
    innerStyle.minHeight = containerSettings.minHeight || undefined;
    innerStyle.zIndex = containerSettings.zindex || undefined;
  }

  return (
    <BlogDataContext.Provider value={{ articles, article, templateType, viewport }}>
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
    </BlogDataContext.Provider>
  );
}
