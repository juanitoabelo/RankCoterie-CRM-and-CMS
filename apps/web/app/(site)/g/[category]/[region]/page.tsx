import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { resolveCategoryContent } from "@/lib/directory/resolveContent";
import { renderLocalizedContent, regionContext } from "@/lib/localization/render";
import RegionListings from "@/components/RegionListings";

export const revalidate = 3600;

interface Props {
  params: Promise<{ category: string; region: string }>;
}

export async function generateStaticParams() {
  const repo = await getCatalogRepo();
  const categories = await repo.getCategories();
  const regions = await repo.getRegions();
  return categories.flatMap((c) => regions.map((r) => ({ category: c.slug, region: r.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, region } = await params;
  const repo = await getCatalogRepo();
  const [cat, reg] = await Promise.all([
    repo.getCategoryBySlug(category),
    repo.getRegionBySlug(region),
  ]);
  if (!cat || !reg) return {};
  const ctx = regionContext(regionNameOf(reg), reg.slug);
  return {
    title: renderLocalizedContent(`${cat.title} {{in region}}`, ctx),
    description: renderLocalizedContent(cat.description, ctx),
  };
}

function regionNameOf(region: { city: string | null; state: string; stateFull: string }): string {
  return region.city ? `${region.city}, ${region.state}` : region.stateFull;
}

export default async function RegionPage({ params }: Props) {
  const { category, region } = await params;
  const repo = await getCatalogRepo();
  const [cat, reg] = await Promise.all([
    repo.getCategoryBySlug(category),
    repo.getRegionBySlug(region),
  ]);
  if (!cat || !reg) notFound();

  const ctx = regionContext(regionNameOf(reg), reg.slug);

  // Content resolution (state/city/area-part rules) + token render.
  const contents = await repo.getCategoryRegionContent({
    categoryId: cat.id,
    state: reg.state,
  });
  const resolved = resolveCategoryContent(cat, reg, contents);
  const introHtml = renderLocalizedContent(resolved.intro, ctx);
  const descHtml = renderLocalizedContent(resolved.description, ctx);

  // City links for a state page (child regions under this state).
  const cities = reg.city === null ? await repo.getChildRegions(cat.id, reg.state) : [];

  return (
    <div>
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

      <RegionListings
        categorySlug={cat.slug}
        regionSlug={reg.slug}
        categoryId={cat.id}
        regionId={reg.id}
        regionCtx={ctx}
      />
    </div>
  );
}