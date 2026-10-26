"use client";

/**
 * Content Page Template Builder — Public Block Renderer
 *
 * Renders Topic/SubTopic single-page template blocks. Content-page blocks
 * (hero, content, sections, geo widget, sub-topic list, sidebar) render here;
 * standard blocks are delegated to the blog template renderer so both builders
 * share one implementation of the shared block library.
 */
import { createContext, useContext } from "react";
import Link from "next/link";
import type { Block, StyleBreakpoints } from "@/lib/page-builder/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { resolveColumnWidths, renderColumnSpanClass } from "@/lib/page-builder/spans";
import { styleScopeClass, renderStyleGuide, scopeDynamicStyle } from "@/lib/page-builder/style";
import { elementStylesNode, renderElementStyles, type ElementStyles } from "@/lib/page-builder/element-style";
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
import { SliderRegionProvider } from "../page-builder/ContentSliderFrontend";
import type { RegionContext } from "@/lib/localization/render";
import type { ContainerSettings, ContentPageKind, CpSidebarWidget } from "@/lib/content-page-template/types";
import {
  resolveCpBlockBindings,
  resolveCpPropsBindings,
  type ContentPageBindingData,
  type CpSectionItem,
  type CpGeoWidget,
  type CpSubTopicItem,
  type CpTopicLink,
} from "@/lib/content-page-template/bindings";

/* ── Content Page Data Context ────────────────────────────────────────────── */

export interface ContentPageContextValue {
  kind: ContentPageKind;
  binding?: ContentPageBindingData | null;
  sections?: CpSectionItem[];
  geo?: CpGeoWidget | null;
  subtopics?: CpSubTopicItem[];
  topic?: CpTopicLink | null;
  viewport?: "desktop" | "tablet" | "mobile";
}

export const ContentPageDataContext = createContext<ContentPageContextValue>({ kind: "topic" });

/* ── Style Scope Helper ───────────────────────────────────────────────────── */

function styleScope(block: Block, inner: React.ReactNode): React.ReactNode {
  const props = block.props as { style?: StyleBreakpoints; elementStyles?: ElementStyles };
  const css = renderStyleGuide(block.id, props.style);
  const elementCss = renderElementStyles(block.id, props.elementStyles);
  if (!css && !elementCss) return inner;
  return (
    <>
      {css ? <style>{css}</style> : null}
      {elementStylesNode(block.id, props.elementStyles)}
      <div className={styleScopeClass(block.id)}>{inner}</div>
    </>
  );
}

/* ── Row Renderer (binding-aware) ─────────────────────────────────────────── */

