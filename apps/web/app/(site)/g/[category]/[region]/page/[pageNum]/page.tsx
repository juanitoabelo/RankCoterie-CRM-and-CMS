import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { renderLocalizedContent, regionContext } from "@/lib/localization/render";
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
  const { category, region } = await params;
  const repo = await getCatalogRepo();
  const [cat, reg] = await Promise.all([
    repo.getCategoryBySlug(category),
    repo.getRegionBySlug(region),
  ]);
  if (!cat || !reg) return {};
  return {
    title: renderLocalizedContent(`${cat.title} {{in region}}`, regionContext(reg.city ? `${reg.city}, ${reg.state}` : reg.stateFull, reg.slug)),
  };
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