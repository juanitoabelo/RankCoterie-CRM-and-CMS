import { notFound } from "next/navigation";
import { prisma } from "@/lib/directory/prismaCatalog";
import ListingForm, {
  type ListingFormCategory,
  type ListingFormListing,
} from "@/components/admin/ListingForm";
import type { PickerRegion } from "@/components/regions/RegionPicker";

export const revalidate = 0;

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, categories, regions] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        categories: { select: { categoryId: true } },
        regions: { select: { regionId: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { slug: "asc" } }),
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
  ]);

  if (!listing) notFound();

  const formListing: ListingFormListing = {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    domainKey: listing.domainKey,
    tier: listing.tier,
    status: listing.status,
    companyName: listing.companyName,
    phone: listing.phone,
    email: listing.email,
    website: listing.website,
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    summary: listing.summary,
    isLandingPage: listing.isLandingPage,
    categoryIds: listing.categories.map((c) => c.categoryId),
    regionIds: listing.regions.map((r) => r.regionId),
  };

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
        Admin / Listings / <span className="text-zinc-700">{listing.title}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit listing</h1>
      <div className="mt-6 max-w-3xl">
        <ListingForm
          listing={formListing}
          categories={categoryOptions}
          regions={regionOptions}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}