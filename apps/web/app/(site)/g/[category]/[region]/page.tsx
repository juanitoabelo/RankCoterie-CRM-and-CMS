import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { resolveCategoryContent } from "@/lib/directory/resolveContent";
import { filterIndexableRegions, resolveRegionIndexable } from "@/lib/directory/indexGate";
import { renderLocalizedContent, regionContext } from "@/lib/localization/render";
import {
  SITE_URL,
  breadcrumbJsonLd,
  faqJsonLd,
  geoCategoryUrl,
  geoRegionUrl,
  itemListJsonLd,
  jsonLdHtml,
  parseJsonSchema,
  regionDisplayName,
  regionGeoMetadata,
} from "@/lib/seo/geoCategorySeo";
import RegionListings from "@/components/RegionListings";
import RegionFilterBar from "@/components/RegionFilterBar";

export const revalidate = 3600;

interface Props {
  params: Promise<{ category: string; region: string }>;
  searchParams: Promise<{ 
    sort?: string; 
    tier?: string; 
    rating?: string;
    page?: string;
  }>;
}

export async function generateStaticParams() {
  const repo = await getCatalogRepo();
  const categories = await repo.getCategories();
  const regions = await repo.getRegions();
  return categories.flatMap((c) => regions.map((r) => ({ category: c.slug, region: r.slug })));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category, region } = await params;
  const { sort, tier } = await searchParams;
  const repo = await getCatalogRepo();
  const [cat, reg] = await Promise.all([
    repo.getCategoryBySlug(category),
    repo.getRegionBySlug(region),
  ]);
  if (!cat || !reg) return {};
  const indexable = await resolveRegionIndexable(repo, cat.id, reg);
  const metadata = regionGeoMetadata(cat, reg, { indexable });
  const sortLabel = sort ? ` - Sorted by ${sort}` : "";
  const tierLabel = tier ? ` - ${tier}` : "";
  const baseTitle = typeof metadata.title === "string" ? metadata.title : cat.title;
  return { ...metadata, title: `${baseTitle}${sortLabel}${tierLabel}` };
}

export default async function RegionPage({ params, searchParams }: Props) {
  const { category, region } = await params;
  const { sort = "featured", tier, rating, page = "1" } = await searchParams;
  const repo = await getCatalogRepo();
  const [cat, reg] = await Promise.all([
    repo.getCategoryBySlug(category),
    repo.getRegionBySlug(region),
  ]);
  if (!cat || !reg) notFound();

  const ctx = regionContext(regionDisplayName(reg), reg.slug);

  // State pages show the STATE position image, city pages the CITY one
  // (uploaded in the GeoCategory edit page; text from the Media Library).
  const heroImage = await repo.getCategoryImage(
    cat.id,
    reg.city === null ? "STATE" : "CITY",
    reg.id,
  );

  // Content resolution (state/city/area-part rules) + token render.
  const contents = await repo.getCategoryRegionContent({
    categoryId: cat.id,
    state: reg.state,
  });
  const resolved = resolveCategoryContent(cat, reg, contents);
  const introHtml = renderLocalizedContent(resolved.intro, ctx);
  const descHtml = renderLocalizedContent(resolved.description, ctx);

  // FAQ blocks — same (state, areaPart) match rule as resolveContent. Tokens
  // render per region, and the FAQPage JSON-LD below mirrors exactly this list.
  const stateContents = contents.filter((c) => c.state === reg.state);
  const matchedFaqRow =
    reg.city === null
      ? stateContents.find((c) => c.areaPart === "ALL")
      : stateContents.find((c) => c.areaPart === reg.areaPart);
  const faqs = (matchedFaqRow?.faq ?? [])
    .map((f) => ({ q: renderLocalizedContent(f.q, ctx), a: renderLocalizedContent(f.a, ctx) }))
    .filter((f) => f.q.trim() && f.a.trim());

  // City links for a state page (child regions under this state) — same index
  // gate: only cities that earn indexing are surfaced as links.
  let cities = reg.city === null ? await repo.getChildRegions(cat.id, reg.state) : [];
  cities = await filterIndexableRegions(repo, cat.id, cities);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: cat.title, url: geoCategoryUrl(cat.slug) },
    { name: ctx.regionName ?? reg.slug, url: geoRegionUrl(cat.slug, reg.slug) },
  ]);
  const cityList = cities.length
    ? itemListJsonLd(
        `Cities in ${ctx.regionName ?? reg.slug}`,
        renderLocalizedContent(cat.metaDesc || cat.description, ctx),
        cities.map((c) => ({
          name: c.city ?? c.slug,
          url: geoRegionUrl(cat.slug, c.slug),
        })),
      )
    : null;
  const customSchema = parseJsonSchema(cat.jsonSchema);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }} />
      {cityList && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(cityList) }} />
      )}
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqJsonLd(faqs)) }} />
      )}
      {customSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(customSchema) }} />
      )}

      <p className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Directory
        </Link>{" "}
        /{" "}
        <Link href={`/g/${cat.slug}/`} className="hover:text-zinc-800">
          {cat.title}
        </Link>{" "}
        / <span className="text-zinc-700">{ctx.regionName}</span>
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
        dangerouslySetInnerHTML={{ __html: introHtml }}
      />
      {descHtml && (
        <div
          className="mt-3 max-w-3xl text-zinc-600"
          dangerouslySetInnerHTML={{ __html: descHtml }}
        />
      )}

      {faqs.length > 0 && (
        <section className="mt-8 max-w-3xl" aria-label="Frequently asked questions">
          <h2 className="text-lg font-semibold text-zinc-900">Frequently asked questions</h2>
          <dl className="mt-3 space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-medium text-zinc-900">{f.q}</dt>
                <dd className="mt-1 text-sm text-zinc-600">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {cities.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900">Cities in {ctx.regionName}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/g/${cat.slug}/${c.slug}/`}
                  className="inline-block rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-300"
                >
                  {c.city}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RegionFilterBar
        categorySlug={cat.slug}
        regionSlug={reg.slug}
        currentSort={sort}
        currentTier={tier ?? ""}
        currentRating={rating ?? ""}
      />

      <RegionListings
        categorySlug={cat.slug}
        regionSlug={reg.slug}
        categoryId={cat.id}
        regionId={reg.id}
        regionCtx={ctx}
        page={parseInt(page, 10)}
        sort={sort}
        tierFilter={tier}
        ratingFilter={rating}
      />
    </div>
  );
}
