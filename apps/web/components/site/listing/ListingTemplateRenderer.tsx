import Image from "next/image";
import Link from "next/link";
import { sanitizeHtml } from "@/lib/style-guide";
import type { HeroVariant, ListingBlock, SidebarWidget, TemplateLayout } from "@/lib/listing-templates/types";
import type { ListingViewContext } from "./listing-view-model";
import {
  AddressLine,
  AreasCard,
  BadgeRow,
  CategoriesCard,
  ClaimCard,
  ContactCard,
  ContactLine,
  DetailsGrid,
  GalleryGrid,
  GalleryStrip,
  HoursCard,
  MapEmbed,
  QuickFactsCard,
  ReviewForm,
  ReviewsList,
  SocialCard,
  TextCard,
  VideoEmbed,
} from "./parts";

/** Template record shape (DB row, blocks/sidebar already parsed to arrays). */
export interface ListingTemplateData {
  id: string;
  name: string;
  slug: string;
  layout: TemplateLayout | string;
  heroVariant: HeroVariant | string;
  blocks: ListingBlock[];
  sidebar: SidebarWidget[];
}

/* ── HERO VARIANTS ─────────────────────────────────────────────────────── */

/** Hero header shared by the legacy flat renderer and the tree renderer's listingHero block. */
export function ListingHero({ ctx, variant }: { ctx: ListingViewContext; variant: string }) {
  const { listing } = ctx;

  if (variant === "minimal") {
    return (
      <header className="border-b border-zinc-200 pb-8">
        <BadgeRow ctx={ctx} className="mb-3" />
        <h1 className="text-4xl font-light tracking-tight text-zinc-900" data-lp-el="title">{listing.title}</h1>
        {listing.companyName && <p className="mt-2 text-zinc-500" data-lp-el="subtitle">{listing.companyName}</p>}
        <div className="mt-5">
          <ContactLine ctx={ctx} />
        </div>
        <div className="mt-3">
          <AddressLine ctx={ctx} />
        </div>
      </header>
    );
  }

  if (variant === "bold") {
    return (
      <header className="rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 p-8">
        {listing.feedImage && (
          <div className="mb-6 overflow-hidden rounded-xl" data-lp-el="cover">
            <Image src={`/api/assets/${listing.feedImage}/`} alt={`${listing.title} - Cover`} width={1200} height={320} priority className="h-48 w-full object-cover" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-5">
          {listing.avatarImage && (
            <Image src={`/api/assets/${listing.avatarImage}/`} alt={listing.title} width={96} height={96} className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-white" data-lp-el="avatar" />
          )}
          <div className="min-w-0">
            <BadgeRow ctx={ctx} className="mb-2" />
            <h1 className="truncate text-4xl font-black tracking-tight text-zinc-900" data-lp-el="title">{listing.title}</h1>
            {listing.companyName && <p className="mt-1 text-lg text-zinc-600" data-lp-el="subtitle">{listing.companyName}</p>}
          </div>
        </div>
        <div className="mt-6">
          <ContactLine ctx={ctx} />
        </div>
        <div className="mt-3">
          <AddressLine ctx={ctx} />
        </div>
      </header>
    );
  }

  if (variant === "corporate") {
    return (
      <header className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {listing.feedImage && (
          <Image src={`/api/assets/${listing.feedImage}/`} alt={`${listing.title} - Cover`} width={1200} height={280} priority className="h-44 w-full object-cover" data-lp-el="cover" />
        )}
        <div className="border-t-4 border-blue-600 p-6">
          <div className="flex flex-wrap items-start gap-4">
            {listing.avatarImage && (
              <Image src={`/api/assets/${listing.avatarImage}/`} alt={listing.title} width={88} height={88} className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 object-cover" data-lp-el="avatar" />
            )}
            <div className="min-w-0">
              <BadgeRow ctx={ctx} className="mb-2" />
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900" data-lp-el="title">{listing.title}</h1>
              {listing.companyName && <p className="mt-1 text-zinc-600" data-lp-el="subtitle">{listing.companyName}</p>}
            </div>
          </div>
          <div className="mt-5">
            <ContactLine ctx={ctx} />
          </div>
          <div className="mt-3">
            <AddressLine ctx={ctx} />
          </div>
        </div>
      </header>
    );
  }

  if (variant === "warm") {
    return (
      <header className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <div className="flex flex-wrap items-center gap-5">
          {listing.avatarImage && (
            <Image src={`/api/assets/${listing.avatarImage}/`} alt={listing.title} width={96} height={96} className="h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover shadow" data-lp-el="avatar" />
          )}
          <div className="min-w-0">
            <BadgeRow ctx={ctx} className="mb-2" />
            <h1 className="text-3xl font-semibold tracking-tight text-amber-950" data-lp-el="title">{listing.title}</h1>
            {listing.companyName && <p className="mt-1 text-amber-800/80" data-lp-el="subtitle">{listing.companyName}</p>}
          </div>
        </div>
        {ctx.renderedSummary && <p className="mt-4 max-w-2xl text-amber-900/80" data-lp-el="summary">{ctx.renderedSummary}</p>}
        <div className="mt-5 [&_a]:text-amber-900">
          <ContactLine ctx={ctx} />
        </div>
        <div className="mt-3 [&_span]:text-amber-900/80">
          <AddressLine ctx={ctx} />
        </div>
      </header>
    );
  }

  if (variant === "modern") {
    return (
      <header className="rounded-3xl bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-8">
        <div className="flex flex-wrap items-center gap-5">
          {listing.avatarImage && (
            <Image src={`/api/assets/${listing.avatarImage}/`} alt={listing.title} width={96} height={96} className="h-20 w-20 shrink-0 rounded-2xl object-cover" data-lp-el="avatar" />
          )}
          <div className="min-w-0">
            <BadgeRow ctx={ctx} className="mb-2" />
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900" data-lp-el="title">{listing.title}</h1>
            {listing.companyName && <p className="mt-1 text-zinc-600" data-lp-el="subtitle">{listing.companyName}</p>}
          </div>
        </div>
        <div className="mt-6">
          <ContactLine ctx={ctx} />
        </div>
        <div className="mt-3">
          <AddressLine ctx={ctx} />
        </div>
      </header>
    );
  }

  /* default */
  return (
    <header className="rounded-xl border border-zinc-200 bg-white p-6">
      {listing.feedImage && (
        <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100" data-lp-el="cover">
          <Image src={`/api/assets/${listing.feedImage}/`} alt={`${listing.title} - Cover`} width={1200} height={400} priority className="h-52 w-full object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {listing.avatarImage && (
            <Image src={`/api/assets/${listing.avatarImage}/`} alt={listing.title} width={96} height={96} className="h-20 w-20 shrink-0 rounded-2xl border border-zinc-200 object-cover" data-lp-el="avatar" />
          )}
          <div>
            <BadgeRow ctx={ctx} className="mb-3" />
            <h1 className="text-3xl font-bold text-zinc-900" data-lp-el="title">{listing.title}</h1>
            {listing.companyName && <p className="mt-1 text-lg text-zinc-600" data-lp-el="subtitle">{listing.companyName}</p>}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <ContactLine ctx={ctx} />
      </div>
      <div className="mt-6">
        <AddressLine ctx={ctx} />
      </div>
    </header>
  );
}

/* ── BLOCKS ────────────────────────────────────────────────────────────── */

function BlockView({ block, ctx }: { block: ListingBlock; ctx: ListingViewContext }) {
  switch (block.type) {
    case "heading": {
      const text = ctx.bind(block.heading);
      if (!text) return null;
      const Tag = (block.level === 2 ? "h2" : block.level === 3 ? "h3" : "h4") as "h2" | "h3" | "h4";
      return <Tag className="text-xl font-semibold tracking-tight text-zinc-900">{text}</Tag>;
    }
    case "text": {
      const text = ctx.bind(block.text);
      if (!text) return null;
      return <p className="text-zinc-600">{text}</p>;
    }
    case "image": {
      let src: string | null = null;
      if (block.src) src = block.src;
      else if (block.assetId) src = block.assetId.startsWith("http") ? block.assetId : `/api/assets/${block.assetId}/`;
      else if (block.field === "feed" && ctx.listing.feedImage) src = `/api/assets/${ctx.listing.feedImage}/`;
      else if (block.field === "avatar" && ctx.listing.avatarImage) src = `/api/assets/${ctx.listing.avatarImage}/`;
      else if (block.field === "gallery" && ctx.galleryIds[0]) {
        const first = ctx.galleryIds[0];
        src = first.startsWith("http") ? first : `/api/assets/${first}/`;
      }
      if (!src) return null;
      return (
        <Image src={src} alt={ctx.listing.title} width={800} height={400} className={`w-full rounded-xl border border-zinc-200 object-cover ${block.variant === "banner" ? "h-64" : "max-h-96"}`} />
      );
    }
    case "gallery":
      return <GalleryGrid ctx={ctx} limit={block.limit ?? 4} />;
    case "video":
      return <VideoEmbed ctx={ctx} />;
    case "map":
      return <MapEmbed ctx={ctx} />;
    case "about": {
      if (!ctx.renderedSummary) return null;
      return (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          {block.heading !== "" && <h2 className="text-lg font-semibold text-zinc-900">{ctx.bind(block.heading) || "About"}</h2>}
          <p className="mt-3 text-zinc-600">{ctx.renderedSummary}</p>
        </section>
      );
    }
    case "description": {
      if (!ctx.renderedDescription) return null;
      return (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          {block.heading !== "" && <h2 className="text-lg font-semibold text-zinc-900">{ctx.bind(block.heading) || "Description"}</h2>}
          <div className="prose prose-zinc mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ctx.renderedDescription) }} />
        </section>
      );
    }
    case "details":
      return (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{ctx.bind(block.heading) || "Details"}</h2>
          <div className="mt-4">
            <DetailsGrid ctx={ctx} items={block.items} />
          </div>
        </section>
      );
    case "reviews":
      return (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              {ctx.bind(block.heading) || "Reviews"}
              {block.showCount !== false ? ` (${ctx.listing.reviewCount})` : ""}
            </h2>
            <Link href={`/listing/${ctx.listing.slug}/reviews`} className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <ReviewsList ctx={ctx} limit={block.limit ?? 3} showResponse={block.showResponse !== false} />
        </section>
      );
    case "reviewForm":
      return (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">{ctx.bind(block.heading) || "Write a Review"}</h2>
          <ReviewForm ctx={ctx} />
        </section>
      );
    case "divider":
      return <hr className="border-zinc-200" />;
    case "spacer":
      return <div style={{ height: block.height ?? 24 }} aria-hidden />;
    case "button": {
      const label = ctx.bind(block.text);
      const href = ctx.bind(block.href);
      if (!label || !href) return null;
      return (
        <Link href={href} className="inline-flex items-center rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
          {label}
        </Link>
      );
    }
    case "html": {
      if (!block.html?.trim()) return null;
      return <div className="prose prose-zinc max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }} />;
    }
    default:
      return null;
  }
}

/* ── SIDEBAR WIDGETS ───────────────────────────────────────────────────── */

function WidgetView({ widget, ctx }: { widget: SidebarWidget; ctx: ListingViewContext }) {
  if (!widget.enabled) return null;
  const title = widget.title ? ctx.bind(widget.title) : undefined;
  switch (widget.type) {
    case "contactForm":
      return <ContactCard ctx={ctx} title={title || "Contact This Business"} />;
    case "quickFacts":
      return <QuickFactsCard ctx={ctx} />;
    case "hours":
      return <HoursCard ctx={ctx} title={title || "Hours"} />;
    case "areas":
      return <AreasCard ctx={ctx} title={title || "Areas Served"} />;
    case "categories":
      return <CategoriesCard ctx={ctx} title={title || "Categories"} />;
    case "social":
      return <SocialCard ctx={ctx} title={title || "Connect"} />;
    case "map":
      return ctx.mapEmbedSrc ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          {title && <h3 className="mb-3 text-lg font-semibold text-zinc-900">{title}</h3>}
          <MapEmbed ctx={ctx} className="!rounded-lg" />
        </div>
      ) : null;
    case "claim":
      return <ClaimCard ctx={ctx} />;
    case "gallery":
      return ctx.galleryIds.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          {title && <h3 className="mb-4 text-lg font-semibold text-zinc-900">{title}</h3>}
          <GalleryStrip ctx={ctx} limit={widget.limit ?? 4} />
        </div>
      ) : null;
    case "text":
      return <TextCard title={title} html={ctx.bind(widget.text)} />;
    default:
      return null;
  }
}

