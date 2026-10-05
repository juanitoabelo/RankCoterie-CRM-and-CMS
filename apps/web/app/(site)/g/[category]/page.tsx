import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { filterIndexableRegions } from "@/lib/directory/indexGate";
import { renderLocalizedContent } from "@/lib/localization/render";
import {
  SITE_URL,
  breadcrumbJsonLd,
  geoCategoryUrl,
  geoRegionUrl,
  itemListJsonLd,
  jsonLdHtml,
  parentGeoMetadata,
  parseJsonSchema,
} from "@/lib/seo/geoCategorySeo";

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

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }} />
      {stateIndex && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(stateIndex) }} />
      )}
      {customSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(customSchema) }} />
      )}

      <p className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Directory
        </Link>{" "}
        / <span className="text-zinc-700">{cat.title}</span>
      </p>

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