import { prisma } from "@/lib/directory/prismaCatalog";
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

  const [article, categories, regions] = await Promise.all([
    prisma.contentTemplate.findUnique({
      where: { id },
      include: { variants: { select: { id: true, regionId: true, status: true } } },
    }),
    prisma.category.findMany({ orderBy: { slug: "asc" } }),
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
  ]);

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
  };

  const pickerRegions: PickerRegion[] = regions.map((r) => ({
    id: r.id,
    state: r.state,
    stateFull: r.stateFull,
    city: r.city,
  }));

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/articles" className="hover:text-zinc-700">Articles</a> /{" "}
        <span className="text-zinc-700">{article.title}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Edit: {article.title}
      </h1>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Article content</h2>
        <ArticleForm
          article={{
            id: article.id,
            title: article.title,
            slug: article.slug,
            body: article.body,
            metaDesc: article.metaDesc,
            categoryId: article.categoryId,
            status: article.status,
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