/* ── RENDERER ──────────────────────────────────────────────────────────── */

/**
 * Renders a custom ListingTemplate against a listing's view-model.
 * Blocks and sidebar widgets are data-bound per listing at render time.
 */
export default function ListingTemplateRenderer({
  template,
  ctx,
}: {
  template: ListingTemplateData;
  ctx: ListingViewContext;
}) {
  const isSidebar = (template.layout ?? "sidebar") === "sidebar" && template.sidebar.length > 0;
  const blocks = template.blocks ?? [];
  const widgets = template.sidebar ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-900 hover:underline">Home</Link>
        {" / "}
        <Link href={`/g/${ctx.listing.categories[0]?.category?.slug}`} className="hover:text-zinc-900 hover:underline">
          {ctx.listing.categories[0]?.category?.title}
        </Link>
        {" / "}
        <span className="text-zinc-700">{ctx.listing.title}</span>
      </nav>

      <ListingHero ctx={ctx} variant={template.heroVariant ?? "default"} />

      {isSidebar ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {blocks.map((block) => (
              <BlockView key={block.id} block={block} ctx={ctx} />
            ))}
          </div>
          <aside className="space-y-6">
            {widgets.map((widget) => (
              <WidgetView key={widget.id} widget={widget} ctx={ctx} />
            ))}
          </aside>
        </div>
      ) : (
        <div className="mt-10 space-y-8">
          {blocks.map((block) => (
            <BlockView key={block.id} block={block} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  );
}
