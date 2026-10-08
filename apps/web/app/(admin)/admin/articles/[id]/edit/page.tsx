import { getArticleEditData } from "@/modules/content";
import ArticleForm from "@/components/admin/ArticleForm";
import VariantPublisherRefresh from "@/components/admin/VariantPublisherRefresh";
import type { TemplateOption } from "@/components/admin/VariantPublisher";
import type { PickerRegion } from "@/components/regions/RegionPicker";

export const revalidate = 0;

export default async function ArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { article, categories, regions } = await getArticleEditData(id);

  if (!article) {
    return <p className="text-sm text-zinc-500">Article not found.</p>;
  }

  const formCategories = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
  }));

  const templateOption: TemplateOption = {
    id: article.id,
    title: article.title,
    status: article.status,
    variantCount: article.variants.length,
    regionIds: article.variants.map((v) => v.regionId),
  };

  const pickerRegions: PickerRegion[] = regions.map((r) => ({
    id: r.id,
    state: r.state,
    stateFull: r.stateFull,
    city: r.city,
  }));

  const isLive = article.status === "LIVE";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            Admin / <a href="/admin/articles" className="hover:text-zinc-700">Articles</a> /{" "}
            <span className="text-zinc-700">{article.title}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Edit: {article.title}
          </h1>
        </div>
        {article.slug &&
          (isLive ? (
            <a
              href={`/${article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              View single post
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ) : (
            <span
              title="Only LIVE articles are visible on the public site. Set status to LIVE to preview."
              className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-400"
            >
              View single post
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </span>
          ))}
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Article content</h2>
        <ArticleForm
          article={{
            id: article.id,
            title: article.title,
            slug: article.slug,
            body: article.body,
            metaDesc: article.metaDesc,
            featuredImageAssetId: article.featuredImageAssetId,
            categoryId: article.categoryId,
            status: article.status,
            seoTitle: article.seoTitle,
            metaKeywords: article.metaKeywords,
            focusKeyphrase: article.focusKeyphrase,
            ogImage: article.ogImage,
            canonicalUrl: article.canonicalUrl,
            robotsIndex: article.robotsIndex,
            robotsFollow: article.robotsFollow,
            jsonSchema: article.jsonSchema,
          }}
          categories={formCategories}
          submitLabel="Save changes"
        />
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">
          Region variants — publish localized versions
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Select regions below to generate a localized version of this article for each area.
          Tokens like {"{{region}}"} in the body will be replaced with the region name.
        </p>
        <div className="mt-4">
          <VariantPublisherRefresh
            templates={[templateOption]}
            regions={pickerRegions}
          />
        </div>
      </div>
    </div>
  );
}
