"use client";

/**
 * Shared content-block renderers.
 *
 * Every new "shared" block type (pricing, stats, gallery, …) is rendered here
 * exactly once. The page builder, blog, geo, listing, product, header/footer and
 * page-layout renderers all delegate to `SHARED_RENDERERS` via `renderSharedBlock`,
 * so a block only ever needs one implementation.
 */
import React, { useEffect, useMemo, useState } from "react";
import type {
  Block,
  StyleBreakpoints,
  PricingBlock,
  LeadFormBlock,
  StatsBlock,
  LogosBlock,
  TabsBlock,
  SearchHeroBlock,
  ListingCategoriesBlock,
  FeaturedListingsBlock,
  MapListingsBlock,
  TocBlock,
  RelatedPostsBlock,
  AuthorBioBlock,
  ShareButtonsBlock,
  PostMetaBlock,
  NewsletterBlock,
  ProductCategoriesBlock,
  ProductSpotlightBlock,
  AnnouncementBlock,
  BreadcrumbsBlock,
  SocialLinksBlock,
  CountdownBlock,
  GalleryBlock,
  StepsBlock,
  ShapeDividerBlock,
  ReviewsBlock,
  RelatedListingsBlock,
  BusinessInfoBlock,
  FacetBarBlock,
  ComparisonTableBlock,
  TeamBlock,
} from "@/lib/page-builder/types";
import { renderLocalizedContent, type RegionContext } from "@/lib/localization/render";
import { renderStyleGuide, styleScopeClass } from "@/lib/page-builder/style";
import { elementStylesNode, renderElementStyles, type ElementStyles } from "@/lib/page-builder/element-style";
import { getSectionPaddingStyle } from "../renderHelpers";
import { BlockAdvancedFrame } from "../advanced-ui";

interface RenderProps {
  block: Block;
  ctx: RegionContext;
}

/* ── Shared shell: advanced frame + per-breakpoint style scope + padding ───── */

function Leaf({
  block,
  children,
  padded = true,
  className,
}: {
  block: Block;
  children: React.ReactNode;
  padded?: boolean;
  className?: string;
}) {
  const props = block.props as {
    style?: StyleBreakpoints;
    elementStyles?: ElementStyles;
    padding?: Record<string, number | string>;
  };
  const css = renderStyleGuide(block.id, props.style);
  const elementCss = renderElementStyles(block.id, props.elementStyles);
  const padding = padded ? getSectionPaddingStyle(props.padding as never) : undefined;

  const inner = (
    <section
      className={`px-4 sm:px-6 ${padded ? "py-8" : ""} ${className ?? ""}`.trim()}
      style={padding}
      data-shared-block={block.type}
    >
      {children}
    </section>
  );

  const wrapped =
    !css && !elementCss ? (
      inner
    ) : (
      <>
        {css ? <style>{css}</style> : null}
        {elementStylesNode(block.id, props.elementStyles)}
        <div className={styleScopeClass(block.id)}>{inner}</div>
      </>
    );

  return <BlockAdvancedFrame block={block}>{wrapped}</BlockAdvancedFrame>;
}

function Heading({ text, ctx, center }: { text: string; ctx: RegionContext; center?: boolean }) {
  if (!text) return null;
  return (
    <h2
      className={`text-2xl font-bold text-zinc-900 ${center ? "text-center" : ""}`}
      data-lp-el="heading"
    >
      {renderLocalizedContent(text, ctx)}
    </h2>
  );
}

function cols(count: number): string {
  switch (count) {
    case 2:
      return "sm:grid-cols-2";
    case 4:
      return "sm:grid-cols-2 lg:grid-cols-4";
    case 5:
      return "sm:grid-cols-3 lg:grid-cols-5";
    case 6:
      return "sm:grid-cols-3 lg:grid-cols-6";
    case 1:
      return "sm:grid-cols-1";
    default:
      return "sm:grid-cols-2 lg:grid-cols-3";
  }
}

/** Public helper so template renderers can mount a shared block directly. */
export function renderSharedBlock(block: Block, ctx: RegionContext = {}): React.ReactNode {
  const Renderer = SHARED_RENDERERS[block.type];
  if (!Renderer) return null;
  return <Renderer block={block} ctx={ctx} />;
}

/* ── Pricing ───────────────────────────────────────────────────────────────── */

