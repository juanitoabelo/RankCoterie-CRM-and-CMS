import { prisma } from "@/lib/directory/prismaCatalog";
import ListingForm, {
  type ListingFormCategory,
  type ListingFormListing,
} from "@/components/admin/ListingForm";
import type { PickerRegion } from "@/components/regions/RegionPicker";

export const revalidate = 0;

export default async function NewListingPage() {
  const [categories, regions] = await Promise.all([
    prisma.category.findMany({ orderBy: { slug: "asc" } }),
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
  ]);

  const categoryOptions: ListingFormCategory[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
  }));
  const regionOptions: PickerRegion[] = regions.map((r) => ({
    id: r.id,
    state: r.state,
    stateFull: r.stateFull,
    city: r.city,
  }));

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / Listings / <span className="text-zinc-700">New</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">New listing</h1>
      <div className="mt-6 max-w-3xl">
        <ListingForm
          listing={null}
          categories={categoryOptions}
          regions={regionOptions}
          submitLabel="Create listing"
        />
      </div>
    </div>
  );
}