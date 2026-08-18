import { prisma } from "@/lib/directory/prismaCatalog";
import VariantPublisher, { type TemplateOption } from "@/components/admin/VariantPublisher";
import type { PickerRegion } from "@/components/regions/RegionPicker";

export const revalidate = 0; // admin — always fresh

export default async function ContentAdminPage() {
  const [templates, regions] = await Promise.all([
    prisma.contentTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      include: { variants: { select: { status: true } } },
    }),
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
  ]);

  const templateOptions: TemplateOption[] = templates.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    variantCount: t.variants.length,
  }));

  const pickerRegions: PickerRegion[] = regions.map((r) => ({
    id: r.id,
    state: r.state,
    stateFull: r.stateFull,
    city: r.city,
  }));

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Localization — variant publisher</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Content variant publisher</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Author content once with tokens; publish materializes a per-region variant
        (rendered, stored, served via ISR). Unchanged variants are skipped on republish.
      </p>

      <div className="mt-8">
        {templateOptions.length === 0 ? (
          <p className="text-zinc-500">
            No content templates yet — seed or create one in the database.
          </p>
        ) : (
          <VariantPublisher templates={templateOptions} regions={pickerRegions} />
        )}
      </div>
    </div>
  );
}