function PricingView({ block, ctx }: { block: PricingBlock; ctx: RegionContext }) {
  const p = block.props;
  const plans = (p.plans ?? []).slice(0, p.columns || 3);
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl text-center">
        <Heading text={p.heading} ctx={ctx} center />
        {p.subheading ? (
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-600" data-lp-el="subheading">
            {renderLocalizedContent(p.subheading, ctx)}
          </p>
        ) : null}
        <div className={`mt-8 grid grid-cols-1 gap-6 ${cols(p.columns)}`}>
          {plans.map((plan) => {
            const features = (plan.features ?? "")
              .split("\n")
              .map((f) => f.trim())
              .filter(Boolean);
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-xl border p-6 text-left ${
                  plan.featured ? "border-zinc-900 shadow-lg" : "border-zinc-200"
                }`}
                data-lp-el="item"
              >
                {plan.featured ? (
                  <span className="mb-2 self-start rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Popular
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                {plan.description ? <p className="mt-1 text-xs text-zinc-500">{plan.description}</p> : null}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-900">
                    {p.currency}
                    {plan.price}
                  </span>
                  <span className="text-sm text-zinc-500">{p.period}</span>
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-600">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-zinc-900">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.ctaText ? (
                  <a
                    href={plan.ctaUrl || "#"}
                    className={`mt-6 inline-block rounded-lg px-4 py-2 text-center text-sm font-medium ${
                      plan.featured
                        ? "bg-zinc-900 text-white hover:bg-zinc-700"
                        : "border border-zinc-300 text-zinc-900 hover:bg-zinc-50"
                    }`}
                    data-lp-el="button"
                  >
                    {renderLocalizedContent(plan.ctaText, ctx)}
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Lead / contact form ───────────────────────────────────────────────────── */

function LeadFormView({ block, ctx }: { block: LeadFormBlock; ctx: RegionContext }) {
  const p = block.props;
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-xl">
        <Heading text={p.heading} ctx={ctx} />
        {p.subheading ? (
          <p className="mt-3 text-sm text-zinc-600" data-lp-el="subheading">
            {renderLocalizedContent(p.subheading, ctx)}
          </p>
        ) : null}
        <form action="/api/leads" method="post" className="mt-6 space-y-4" data-lp-el="form" data-recaptcha>
          <input type="hidden" name="source" value="contact" />
          <input type="hidden" name="redirectTo" value="/" />
          <input type="text" name="name" required placeholder="Your name" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <input type="email" name="email" required placeholder="Email address" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          {p.showPhone ? (
            <input type="tel" name="phone" placeholder="Phone (optional)" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          ) : null}
          {p.showCompany ? (
            <input type="text" name="subject" placeholder="Company (optional)" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          ) : null}
          {p.showMessage ? (
            <textarea name="message" required rows={4} placeholder="How can we help?" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          ) : null}
          <button type="submit" className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700" data-lp-el="button">
            {renderLocalizedContent(p.submitLabel, ctx) || "Send"}
          </button>
        </form>
      </div>
    </Leaf>
  );
}

/* ── Stats ─────────────────────────────────────────────────────────────────── */

function StatsView({ block, ctx }: { block: StatsBlock; ctx: RegionContext }) {
  const p = block.props;
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} center />
        <div className={`mt-8 grid grid-cols-2 gap-6 ${cols(p.columns)}`}>
          {(p.items ?? []).map((item) => (
            <div key={item.id} className="text-center" data-lp-el="item">
              <div className="text-3xl font-bold text-zinc-900 sm:text-4xl">{item.value}</div>
              <div className="mt-1 text-sm text-zinc-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Logo cloud ────────────────────────────────────────────────────────────── */

function LogosView({ block, ctx }: { block: LogosBlock; ctx: RegionContext }) {
  const p = block.props;
  const items = (p.items ?? []).filter((i) => i.src);
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl text-center">
        <Heading text={p.heading} ctx={ctx} center />
        <div className={`mt-8 grid grid-cols-2 items-center gap-8 ${cols(p.columns)}`}>
          {items.length === 0 ? (
            <p className="col-span-full text-sm text-zinc-400">Add partner logos in the block settings.</p>
          ) : (
            items.map((item) => {
              // eslint-disable-next-line @next/next/no-img-element
              const img = <img src={item.src} alt={item.alt} className={`mx-auto h-10 w-auto object-contain ${p.grayscale ? "opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0" : ""}`} />;
              return item.url ? (
                <a key={item.id} href={item.url} data-lp-el="item">
                  {img}
                </a>
              ) : (
                <div key={item.id} data-lp-el="item">
                  {img}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────────── */

function TabsView({ block, ctx }: { block: TabsBlock; ctx: RegionContext }) {
  const items = block.props.items ?? [];
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;
  const current = items[Math.min(active, items.length - 1)];
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap gap-1 border-b border-zinc-200" role="tablist">
          {items.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${i === active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
            >
              {renderLocalizedContent(tab.label, ctx)}
            </button>
          ))}
        </div>
        <div className="pt-4 text-sm text-zinc-600" data-lp-el="content">
          <div className="rte-content" dangerouslySetInnerHTML={{ __html: renderLocalizedContent(current.content, ctx) }} />
        </div>
      </div>
    </Leaf>
  );
}

/* ── Directory search hero ─────────────────────────────────────────────────── */

function SearchHeroView({ block, ctx }: { block: SearchHeroBlock; ctx: RegionContext }) {
  const p = block.props;
  return (
    <Leaf block={block} className="!py-0">
      <div className="rounded-2xl px-6 py-12 text-center" style={{ backgroundColor: p.bgColor, color: p.textColor }}>
        <h2 className="text-3xl font-bold" data-lp-el="heading">
          {renderLocalizedContent(p.heading, ctx)}
        </h2>
        {p.subheading ? (
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90" data-lp-el="subheading">
            {renderLocalizedContent(p.subheading, ctx)}
          </p>
        ) : null}
        <form action={p.searchUrl || "/search"} method="get" className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row">
          {p.showCategory ? (
            <select name="category" className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-900">
              <option value="">All categories</option>
            </select>
          ) : null}
          <input
            type="search"
            name="q"
            placeholder={p.placeholder}
            className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-900"
          />
          {p.showLocation ? (
            <input
              type="text"
              name="location"
              placeholder="City or state"
              className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-900 sm:w-40"
            />
          ) : null}
          <button type="submit" className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700" data-lp-el="button">
            {renderLocalizedContent(p.buttonLabel, ctx) || "Search"}
          </button>
        </form>
      </div>
    </Leaf>
  );
}

/* ── Category grids ────────────────────────────────────────────────────────── */

type CatRow = { id: string; title: string; slug: string; parentId?: string | null };

function CategoryGridView({
  block,
  ctx,
  basePath,
}: {
  block: ListingCategoriesBlock | ProductCategoriesBlock;
  ctx: RegionContext;
  basePath: string;
}) {
  const p = block.props;
  const [cats, setCats] = useState<CatRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setCats(Array.isArray(data) ? data : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const shown = cats.slice(0, p.limit || 9);
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} center />
        <div className={`mt-8 grid grid-cols-2 gap-4 ${cols(p.columns)}`}>
          {shown.length === 0 ? (
            <p className="col-span-full text-sm text-zinc-400">No categories published yet.</p>
          ) : (
            shown.map((c) => (
              <a
                key={c.id}
                href={`${basePath}${c.slug}/`}
                className="rounded-xl border border-zinc-200 px-4 py-5 text-center transition hover:border-zinc-400 hover:bg-zinc-50"
                data-lp-el="item"
              >
                <span className="block text-sm font-medium text-zinc-800" data-lp-el="chip">{renderLocalizedContent(c.title, ctx)}</span>
              </a>
            ))
          )}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Featured listings (live) ──────────────────────────────────────────────── */

type SlideItem = { id: string; title: string; subtitle: string | null; image: string | null; url: string | null };

function ListingCards({ items, ctx }: { items: SlideItem[]; ctx: RegionContext }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url || "#"}
          className="overflow-hidden rounded-xl border border-zinc-200 transition hover:border-zinc-400 hover:shadow-sm"
          data-lp-el="item"
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.title} className="h-40 w-full object-cover" />
          ) : (
            <div className="flex h-40 items-center justify-center bg-zinc-100 text-2xl" aria-hidden>
              📍
            </div>
          )}
          <div className="p-4">
            <div className="text-sm font-semibold text-zinc-900">{renderLocalizedContent(item.title, ctx)}</div>
            {item.subtitle ? (
              <div className="mt-1 line-clamp-3 text-xs text-zinc-500">{renderLocalizedContent(item.subtitle, ctx)}</div>
            ) : null}
          </div>
        </a>
      ))}
    </div>
  );
}

function useLiveItems(source: string, limit: number, categoryIds: string[] = []) {
  const [items, setItems] = useState<SlideItem[]>([]);
  const key = `${source}|${limit}|${categoryIds.join(",")}`;
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      source,
      limit: String(limit || 6),
      categoryIds: categoryIds.join(","),
    });
    fetch(`/api/content-slider?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return items;
}

function FeaturedListingsView({ block, ctx }: { block: FeaturedListingsBlock; ctx: RegionContext }) {
  const p = block.props;
  const items = useLiveItems("listings", p.limit || 6, p.categoryId ? [p.categoryId] : []);
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} center />
        <div className="mt-8">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-400">No listings to feature yet.</p>
          ) : (
            <ListingCards items={items} ctx={ctx} />
          )}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Map + listings ────────────────────────────────────────────────────────── */

function MapListingsView({ block, ctx }: { block: MapListingsBlock; ctx: RegionContext }) {
  const p = block.props;
  const items = useLiveItems("listings", p.limit || 6);
  const query = encodeURIComponent(p.location || "");
  const mapSrc = `https://www.google.com/maps?q=${query}&z=${p.zoom || 11}&output=embed`;
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} />
        <div className={`mt-6 grid grid-cols-1 gap-6 ${cols(p.columns)}`}>
          <div className="overflow-hidden rounded-xl border border-zinc-200" style={{ minHeight: p.height || 420 }}>
            <iframe
              title="Map"
              src={mapSrc}
              className="h-full w-full"
              style={{ height: p.height || 420 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-zinc-400">No listings to show.</p>
            ) : (
              items.map((item) => (
                <a
                  key={item.id}
                  href={item.url || "#"}
                  className="block rounded-lg border border-zinc-200 px-4 py-3 transition hover:border-zinc-400"
                  data-lp-el="item"
                >
                  <span className="text-sm font-medium text-zinc-900">{renderLocalizedContent(item.title, ctx)}</span>
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </Leaf>
  );
}

/* ── Table of contents ─────────────────────────────────────────────────────── */

type TocEntry = { id: string; text: string; level: number };

function TocView({ block }: { block: TocBlock; ctx: RegionContext }) {
  const p = block.props;
  const [entries, setEntries] = useState<TocEntry[]>([]);
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("h2, h3, h4")) as HTMLElement[];
    const max = p.maxDepth || 3;
    const found: TocEntry[] = [];
    nodes.forEach((node, i) => {
      const level = Number(node.tagName.slice(1));
      if (level > max) return;
      if (node.dataset.tocSkip === "true") return;
      if (!node.id) node.id = `toc-${i}-${(node.textContent ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
      found.push({ id: node.id, text: node.textContent ?? "", level });
    });
    setEntries(found);
  }, [p.maxDepth]);
  return (
    <Leaf block={block} padded={false} className="!px-0">
      <nav className={`rounded-xl border border-zinc-200 p-4 ${p.sticky ? "sticky top-6" : ""}`} aria-label="Table of contents">
        {p.heading ? <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{renderLocalizedContent(p.heading, {})}</p> : null}
        {entries.length === 0 ? (
          <p className="text-xs text-zinc-400">Add headings to the page to build a table of contents.</p>
        ) : (
          <ul className="space-y-1">
            {entries.map((e) => (
              <li key={e.id} style={{ paddingLeft: (e.level - 2) * 12 }}>
                <a href={`#${e.id}`} className="text-sm text-zinc-600 hover:text-zinc-900" data-lp-el="item">
                  {e.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </Leaf>
  );
}

/* ── Related posts ─────────────────────────────────────────────────────────── */

type GridItem = { id: string; title: string; excerpt?: string | null; image?: string | null; url?: string | null };

function RelatedPostsView({ block, ctx }: { block: RelatedPostsBlock; ctx: RegionContext }) {
  const p = block.props;
  const [items, setItems] = useState<GridItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/content-grid?source=articles&perPage=${p.limit || 3}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [p.limit]);
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} />
        <div className={`mt-6 grid grid-cols-1 gap-5 ${cols(p.columns)}`}>
          {items.length === 0 ? (
            <p className="col-span-full text-sm text-zinc-400">No related posts yet.</p>
          ) : (
            items.map((item) => (
              <a key={item.id} href={item.url || "#"} className="overflow-hidden rounded-xl border border-zinc-200 transition hover:shadow-sm" data-lp-el="item">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title} className="h-36 w-full object-cover" />
                ) : null}
                <div className="p-4">
                  <div className="text-sm font-semibold text-zinc-900">{renderLocalizedContent(item.title, ctx)}</div>
                  {item.excerpt ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.excerpt}</p> : null}
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Author bio ────────────────────────────────────────────────────────────── */

function AuthorBioView({ block, ctx }: { block: AuthorBioBlock; ctx: RegionContext }) {
  const p = block.props;
  if (!p.name && !p.bio) return null;
  return (
    <Leaf block={block}>
      <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-xl border border-zinc-200 p-5">
        {p.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar} alt={p.name} className="h-14 w-14 shrink-0 rounded-full object-cover" data-lp-el="image" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xl" aria-hidden data-lp-el="image">
            🧑
          </div>
        )}
        <div data-lp-el="content">
          <div className="text-sm font-semibold text-zinc-900">{p.name}</div>
          {p.role ? <div className="text-xs text-zinc-500">{p.role}</div> : null}
          {p.bio ? <p className="mt-2 text-sm text-zinc-600">{renderLocalizedContent(p.bio, ctx)}</p> : null}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Share buttons ─────────────────────────────────────────────────────────── */

const SHARE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  x: "X",
  twitter: "X",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  email: "Email",
  whatsapp: "WhatsApp",
};

function shareHref(network: string, url: string): string {
  const u = encodeURIComponent(url);
  switch (network) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "x":
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "pinterest":
      return `https://pinterest.com/pin/create/button/?url=${u}`;
    case "whatsapp":
      return `https://wa.me/?text=${u}`;
    case "email":
      return `mailto:?body=${u}`;
    default:
      return url || "#";
  }
}

function ShareButtonsView({ block, ctx }: { block: ShareButtonsBlock; ctx: RegionContext }) {
  const p = block.props;
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setUrl(window.location.href);
  }, []);
  const networks = p.networks ?? [];
  return (
    <Leaf block={block} padded={false} className="!px-0">
      <div className="flex flex-wrap items-center gap-2">
        {p.heading ? <span className="text-sm font-medium text-zinc-500" data-lp-el="heading">{renderLocalizedContent(p.heading, ctx)}</span> : null}
        {networks.map((n) => (
          <a
            key={n}
            href={shareHref(n, url)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
            data-lp-el="item"
          >
            {SHARE_LABELS[n] ?? n}
          </a>
        ))}
      </div>
    </Leaf>
  );
}

