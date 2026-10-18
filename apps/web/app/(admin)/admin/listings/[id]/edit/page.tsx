import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/modules/shared";
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
  const [listing, categories, regions, templates] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        categories: { select: { categoryId: true } },
        regions: { select: { regionId: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { slug: "asc" } }),
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
    prisma.listingTemplate.findMany({
      select: { id: true, name: true, isPreset: true },
      orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    }),
  ]);

  if (!listing) notFound();

  /** Form fields expect JSON columns serialized as strings. */
  const jsonString = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    return typeof v === "string" ? v : JSON.stringify(v);
  };

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
    address: listing.address,
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    lat: listing.lat,
    lng: listing.lng,
    summary: listing.summary,
    description: listing.description,
    isLandingPage: listing.isLandingPage,
    categoryIds: listing.categories.map((c) => c.categoryId),
    regionIds: listing.regions.map((r) => r.regionId),
    avatarImage: listing.avatarImage,
    feedImage: listing.feedImage,
    galleryImages: jsonString(listing.galleryImages),
    videoUrl: listing.videoUrl,
    googleMapsUrl: listing.googleMapsUrl,
    hoursOfOperation: jsonString(listing.hoursOfOperation),
    specialties: jsonString(listing.specialties),
    amenities: jsonString(listing.amenities),
    certifications: jsonString(listing.certifications),
    insuranceAccepted: jsonString(listing.insuranceAccepted),
    pricing: jsonString(listing.pricing),
    seoTitle: listing.seoTitle,
    metaDesc: listing.metaDesc,
    focusKeyphrase: listing.focusKeyphrase,
    ogImage: listing.ogImage,
    canonicalUrl: listing.canonicalUrl,
    robotsIndex: listing.robotsIndex,
    robotsFollow: listing.robotsFollow,
    listingTemplateId: listing.listingTemplateId,
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
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Edit listing</h1>
        <Link
          href={`/listing/${listing.slug}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          View Listing →
        </Link>
      </div>
      <div className="mt-6 max-w-3xl">
        <ListingForm
          listing={formListing}
          categories={categoryOptions}
          regions={regionOptions}
          templates={templates}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}