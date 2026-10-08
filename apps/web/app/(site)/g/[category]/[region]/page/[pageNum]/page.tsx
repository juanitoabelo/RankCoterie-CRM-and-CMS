import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { resolveRegionPageIndexable } from "@/lib/directory/indexGate";
import { resolveCategoryContent } from "@/lib/directory/resolveContent";
import { regionContext, renderLocalizedContent } from "@/lib/localization/render";
import { jsonLdHtml, parseJsonSchema, regionPageGeoMetadata } from "@/lib/seo/geoCategorySeo";
import { resolveGeoCategoryContainerStyle } from "@/modules/geo-category-template";
import { resolveRegionFaqs, resolveRegionTemplateView } from "@/lib/directory/regionTemplate";
import GeoCategoryTemplateRenderer from "@/components/admin/geo-category-template-builder/GeoCategoryTemplateRenderer";
import RegionListings from "@/components/RegionListings";

export const revalidate = 3600;

interface Props {
  params: Promise<{ category: string; region: string; pageNum: string }>;
}

export async function generateStaticParams() {
  const repo = await getCatalogRepo();
  const categories = await repo.getCategories();
  const regions = await repo.getRegions();
  // Page 1 lives at /g/{cat}/{region}/ — only numbers 2..k are generated statically.
  const pages = categories.flatMap((c) =>
    regions.map((r) => ({
      category: c.slug,
      region: r.slug,
      pageNum: "2",
    })),
  );
  return pages;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, region, pageNum } = await params;
  const repo = await getCatalogRepo();
  const [cat, reg] = await Promise.all([
    repo.getCategoryBySlug(category),
    repo.getRegionBySlug(region),
  ]);
  if (!cat || !reg) return {};
  const pageNumInt = Number.parseInt(pageNum, 10) || 2;
  // Index gate: region must earn it AND listings must spill onto this page
  // (otherwise /page/2/ is a clamped duplicate of page 1).
  const indexable = await resolveRegionPageIndexable(repo, cat.id, reg, pageNumInt);
  return regionPageGeoMetadata(cat, reg, pageNumInt, { indexable });
}

export default async function RegionPagePaginated({ params }: Props) {
  const { category, region, pageNum } = await params;
  const resolvedPage = Number.parseInt(pageNum, 10);
  if (!Number.isInteger(resolvedPage) || resolvedPage < 2) notFound();

  const repo = await getCatalogRepo();
  const [cat, reg] = await Promise.all([
    repo.getCategoryBySlug(category),
    repo.getRegionBySlug(region),
  ]);
  if (!cat || !reg) notFound();

  const ctx = regionContext(reg.city ? `${reg.city}, ${reg.state}` : reg.stateFull, reg.slug);
  const customSchema = parseJsonSchema(cat.jsonSchema);

  // Same live data as the base region page so page N renders the template
  // chrome (hero, FAQ, sidebar) with only the listings slot paginated.
  const contents = await repo.getCategoryRegionContent({
    categoryId: cat.id,
    state: reg.state,
  });
  const resolved = resolveCategoryContent(cat, reg, contents);
  const introHtml = renderLocalizedContent(resolved.intro, ctx);
  const descHtml = renderLocalizedContent(resolved.description, ctx);
  const faqs = resolveRegionFaqs(contents, reg, ctx);
  const heroImage = await repo.getCategoryImage(
    cat.id,
    reg.city === null ? "STATE" : "CITY",
    reg.id,
  );

  const templateView = await resolveRegionTemplateView({
    repo,
    cat,
    reg,
    ctx,
    introHtml,
    descHtml,
    faqs,
    heroImage,
  });

  if (templateView) {
    return (
      <div>
        {customSchema && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(customSchema) }} />
        )}
        <GeoCategoryTemplateRenderer
          blocks={templateView.blocks}
          containerSettings={templateView.containerSettings}
          geo={templateView.geo}
          states={templateView.states}
          faq={templateView.faq}
          listings={templateView.listings}
          listingsSlot={
            <RegionListings
              categorySlug={cat.slug}
              regionSlug={reg.slug}
              categoryId={cat.id}
              regionId={reg.id}
              regionCtx={ctx}
              page={resolvedPage}
            />
          }
        />
      </div>
    );
  }

  const containerStyle = await resolveGeoCategoryContainerStyle(cat.id);

  return (
    <div style={containerStyle}>
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
        /{" "}
        <Link href={`/g/${cat.slug}/${reg.slug}/`} className="hover:text-zinc-800">
          {ctx.regionName}
        </Link>{" "}
        / <span className="text-zinc-700">page {resolvedPage}</span>
      </p>

      <RegionListings
        categorySlug={cat.slug}
        regionSlug={reg.slug}
        categoryId={cat.id}
        regionId={reg.id}
        regionCtx={ctx}
        page={resolvedPage}
      />
    </div>
  );
}