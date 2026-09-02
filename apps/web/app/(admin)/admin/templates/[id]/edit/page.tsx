import { prisma } from "@/lib/directory/prismaCatalog";
import ArticleForm from "@/components/admin/ArticleForm";
import VariantPublisherRefresh from "@/components/admin/VariantPublisherRefresh";
import type { TemplateOption } from "@/components/admin/VariantPublisher";
import type { PickerRegion } from "@/components/regions/RegionPicker";
import { updateTemplate } from "../../actions";

export const revalidate = 0;

export default async function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [template, categories, regions] = await Promise.all([
    prisma.contentTemplate.findUnique({
      where: { id },
      include: { variants: { select: { id: true, regionId: true, status: true } } },
    }),
    prisma.category.findMany({ orderBy: { slug: "asc" } }),
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
  ]);

  if (!template) {
    return <p className="text-sm text-zinc-500">Template not found.</p>;
  }

  const formCategories = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
  }));

  const templateOption: TemplateOption = {
    id: template.id,
    title: template.title,
    status: template.status,
    variantCount: template.variants.length,
  };

  const pickerRegions: PickerRegion[] = regions.map((r) => ({
    id: r.id,
    state: r.state,
    stateFull: r.stateFull,
    city: r.city,
  }));

  const updateAction = async (formData: FormData) => {
    "use server";
    return updateTemplate(id, formData);
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/templates" className="hover:text-zinc-700">Templates</a> /{" "}
        <span className="text-zinc-700">{template.title}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Edit: {template.title}
      </h1>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Template content</h2>
        <ArticleForm
          article={{
            id: template.id,
            title: template.title,
            slug: template.slug,
            body: template.body,
            metaDesc: template.metaDesc,
            categoryId: template.categoryId,
            status: template.status,
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
          Select regions to generate a localized version for each area.
          Tokens like {"{{region}}"} will be replaced with the region name.
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