/* ── Post meta ─────────────────────────────────────────────────────────────── */

function PostMetaView({ block }: { block: PostMetaBlock; ctx: RegionContext }) {
  const p = block.props;
  const parts: string[] = [];
  if (p.showAuthor) parts.push("By Admin");
  if (p.showDate) parts.push("Jan 1, 2026");
  if (p.showReadTime) parts.push("5 min read");
  return (
    <Leaf block={block} padded={false} className="!px-0">
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500" data-lp-el="content">
        {parts.map((part) => (
          <span key={part}>{part}</span>
        ))}
      </div>
    </Leaf>
  );
}

/* ── Newsletter ────────────────────────────────────────────────────────────── */

function NewsletterView({ block, ctx }: { block: NewsletterBlock; ctx: RegionContext }) {
  const p = block.props;
  const [done, setDone] = useState(false);
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-xl rounded-2xl bg-zinc-900 px-6 py-10 text-center text-white">
        <h2 className="text-2xl font-bold" data-lp-el="heading">
          {renderLocalizedContent(p.heading, ctx)}
        </h2>
        {p.subheading ? <p className="mt-3 text-sm opacity-80" data-lp-el="subheading">{renderLocalizedContent(p.subheading, ctx)}</p> : null}
        {done ? (
          <p className="mt-6 text-sm" role="status">{renderLocalizedContent(p.successMessage, ctx)}</p>
        ) : (
          <form
            className="mt-6 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <input
              type="email"
              required
              placeholder={p.placeholder}
              className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-zinc-900"
            />
            <button type="submit" className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200" data-lp-el="button">
              {renderLocalizedContent(p.buttonLabel, ctx) || "Subscribe"}
            </button>
          </form>
        )}
      </div>
    </Leaf>
  );
}

