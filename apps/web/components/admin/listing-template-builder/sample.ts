import type { ListingRowLike, RegionRow } from "@/components/site/listing/listing-view-model";

/** Sample listing used by the Structure canvas previews and the Visual preview fallback. */
export function createSampleListingRow(): ListingRowLike {
  return {
    id: "sample-listing",
    slug: "sample-listing",
    title: "Sample Business",
    companyName: "Sample Co",
    summary: "This is a sample listing, shown so you can preview the template as visitors will see it.",
    description:
      "<p>Template blocks bind to the current listing at render time. Use the Structure Display to edit blocks, then switch to Visual Display to see the result with real or sample data.</p><h2>A section heading</h2><p>Every content field supports data-binding tokens like {{title}} and {{city}}.</p>",
    phone: "(305) 555-0100",
    email: "hello@example.com",
    website: "https://example.com",
    address: "123 Main Street",
    city: "Miami",
    state: "FL",
    zip: "33101",
    tier: "pro",
    status: "APPROVED",
    avatarImage: null,
    feedImage: null,
    galleryImages: [],
    videoUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Miami,FL",
    lat: 25.7617,
    lng: -80.1918,
    featuredUntil: null,
    claimedById: null,
    badges: [],
    social: { facebook: "https://facebook.com/example", instagram: "https://instagram.com/example" },
    specialties: ["Residential", "Outpatient"],
    amenities: ["Parking", "WiFi"],
    certifications: ["Joint Commission accredited"],
    insuranceAccepted: ["Aetna", "Blue Cross"],
    hoursOfOperation: {
      monday: { opens: "09:00", closes: "17:00" },
      tuesday: { opens: "09:00", closes: "17:00" },
      wednesday: { opens: "09:00", closes: "17:00" },
      thursday: { opens: "09:00", closes: "17:00" },
      friday: { opens: "09:00", closes: "17:00" },
    },
    reviewCount: 12,
    averageRating: 4.5,
    createdAt: new Date("2024-06-01T12:00:00.000Z"),
    categories: [
      { category: { id: "sample-category", title: "Residential Treatment Centers", slug: "residential-treatment-centers" } },
    ],
    regions: [{ regionId: "sample-region" }],
    reviews: [
      {
        id: "sample-review-1",
        rating: 5,
        title: "Excellent care",
        content: "The team was supportive every step of the way.",
        response: null,
        authorName: "Jordan P.",
        createdAt: new Date("2026-01-10T12:00:00.000Z"),
      },
      {
        id: "sample-review-2",
        rating: 4,
        title: "Highly recommend",
        content: "Professional staff and a clean facility.",
        response: "Thank you for the kind words!",
        authorName: "Alex M.",
        createdAt: new Date("2026-02-14T12:00:00.000Z"),
      },
    ],
  };
}

export const SAMPLE_REGION_ROWS: RegionRow[] = [
  { id: "sample-region", state: "FL", stateFull: "Florida", city: "Miami" },
];
