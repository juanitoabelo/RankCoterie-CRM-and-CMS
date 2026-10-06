import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Block } from "@/lib/page-builder/types";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { filterIndexableRegions } from "@/lib/directory/indexGate";
import { getListingPage } from "@/lib/directory/listingQuery";
import { renderLocalizedContent } from "@/lib/localization/render";
import {
  resolveGeoCategoryTemplate,
  parseGeoCategoryTemplateData,
} from "@/modules/geo-category-template";
import GeoCategoryTemplateRenderer from "@/components/admin/geo-category-template-builder/GeoCategoryTemplateRenderer";
import type { GeoBindingData } from "@/lib/geo-category-template/geo-bindings";
import {
  SITE_URL,
  breadcrumbJsonLd,
  faqJsonLd,
  geoCategoryUrl,
  geoRegionUrl,
  itemListJsonLd,
  jsonLdHtml,
  parentGeoMetadata,
  parseJsonSchema,
} from "@/lib/seo/geoCategorySeo";

/** True when the template tree contains a block of the given type at any depth. */
function hasBlockOfType(value: unknown, type: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((v) => hasBlockOfType(v, type));
  const obj = value as Record<string, unknown>;
  return obj.type === type || Object.values(obj).some((v) => hasBlockOfType(v, type));
}

export const revalidate = 3600;

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  const repo = await getCatalogRepo();
  const categories = await repo.getCategories();
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const repo = await getCatalogRepo();
  const cat = await repo.getCategoryBySlug(category);
  if (!cat) return {};
  return parentGeoMetadata(cat);
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const repo = await getCatalogRepo();
  const cat = await repo.getCategoryBySlug(category);
  if (!cat) notFound();

  // Parent position image (CategoryImage PRIMARY — uploaded in the GeoCategory
  // edit page; alt/title/caption come from the Media Library edit drawer).
  const heroImage = await repo.getCategoryImage(cat.id, "PRIMARY");

  // "ALL" page: strip region tokens, show the state index — states that pass
  // the index gate (link set === index set; see lib/directory/indexGate.ts).
  const intro = renderLocalizedContent(cat.description, {});
  const allRegions = await repo.getRegions();
  const states = await filterIndexableRegions(
    repo,
    cat.id,
    allRegions.filter((r) => r.city === null),
  );
  const customSchema = parseJsonSchema(cat.jsonSchema);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: cat.title, url: geoCategoryUrl(cat.slug) },
  ]);
  const stateIndex = states.length
    ? itemListJsonLd(
        cat.title,
        renderLocalizedContent(cat.metaDesc || cat.description, {}),
        states.map((s) => ({
          name: s.stateFull,
          url: geoRegionUrl(cat.slug, s.slug),
        })),
      )
    : null;

  const scripts = (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }} />
      {stateIndex && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(stateIndex) }} />
      )}
      {customSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(customSchema) }} />
      )}
    </>
  );

  /* Custom single page template: per-category assignment → default template →
     null (legacy layout below). Resolution is try/catch-wrapped in the module
     so a missing table or stale client still renders the default page. */
  const template = await resolveGeoCategoryTemplate(cat.id);

  if (template) {
    const { blocks, containerSettings } = parseGeoCategoryTemplateData(template.data);

    if (blocks.length > 0) {
      const [contentRows, listingPage] = await Promise.all([
        repo.getCategoryRegionContent({ categoryId: cat.id }),
        getListingPage(repo, { categoryId: cat.id, regionId: "ALL" }),
      ]);

      // Parent-level FAQ: prefer explicit state="ALL" rows; otherwise fall back
      // to aggregating every category row (deduped by question).
      const allFaqRows = contentRows.filter((row) => (row.faq ?? []).length > 0);
      const parentFaqRows = allFaqRows.filter((row) => row.state === "ALL");
      const faqSource = parentFaqRows.length > 0 ? parentFaqRows : allFaqRows;
      const seenQuestions = new Set<string>();
      const faq = faqSource
        .flatMap((row) => row.faq ?? [])
        .filter((f) => {
          const q = renderLocalizedContent(f.q, {});
          if (!q.trim() || seenQuestions.has(q)) return false;
          seenQuestions.add(q);
          return true;
        })
        .map((f) => ({
          q: renderLocalizedContent(f.q, {}),
          a: renderLocalizedContent(f.a, {}),
        }))
        .filter((f) => f.a.trim());

      const listings = listingPage.visible.map((l) => ({
        id: l.id,
        title: l.title,
        slug: l.slug,
        href: `/listing/${l.slug}/`,
        summary: renderLocalizedContent(l.summary, {}),
        city: l.city,
        state: l.state,
        image: l.avatarImage ? `/api/assets/${l.avatarImage}` : null,
        tier: l.tier,
      }));

      const geo: GeoBindingData = {
        category: {
          title: cat.title,
          slug: cat.slug,
          // Parent page has no region ctx — strip region tokens exactly like the
          // legacy layout's `intro` above (renderLocalizedContent with {}).
          description: intro,
          stateInit: renderLocalizedContent(cat.stateInit, {}),
          cityInit: renderLocalizedContent(cat.cityInit, {}),
          metaDesc: cat.metaDesc,
          seoTitle: cat.seoTitle,
          focusKeyphrase: cat.focusKeyphrase,
        },
        region: null,
        categoryUrl: geoCategoryUrl(cat.slug),
        heroImage: heroImage ? `/api/assets/${heroImage.imageAssetId}` : null,
        heroImageAlt: heroImage?.alt || heroImage?.title || null,
        heroImageCaption: heroImage?.caption || null,
        stateImage: null,
        cityImage: null,
        statesCount: states.length,
        listingsCount: listings.length,
      };

      const stateLinks = states.map((s) => ({
        slug: s.slug,
        state: s.state,
        stateFull: s.stateFull,
        // In-page nav links stay relative (matches the legacy layout); the
        // absolute geoRegionUrl is reserved for JSON-LD above.
        url: `/g/${category}/${s.slug}/`,
      }));

      return (
        <div>
          {scripts}
          {faq.length > 0 && hasBlockOfType(blocks, "geoFaq") && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqJsonLd(faq)) }}
            />
          )}
          <GeoCategoryTemplateRenderer
            blocks={blocks as unknown as Block[]}
            containerSettings={containerSettings}
            geo={geo}
            states={stateLinks}
            faq={faq}
            listings={listings}
          />
        </div>
      );
    }
  }

  return (
    <div>
      {scripts}

      <p className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Directory
        </Link>{" "}
        / <span className="text-zinc-700">{cat.title}</span>
      </p>

      {heroImage && (
        <figure className="mt-4 max-w-3xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
            <Image
              src={`/api/assets/${heroImage.imageAssetId}`}
              alt={heroImage.alt || heroImage.title || ""}
              title={heroImage.title || undefined}
              fill
              sizes="(min-width: 1024px) 768px, 100vw"
              className="object-cover"
            />
          </div>
          {heroImage.caption && (
            <figcaption className="mt-2 text-xs text-zinc-500">{heroImage.caption}</figcaption>
          )}
        </figure>
      )}

      <div
        className="prose-sm mt-4 max-w-3xl text-zinc-700"
        dangerouslySetInnerHTML={{ __html: intro }}
      />

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">
        Programs by state
      </h2>

      {states.length === 0 ? (
        <p className="mt-4 text-zinc-500">No state guides published yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {states.map((s) => (
            <li key={s.id}>
              <Link
                href={`/g/${category}/${s.slug}/`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300"
              >
                <span className="font-medium text-zinc-800">{s.stateFull}</span>
                <span className="text-sm text-zinc-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}