/* ── Product spotlight ─────────────────────────────────────────────────────── */

type ProductItem = {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  price?: number;
  imageAssetId?: string | null;
  image?: string | null;
};

function ProductSpotlightView({ block, ctx }: { block: ProductSpotlightBlock; ctx: RegionContext }) {
  const p = block.props;
  const [product, setProduct] = useState<ProductItem | null>(null);
  useEffect(() => {
    if (!p.productId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/products?ids=${encodeURIComponent(p.productId)}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setProduct(Array.isArray(data?.items) ? (data.items[0] ?? null) : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [p.productId]);
  const name = product?.name ?? product?.title ?? "";
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-4xl">
        <Heading text={p.heading} ctx={ctx} />
        <div className="mt-6 grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
          {product?.imageAssetId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/assets/${product.imageAssetId}`} alt={name} className="w-full rounded-xl object-cover" data-lp-el="image" />
          ) : (
            <div className="flex h-56 items-center justify-center rounded-xl bg-zinc-100 text-3xl" aria-hidden data-lp-el="image">
              🛒
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold text-zinc-900" data-lp-el="title">{name || "Select a product"}</h3>
            {product?.excerpt ? <p className="mt-2 text-sm text-zinc-600">{product.excerpt}</p> : null}
            {typeof product?.price === "number" ? <div className="mt-3 text-lg font-bold text-zinc-900">${product.price}</div> : null}
            <a href={product?.slug ? `/${product.slug}` : "#"} className="mt-4 inline-block rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700" data-lp-el="button">
              {renderLocalizedContent(p.buttonLabel, ctx) || "View product"}
            </a>
          </div>
        </div>
      </div>
    </Leaf>
  );
}

/* ── Announcement bar ──────────────────────────────────────────────────────── */

function AnnouncementView({ block, ctx }: { block: AnnouncementBlock; ctx: RegionContext }) {
  const p = block.props;
  const content = (
    <span className="inline-flex items-center gap-3">
      <span>{renderLocalizedContent(p.text, ctx)}</span>
      {p.linkText ? (
        <a href={p.linkUrl || "#"} className="underline" data-lp-el="button">
          {renderLocalizedContent(p.linkText, ctx)}
        </a>
      ) : null}
    </span>
  );
  return (
    <Leaf block={block} padded={false} className="!px-0">
      <div className="px-4 py-2 text-center text-sm" style={{ backgroundColor: p.bgColor, color: p.textColor }} data-lp-el="content">
        {p.marquee ? (
          <div className="overflow-hidden whitespace-nowrap">
            <span className="inline-block animate-[marquee_18s_linear_infinite]">{content}</span>
          </div>
        ) : (
          content
        )}
      </div>
    </Leaf>
  );
}

/* ── Breadcrumbs ───────────────────────────────────────────────────────────── */

function BreadcrumbsView({ block }: { block: BreadcrumbsBlock; ctx: RegionContext }) {
  const p = block.props;
  const [crumbs, setCrumbs] = useState<Array<{ label: string; href: string }>>([]);
  useEffect(() => {
    const segs = window.location.pathname.split("/").filter(Boolean);
    const list: Array<{ label: string; href: string }> = [];
    let href = "";
    segs.forEach((seg) => {
      href += `/${seg}`;
      list.push({ label: seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), href });
    });
    setCrumbs(list);
  }, []);
  return (
    <Leaf block={block} padded={false} className="!px-0">
      <nav className="text-xs text-zinc-500" aria-label="Breadcrumb" data-lp-el="content">
        {p.showHome ? (
          <a href="/" className="hover:text-zinc-800">
            Home
          </a>
        ) : null}
        {crumbs.map((c) => (
          <span key={c.href}>
            <span className="mx-1.5">{p.separator || "/"}</span>
            <a href={c.href} className="hover:text-zinc-800">
              {c.label}
            </a>
          </span>
        ))}
      </nav>
    </Leaf>
  );
}

/* ── Social links ──────────────────────────────────────────────────────────── */

const SOCIAL_GLYPHS: Record<string, string> = {
  facebook: "f",
  x: "𝕏",
  twitter: "𝕏",
  instagram: "◎",
  linkedin: "in",
  youtube: "▶",
  tiktok: "♪",
  pinterest: "P",
};

function SocialLinksView({ block, ctx }: { block: SocialLinksBlock; ctx: RegionContext }) {
  const p = block.props;
  const size = p.size === "sm" ? "h-7 w-7 text-xs" : p.size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm";
  return (
    <Leaf block={block} padded={false} className="!px-0">
      <div className="flex items-center gap-2">
        {p.heading ? <span className="text-sm font-medium text-zinc-500" data-lp-el="heading">{renderLocalizedContent(p.heading, ctx)}</span> : null}
        {(p.items ?? []).map((item) => (
          <a
            key={item.id}
            href={item.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.network}
            className={`flex items-center justify-center rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-50 ${size}`}
            data-lp-el="item"
          >
            {SOCIAL_GLYPHS[item.network] ?? item.network[0]?.toUpperCase() ?? "•"}
          </a>
        ))}
      </div>
    </Leaf>
  );
}

/* ── Countdown ─────────────────────────────────────────────────────────────── */

function useCountdown(target: string) {
  const targetMs = useMemo(() => {
    const t = Date.parse(target);
    return Number.isNaN(t) ? 0 : t;
  }, [target]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetMs) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);
  const diff = targetMs ? Math.max(0, targetMs - now) : 0;
  return {
    expired: targetMs > 0 && diff === 0,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

function CountdownView({ block, ctx }: { block: CountdownBlock; ctx: RegionContext }) {
  const p = block.props;
  const c = useCountdown(p.targetDate);
  const cells = [
    { label: "Days", value: c.days },
    { label: "Hours", value: c.hours },
    { label: "Minutes", value: c.minutes },
    { label: "Seconds", value: c.seconds },
  ];
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-3xl text-center">
        <Heading text={p.heading} ctx={ctx} center />
        {c.expired ? (
          <p className="mt-6 text-sm text-zinc-500">{renderLocalizedContent(p.expiredText, ctx)}</p>
        ) : (
          <div className="mt-6 flex justify-center gap-3">
            {cells.map((cell) => (
              <div key={cell.label} className="min-w-16 rounded-xl border border-zinc-200 px-4 py-3" data-lp-el="item">
                <div className="text-2xl font-bold text-zinc-900">{String(cell.value).padStart(2, "0")}</div>
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">{cell.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Leaf>
  );
}

/* ── Gallery ───────────────────────────────────────────────────────────────── */

function GalleryView({ block }: { block: GalleryBlock }) {
  const p = block.props;
  const images = (p.images ?? []).filter((i) => i.src);
  return (
    <Leaf block={block}>
      <div className={`mx-auto max-w-6xl ${p.masonry ? "columns-2 gap-4 sm:columns-3" : ""}`}>
        {images.length === 0 ? (
          <p className="text-sm text-zinc-400">Add images in the block settings.</p>
        ) : p.masonry ? (
          images.map((img) => (
            <figure key={img.id} className="mb-4 break-inside-avoid" data-lp-el="item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt} className="w-full rounded-lg" />
              {img.caption ? <figcaption className="mt-1 text-xs text-zinc-500">{img.caption}</figcaption> : null}
            </figure>
          ))
        ) : (
          <div className={`grid grid-cols-2 gap-4 ${cols(p.columns)}`}>
            {images.map((img) => (
              <figure key={img.id} data-lp-el="item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt} className="aspect-square w-full rounded-lg object-cover" />
                {img.caption ? <figcaption className="mt-1 text-xs text-zinc-500">{img.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        )}
      </div>
    </Leaf>
  );
}

/* ── Steps / timeline ──────────────────────────────────────────────────────── */

function StepsView({ block, ctx }: { block: StepsBlock; ctx: RegionContext }) {
  const p = block.props;
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-4xl">
        <Heading text={p.heading} ctx={ctx} center />
        <ol className="mt-8 space-y-6">
          {(p.items ?? []).map((item, i) => (
            <li key={item.id} className="flex gap-4" data-lp-el="item">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900">{renderLocalizedContent(item.title, ctx)}</div>
                {item.description ? <p className="mt-1 text-sm text-zinc-600">{renderLocalizedContent(item.description, ctx)}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Leaf>
  );
}

/* ── Decorative divider ────────────────────────────────────────────────────── */

const SHAPE_PATHS: Record<string, string> = {
  wave: "M0,32 C240,64 480,0 720,24 C960,48 1200,80 1440,40 L1440,120 L0,120 Z",
  tilt: "M0,120 L1440,0 L1440,120 Z",
  curve: "M0,120 C360,0 1080,0 1440,120 Z",
  triangle: "M720,0 L1440,120 L0,120 Z",
  zigzag: "M0,120 L180,40 L360,120 L540,40 L720,120 L900,40 L1080,120 L1260,40 L1440,120 Z",
};

function ShapeDividerView({ block }: { block: ShapeDividerBlock }) {
  const p = block.props;
  const path = SHAPE_PATHS[p.shape] ?? SHAPE_PATHS.wave;
  return (
    <Leaf block={block} padded={false} className="!px-0">
      <div style={{ lineHeight: 0 }}>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ width: "100%", height: p.height || 80, transform: p.flip ? "scaleY(-1)" : undefined }}
          aria-hidden
          data-lp-el="content"
        >
          <path d={path} fill={p.color} />
        </svg>
      </div>
    </Leaf>
  );
}

/* ── Reviews / rating summary ──────────────────────────────────────────────── */

function StarRow({ value, className }: { value: number; className?: string }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`inline-flex items-center gap-0.5 ${className ?? ""}`} aria-label={`${value.toFixed(1)} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={i < rounded ? "text-amber-400" : "text-zinc-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

function ReviewsView({ block, ctx }: { block: ReviewsBlock; ctx: RegionContext }) {
  const p = block.props;
  const items = p.items ?? [];
  const avg = items.length ? items.reduce((s, it) => s + (Number(it.rating) || 0), 0) / items.length : 0;
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} center />
        {p.subheading ? (
          <p className="mt-3 text-center text-zinc-600" data-lp-el="subheading">
            {renderLocalizedContent(p.subheading, ctx)}
          </p>
        ) : null}
        {p.showSummary && items.length > 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-1 rounded-xl bg-zinc-50 py-4" data-lp-el="summary">
            <div className="text-4xl font-bold text-zinc-900">{avg.toFixed(1)}</div>
            <StarRow value={avg} className="text-lg" />
            <div className="text-sm text-zinc-500">Based on {items.length} review{items.length === 1 ? "" : "s"}</div>
          </div>
        ) : null}
        <div className={`mt-8 grid grid-cols-1 gap-6 ${cols(p.columns ?? 3)}`}>
          {items.map((item) => (
            <figure key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-6" data-lp-el="item">
              <StarRow value={Number(item.rating) || 0} />
              <blockquote className="mt-3 text-sm leading-relaxed text-zinc-700" data-lp-el="quote">
                {renderLocalizedContent(item.text, ctx)}
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.author} className="h-9 w-9 rounded-full object-cover" />
                ) : null}
                <span className="text-sm font-medium text-zinc-900">{item.author}</span>
                {item.date ? <span className="ml-auto text-xs text-zinc-400">{item.date}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Related / nearby listings ─────────────────────────────────────────────── */

function RelatedListingsView({ block, ctx }: { block: RelatedListingsBlock; ctx: RegionContext }) {
  const p = block.props;
  const items = p.items ?? [];
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} center />
        {p.subheading ? (
          <p className="mt-3 text-center text-zinc-600" data-lp-el="subheading">
            {renderLocalizedContent(p.subheading, ctx)}
          </p>
        ) : null}
        <div className={`mt-8 grid grid-cols-1 gap-6 ${cols(p.columns ?? 3)}`}>
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url || "#"}
              className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
              data-lp-el="item"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : null}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-zinc-900" data-lp-el="title">
                    {renderLocalizedContent(item.title, ctx)}
                  </h3>
                  {Number(item.rating) > 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm text-amber-500">
                      ★ <span className="text-zinc-500">{Number(item.rating).toFixed(1)}</span>
                    </span>
                  ) : null}
                </div>
                {item.location ? <p className="mt-1 text-sm text-zinc-500">{item.location}</p> : null}
              </div>
            </a>
          ))}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Business info / contact card ──────────────────────────────────────────── */