function CpRowRenderer({ block }: { block: Block }) {
  const { binding } = useContext(ContentPageDataContext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = resolveCpPropsBindings("row", block.props as Record<string, unknown>, binding) as any;

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
              const widths = resolveColumnWidths(col as never, p.stackOnMobile);
              const spanClass = renderColumnSpanClass(widths);
              const colStyle: React.CSSProperties = {
                backgroundColor: col.bgColor as string | undefined,
                backgroundImage: col.bgImage ? `url(${col.bgImage})` : undefined,
                backgroundPosition: col.bgImage ? ((col.bgPosition as string) || "center center") : undefined,
                backgroundSize: col.bgImage ? ((col.bgSize as string) || "cover") : undefined,
                backgroundRepeat: col.bgImage ? ((col.bgRepeat as string) || "no-repeat") : undefined,
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
                col.bgImage && col.overlayOpacity
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
                  <RenderCpBlocks blocks={col.blocks as Block[]} />
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

/* ── Content Page Leaf Renderers ──────────────────────────────────────────── */

function CpHeroRenderer({ block }: { block: Block }) {
  const { kind, binding, topic } = useContext(ContentPageDataContext);
  const p = block.props as {
    layout?: "standard" | "centered";
    showImage?: boolean;
    showBreadcrumb?: boolean;
    showDescription?: boolean;
    showAuthor?: boolean;
    heading?: string;
    subheading?: string;
    image?: string;
    bgColor?: string;
    textColor?: string;
  };

  const heading = p.heading || binding?.page?.title || (kind === "topic" ? "Topic" : "SubTopic");
  const descriptionHtml = p.subheading
    ? sanitizeHtml(p.subheading)
    : binding?.page?.description
      ? sanitizeHtml(binding.page.description)
      : binding?.page?.body
        ? sanitizeHtml(binding.page.body)
        : "";
  const imageSrc = p.image || binding?.heroImage || null;
  const author = binding?.page?.author ?? null;
  const centered = p.layout === "centered";
  const heroScoped = scopeDynamicStyle(`${block.id}-hero`, {
    backgroundColor: p.bgColor || undefined,
    color: p.textColor || undefined,
  });

  return (
    <BlockAdvancedFrame block={block}>
      <div className={`rounded-xl border border-zinc-200 bg-white ${centered ? "text-center" : ""} ${heroScoped.className}`.trim()}>
        {heroScoped.node}
        <div className="p-6 sm:p-8">
          {p.showBreadcrumb !== false && (
            <nav className={`mb-3 text-xs text-zinc-500 ${centered ? "text-center" : ""}`} aria-label="Breadcrumb" data-lp-el="breadcrumb">
              <Link href="/" className="hover:text-zinc-800">
                Directory
              </Link>
              {kind === "subtopic" && topic && (
                <>
                  {" / "}
                  <Link href={topic.url} className="hover:text-zinc-800">
                    {topic.title}
                  </Link>
                </>
              )}
              {" / "}
              <span className="text-zinc-700">{heading}</span>
            </nav>
          )}
          <h1 className={`text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl ${centered ? "mx-auto" : ""}`} data-lp-el="heading">
            {heading}
          </h1>
          {p.showAuthor !== false && author && (
            <p className={`mt-2 text-sm text-zinc-500 ${centered ? "mx-auto" : ""}`} data-lp-el="author">
              By {author}
            </p>
          )}
          {p.showDescription !== false && descriptionHtml && (
            <div
              className={`prose-sm mt-3 max-w-3xl text-zinc-700 ${centered ? "mx-auto" : ""}`}
              data-lp-el="description"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}
          {p.showImage !== false && imageSrc && (
            <figure className={`mt-5 ${centered ? "mx-auto max-w-3xl" : "max-w-3xl"}`} data-lp-el="image">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={binding?.heroImageAlt || binding?.page?.title || ""}
                  title={binding?.heroImageCaption || undefined}
                  className="h-full w-full object-cover"
                />
              </div>
              {binding?.heroImageCaption && (
                <figcaption className="mt-2 text-xs text-zinc-500">{binding.heroImageCaption}</figcaption>
              )}
            </figure>
          )}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

function CpContentRenderer({ block }: { block: Block }) {
  const { binding } = useContext(ContentPageDataContext);
  const p = block.props as {
    showHeading?: boolean;
    heading?: string;
    content?: string;
    maxWidth?: number;
  };
  const html = p.content
    ? sanitizeHtml(p.content)
    : binding?.page?.description
      ? sanitizeHtml(binding.page.description)
      : binding?.page?.body
        ? sanitizeHtml(binding.page.body)
        : "";
  if (!html) return null;
  const widthScoped = scopeDynamicStyle(`${block.id}-content`, {
    maxWidth: p.maxWidth ? `${p.maxWidth}px` : undefined,
  });

  return (
    <BlockAdvancedFrame block={block}>
      <div className={widthScoped.className || undefined}>
        {widthScoped.node}
        {p.showHeading && p.heading && (
          <h2 className="mb-3 text-xl font-semibold text-zinc-900" data-lp-el="heading">{p.heading}</h2>
        )}
        <div className="prose-sm text-zinc-700" data-lp-el="content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </BlockAdvancedFrame>
  );
}

function CpSectionsRenderer({ block }: { block: Block }) {
  const { sections } = useContext(ContentPageDataContext);
  const p = block.props as { showHeading?: boolean; heading?: string; emptyMessage?: string };
  const items = sections ?? [];
  if (items.length === 0) {
    if (!p.emptyMessage) return null;
    return (
      <BlockAdvancedFrame block={block}>
        <div className="py-4">
          {p.showHeading !== false && p.heading && (
            <h2 className="mb-4 text-xl font-semibold text-zinc-900" data-lp-el="heading">{p.heading}</h2>
          )}
          <p className="text-sm text-zinc-500">{p.emptyMessage}</p>
        </div>
      </BlockAdvancedFrame>
    );
  }

  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-4">
        {p.showHeading !== false && p.heading && (
          <h2 className="mb-4 text-xl font-semibold text-zinc-900" data-lp-el="heading">{p.heading}</h2>
        )}
        <div className="space-y-8">
          {items.map((section, i) => (
            <section key={i} data-lp-el="item">
              {section.title && (
                <h3 className="text-lg font-semibold text-zinc-900" data-lp-el="itemHeading">{section.title}</h3>
              )}
              <div
                className="prose-sm mt-3 text-zinc-700"
                data-lp-el="content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }}
              />
            </section>
          ))}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

function CpSidebarWidgetView({ widget, kind }: { widget: CpSidebarWidget; kind: ContentPageKind }) {
  const { sections = [], subtopics = [], geo, topic } = useContext(ContentPageDataContext);

  let body: React.ReactNode = null;
  if (widget.type === "sections") {
    body = sections.length ? (
      <ul className="space-y-1.5">
        {sections.map((s, i) => (
          <li key={i}>
            <span className="text-sm text-zinc-700">{s.title || `Section ${i + 1}`}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-zinc-400">No sections yet.</p>
    );
  } else if (widget.type === "subtopics") {
    const items = subtopics.slice(0, widget.limit ?? 5);
    body = items.length ? (
      <ul className="space-y-2">
        {items.map((st) => (
          <li key={st.id}>
            <Link href={st.url} className="block text-sm font-medium text-zinc-800 hover:text-amber-700">
              {st.title}
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-zinc-400">No related SubTopics yet.</p>
    );
  } else if (widget.type === "geoStates") {
    const states = (geo?.states ?? []).slice(0, widget.limit ?? 8);
    body = states.length ? (
      <ul className="space-y-1.5">
        {states.map((s) => (
          <li key={s.slug}>
            <Link href={s.url} className="text-sm text-zinc-700 hover:text-amber-700 hover:underline">
              {s.stateFull}
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-zinc-400">No locations yet.</p>
    );
  } else if (widget.type === "topic") {
    body = topic ? (
      <Link href={topic.url} className="text-sm font-medium text-zinc-800 hover:text-amber-700">
        {topic.title}
      </Link>
    ) : (
      <p className="text-xs text-zinc-400">—</p>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4" data-lp-el="widget">
      {widget.heading && (
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500" data-lp-el="widgetHeading">
          {widget.heading}
        </h3>
      )}
      {body}
      <span className="sr-only">{kind}</span>
    </div>
  );
}

function CpSidebarRenderer({ block }: { block: Block }) {
  const { kind } = useContext(ContentPageDataContext);
  const p = block.props as { widgets?: CpSidebarWidget[] };
  const widgets = p.widgets ?? [];
  if (widgets.length === 0) return null;

  return (
    <BlockAdvancedFrame block={block}>
      <aside className="space-y-4">
        {widgets.map((widget, index) => (
          <CpSidebarWidgetView key={`${widget.type}-${index}`} widget={widget} kind={kind} />
        ))}
      </aside>
    </BlockAdvancedFrame>
  );
}

function TopicGeoWidgetRenderer({ block }: { block: Block }) {
  const { geo } = useContext(ContentPageDataContext);
  const p = block.props as {
    heading?: string;
    showDescription?: boolean;
    showCount?: boolean;
    columns?: 2 | 3 | 4;
    showBrowseLink?: boolean;
    emptyMessage?: string;
  };
  if (!geo) {
    if (!p.emptyMessage) return null;
    return (
      <BlockAdvancedFrame block={block}>
        <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
          {p.emptyMessage}
        </p>
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
      <section className="rounded-xl border border-zinc-200 bg-white p-6" data-lp-el="container">
        <h2 className="text-xl font-semibold text-zinc-900" data-lp-el="heading">
          {p.heading || geo.title}
          {p.showCount && geo.states.length > 0 && (
            <span className="ml-2 text-sm font-normal text-zinc-500">({geo.states.length})</span>
          )}
        </h2>
        {p.showDescription !== false && geo.description && (
          <div
            className="prose-sm mt-2 max-w-3xl text-sm text-zinc-600"
            data-lp-el="description"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(geo.description) }}
          />
        )}
        {geo.states.length > 0 ? (
          <ul className={`mt-4 grid grid-cols-1 gap-3 ${colClass}`}>
            {geo.states.map((s) => (
              <li key={s.slug}>
                <Link
                  href={s.url}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-300"
                  data-lp-el="link"
                >
                  <span className="font-medium text-zinc-800">{s.stateFull}</span>
                  <span className="text-sm text-zinc-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {p.showBrowseLink !== false && (
          <Link
            href={geo.url}
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
            data-lp-el="link"
          >
            Browse {geo.title} ›
          </Link>
        )}
      </section>
    </BlockAdvancedFrame>
  );
}

function TopicSubTopicsRenderer({ block }: { block: Block }) {
  const { subtopics } = useContext(ContentPageDataContext);
  const p = block.props as {
    heading?: string;
    limit?: number;
    columnsDesktop?: 1 | 2 | 3;
    showDescription?: boolean;
    emptyMessage?: string;
  };
  const items = (subtopics ?? []).slice(0, p.limit ?? 12);
  if (items.length === 0) {
    if (!p.emptyMessage) return null;
    return (
      <BlockAdvancedFrame block={block}>
        <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
          {p.emptyMessage}
        </p>
      </BlockAdvancedFrame>
    );
  }

  const colClass =
    p.columnsDesktop === 1
      ? "sm:grid-cols-1"
      : p.columnsDesktop === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <BlockAdvancedFrame block={block}>
      <div className="py-4">
        {p.heading && (
          <h2 className="mb-4 text-xl font-semibold text-zinc-900" data-lp-el="heading">{p.heading}</h2>
        )}
        <div className={`grid grid-cols-1 gap-4 ${colClass}`} data-lp-el="grid">
          {items.map((st) => (
            <Link
              key={st.id}
              href={st.url}
              className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300"
              data-lp-el="card"
            >
              {st.image && (
                <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-md bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={st.image} alt={st.title} className="h-full w-full object-cover" />
                </div>
              )}
              <span className="font-medium text-zinc-800">{st.title}</span>
              {p.showDescription !== false && st.excerpt && (
                <span className="mt-1 text-sm text-zinc-500">{st.excerpt}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </BlockAdvancedFrame>
  );
}

function SubTopicTopicLinkRenderer({ block }: { block: Block }) {
  const { topic } = useContext(ContentPageDataContext);
  const p = block.props as { heading?: string; showDescription?: boolean };
  if (!topic) return null;

  return (
    <BlockAdvancedFrame block={block}>
      <nav className="rounded-lg border border-zinc-200 bg-white px-4 py-3" aria-label="Parent topic" data-lp-el="container">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500" data-lp-el="heading">
          {p.heading || "Part of"}
        </span>
        <Link href={topic.url} className="mt-1 block text-sm font-medium text-zinc-800 hover:text-amber-700" data-lp-el="link">
          {topic.title}
        </Link>
        {p.showDescription !== false && topic.description && (
          <p className="mt-1 text-sm text-zinc-500">{topic.description}</p>
        )}
      </nav>
    </BlockAdvancedFrame>
  );
}

/* ── Block Dispatch ───────────────────────────────────────────────────────── */

const CP_BLOCK_RENDERERS: Record<string, (props: { block: Block }) => React.ReactNode> = {
  cpHero: CpHeroRenderer,
  cpContent: CpContentRenderer,
  cpSections: CpSectionsRenderer,
  cpSidebar: CpSidebarRenderer,
  topicGeoWidget: TopicGeoWidgetRenderer,
  topicSubTopics: TopicSubTopicsRenderer,
  subtopicTopicLink: SubTopicTopicLinkRenderer,
};

function RenderCpBlocks({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((block) => <CpBlockRenderer key={block.id} block={block} />)}</>;
}

/**
 * Resolve bindings for a block and render it: containers and content-page
 * blocks render here; standard blocks delegate to the shared blog renderer.
 */
export function CpBlockRenderer({ block: sourceBlock }: { block: Block }) {
  const { binding } = useContext(ContentPageDataContext);
  const block = resolveCpBlockBindings(sourceBlock, binding);

  if (isRowBlock(block)) {
    return styleScope(block, <CpRowRenderer block={block} />);
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
      flexDirection: p.direction === "row" ? "row" : "column",
      justifyContent: p.justifyContent as React.CSSProperties["justifyContent"],
      alignItems: p.alignItems as React.CSSProperties["alignItems"],
      columnGap: p.gapCol as number,
      rowGap: p.gapRow as number,
      flexWrap: p.wrap === "wrap" ? "wrap" : undefined,
      ...getVerticalAlignStyle(p.verticalAlign as string, p.direction === "row" ? "row" : "column"),
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
          <RenderCpBlocks blocks={p.rows as Block[]} />
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

  const Renderer = CP_BLOCK_RENDERERS[block.type];
  if (Renderer) {
    return styleScope(block, <Renderer block={block} />);
  }

  // Standard blocks share the blog template renderer implementation.
  return <BlogTemplateBlockRenderer block={block} />;
}

/* ── Default Export (for site integration) ─────────────────────────────────── */

export default function ContentPageTemplateRenderer({
  blocks,
  containerSettings,
  kind,
  binding,
  sections,
  geo,
  subtopics,
  topic,
  viewport,
}: {
  blocks: Block[];
  containerSettings?: ContainerSettings;
  kind: ContentPageKind;
  binding?: ContentPageBindingData | null;
  sections?: CpSectionItem[];
  geo?: CpGeoWidget | null;
  subtopics?: CpSubTopicItem[];
  topic?: CpTopicLink | null;
  viewport?: "desktop" | "tablet" | "mobile";
}) {
  const outerStyle: React.CSSProperties = { width: "100%" };

  const regionCtx: RegionContext = binding
    ? {
        regionName: null,
        categoryName: binding.page?.title ?? undefined,
      }
    : {};

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
  const outerScoped = scopeDynamicStyle("cp-container-outer", outerStyle);
  const innerScoped = scopeDynamicStyle("cp-container-inner", { ...innerStyle, position: "relative", zIndex: 1 });
  const overlayScoped = scopeDynamicStyle("cp-container-overlay",
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

  const contextValue: ContentPageContextValue = {
    kind,
    binding,
    sections,
    geo,
    subtopics,
    topic,
    viewport,
  };

  return (
    <ContentPageDataContext.Provider value={contextValue}>
      <SliderRegionProvider value={regionCtx}>
        <div className={outerScoped.className || undefined}>
          {outerScoped.node}
          {overlayScoped.node}
          {overlayScoped.className ? (
            <div className={overlayScoped.className} aria-hidden="true" />
          ) : null}
          <div className={innerScoped.className || undefined}>
            {innerScoped.node}
            <RenderCpBlocks blocks={blocks} />
          </div>
        </div>
      </SliderRegionProvider>
    </ContentPageDataContext.Provider>
  );
}
