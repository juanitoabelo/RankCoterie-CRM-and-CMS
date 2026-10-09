import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import { requireUser } from "@/modules/auth";
import ListingForm, {
  type ListingFormListing,
} from "@/components/admin/ListingForm";

export const revalidate = 0;

export default async function MyListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      categories: { select: { categoryId: true } },
      regions: { select: { regionId: true } },
    },
  });

  if (!listing || listing.claimedById !== user.id) notFound();

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
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Directory / <Link href="/admin/my-listing" className="text-zinc-700 hover:underline">My Listing</Link>{" "}
        / <span className="text-zinc-700">{listing.title}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Edit my listing
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Keep your business info up to date. Title, slug, category, and region
        changes require staff review.
      </p>
      <div className="mt-6 max-w-3xl">
        <ListingForm
          listing={formListing}
          categories={[]}
          regions={[]}
          submitLabel="Save changes"
          ownerMode
        />
      </div>
    </div>
  );
}