function BusinessInfoView({ block, ctx }: { block: BusinessInfoBlock; ctx: RegionContext }) {
  const p = block.props;
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-5xl">
        <Heading text={p.heading} ctx={ctx} center />
        <div className="mt-8 grid grid-cols-1 gap-8 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-2" data-lp-el="card">
          <div>
            {p.image ? (
              <img src={p.image} alt={p.name} className="mb-4 h-40 w-full rounded-xl object-cover" data-lp-el="image" />
            ) : null}
            <h3 className="text-xl font-bold text-zinc-900" data-lp-el="name">
              {renderLocalizedContent(p.name, ctx)}
            </h3>
            {p.tagline ? <p className="mt-1 text-sm text-zinc-500">{renderLocalizedContent(p.tagline, ctx)}</p> : null}
            {p.hours && p.hours.length > 0 ? (
              <dl className="mt-4 space-y-1" data-lp-el="hours">
                {p.hours.map((h) => (
                  <div key={h.id} className="flex justify-between text-sm">
                    <dt className="text-zinc-500">{h.day}</dt>
                    <dd className="font-medium text-zinc-800">{h.time}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <ul className="space-y-3 text-sm" data-lp-el="details">
            {p.address ? (
              <li className="flex gap-2 text-zinc-700">
                <span aria-hidden>📍</span>
                <span>{p.address}</span>
              </li>
            ) : null}
            {p.phone ? (
              <li className="flex gap-2">
                <span aria-hidden>📞</span>
                <a href={`tel:${p.phone}`} className="text-zinc-700 hover:underline">
                  {p.phone}
                </a>
              </li>
            ) : null}
            {p.email ? (
              <li className="flex gap-2">
                <span aria-hidden>✉️</span>
                <a href={`mailto:${p.email}`} className="text-zinc-700 hover:underline">
                  {p.email}
                </a>
              </li>
            ) : null}
            {p.website ? (
              <li className="flex gap-2">
                <span aria-hidden>🌐</span>
                <a href={p.website} className="text-zinc-700 hover:underline">
                  {p.website.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </Leaf>
  );
}

/* ── Filters / facet bar ───────────────────────────────────────────────────── */

function FacetBarView({ block, ctx }: { block: FacetBarBlock; ctx: RegionContext }) {
  const p = block.props;
  const groups = p.groups ?? [];
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} />
        <div
          className={`mt-4 flex flex-wrap items-end gap-4 rounded-2xl border border-zinc-200 bg-white p-4 ${p.sticky ? "sticky top-2 z-10" : ""}`}
          data-lp-el="bar"
        >
          {groups.map((g) => (
            <label key={g.id} className="flex min-w-[10rem] flex-1 flex-col gap-1" data-lp-el="group">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{g.label}</span>
              <select className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800" defaultValue="">
                {(g.options ?? []).map((opt, i) => (
                  <option key={`${g.id}-${i}`} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Comparison table ──────────────────────────────────────────────────────── */

function ComparisonTableView({ block, ctx }: { block: ComparisonTableBlock; ctx: RegionContext }) {
  const p = block.props;
  const rows = p.rows ?? [];
  const columns = p.columns ?? [];
  const highlight = p.highlightCol ?? -1;
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} center />
        <div className="mt-8 overflow-x-auto" data-lp-el="table">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left" />
                {columns.map((c, ci) => (
                  <th
                    key={c.id}
                    className={`p-3 text-center ${ci === highlight ? "rounded-t-xl bg-zinc-900 text-white" : "text-zinc-900"}`}
                    data-lp-el="column"
                  >
                    <div className="text-base font-bold">{renderLocalizedContent(c.name, ctx)}</div>
                    {c.price ? <div className="mt-1 text-sm opacity-80">{c.price}</div> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={r.id} className="border-t border-zinc-200">
                  <th className="p-3 text-left font-medium text-zinc-700" data-lp-el="row">
                    {renderLocalizedContent(r.label, ctx)}
                  </th>
                  {columns.map((c, ci) => (
                    <td key={c.id} className={`p-3 text-center ${ci === highlight ? "bg-zinc-50" : ""}`}>
                      {c.values?.[ri] ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Leaf>
  );
}

/* ── Team grid ─────────────────────────────────────────────────────────────── */

function TeamView({ block, ctx }: { block: TeamBlock; ctx: RegionContext }) {
  const p = block.props;
  const members = p.members ?? [];
  return (
    <Leaf block={block}>
      <div className="mx-auto max-w-6xl">
        <Heading text={p.heading} ctx={ctx} center />
        {p.subheading ? (
          <p className="mt-3 text-center text-zinc-600" data-lp-el="subheading">
            {renderLocalizedContent(p.subheading, ctx)}
          </p>
        ) : null}
        <div className={`mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 ${cols(p.columns ?? 3)}`}>
          {members.map((m) => (
            <div key={m.id} className="rounded-2xl border border-zinc-200 bg-white p-6 text-center" data-lp-el="item">
              {m.image ? (
                <img src={m.image} alt={m.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
              ) : (
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-3xl">👤</div>
              )}
              <h3 className="mt-4 font-semibold text-zinc-900" data-lp-el="name">
                {renderLocalizedContent(m.name, ctx)}
              </h3>
              {m.role ? <p className="text-sm text-zinc-500">{m.role}</p> : null}
              {m.bio ? <p className="mt-3 text-sm text-zinc-600">{renderLocalizedContent(m.bio, ctx)}</p> : null}
              {m.link ? (
                <a href={m.link} className="mt-3 inline-block text-sm font-medium text-zinc-900 hover:underline">
                  View profile
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Leaf>
  );
}

/* ── Registry ──────────────────────────────────────────────────────────────── */

export const SHARED_RENDERERS: Record<string, React.ComponentType<RenderProps>> = {
  pricing: (props) => <PricingView {...(props as { block: PricingBlock; ctx: RegionContext })} />,
  leadForm: (props) => <LeadFormView {...(props as { block: LeadFormBlock; ctx: RegionContext })} />,
  stats: (props) => <StatsView {...(props as { block: StatsBlock; ctx: RegionContext })} />,
  logos: (props) => <LogosView {...(props as { block: LogosBlock; ctx: RegionContext })} />,
  tabs: (props) => <TabsView {...(props as { block: TabsBlock; ctx: RegionContext })} />,
  searchHero: (props) => <SearchHeroView {...(props as { block: SearchHeroBlock; ctx: RegionContext })} />,
  listingCategories: ({ block, ctx }) => (
    <CategoryGridView block={block as ListingCategoriesBlock} ctx={ctx} basePath={(block.props as ListingCategoriesBlock["props"]).basePath || "/g/"} />
  ),
  featuredListings: (props) => <FeaturedListingsView {...(props as { block: FeaturedListingsBlock; ctx: RegionContext })} />,
  mapListings: (props) => <MapListingsView {...(props as { block: MapListingsBlock; ctx: RegionContext })} />,
  toc: (props) => <TocView {...(props as { block: TocBlock; ctx: RegionContext })} />,
  relatedPosts: (props) => <RelatedPostsView {...(props as { block: RelatedPostsBlock; ctx: RegionContext })} />,
  authorBio: (props) => <AuthorBioView {...(props as { block: AuthorBioBlock; ctx: RegionContext })} />,
  shareButtons: (props) => <ShareButtonsView {...(props as { block: ShareButtonsBlock; ctx: RegionContext })} />,
  postMeta: (props) => <PostMetaView {...(props as { block: PostMetaBlock; ctx: RegionContext })} />,
  newsletter: (props) => <NewsletterView {...(props as { block: NewsletterBlock; ctx: RegionContext })} />,
  productCategories: ({ block, ctx }) => (
    <CategoryGridView block={block as ProductCategoriesBlock} ctx={ctx} basePath={(block.props as ProductCategoriesBlock["props"]).basePath || "/g/"} />
  ),
  productSpotlight: (props) => <ProductSpotlightView {...(props as { block: ProductSpotlightBlock; ctx: RegionContext })} />,
  announcement: (props) => <AnnouncementView {...(props as { block: AnnouncementBlock; ctx: RegionContext })} />,
  breadcrumbs: (props) => <BreadcrumbsView {...(props as { block: BreadcrumbsBlock; ctx: RegionContext })} />,
  socialLinks: (props) => <SocialLinksView {...(props as { block: SocialLinksBlock; ctx: RegionContext })} />,
  countdown: (props) => <CountdownView {...(props as { block: CountdownBlock; ctx: RegionContext })} />,
  gallery: (props) => <GalleryView {...(props as { block: GalleryBlock; ctx: RegionContext })} />,
  steps: (props) => <StepsView {...(props as { block: StepsBlock; ctx: RegionContext })} />,
  shapeDivider: (props) => <ShapeDividerView {...(props as { block: ShapeDividerBlock; ctx: RegionContext })} />,
  reviews: (props) => <ReviewsView {...(props as { block: ReviewsBlock; ctx: RegionContext })} />,
  relatedListings: (props) => <RelatedListingsView {...(props as { block: RelatedListingsBlock; ctx: RegionContext })} />,
  businessInfo: (props) => <BusinessInfoView {...(props as { block: BusinessInfoBlock; ctx: RegionContext })} />,
  facetBar: (props) => <FacetBarView {...(props as { block: FacetBarBlock; ctx: RegionContext })} />,
  comparisonTable: (props) => <ComparisonTableView {...(props as { block: ComparisonTableBlock; ctx: RegionContext })} />,
  team: (props) => <TeamView {...(props as { block: TeamBlock; ctx: RegionContext })} />,
};

export const SHARED_BLOCK_TYPE_KEYS = Object.keys(SHARED_RENDERERS);
