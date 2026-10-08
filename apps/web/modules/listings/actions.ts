"use server";

/**
 * Listings Module — Server Actions
 * 
 * Server actions for listing CRUD operations.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import type { ListingTier, ListingStatus } from "@/lib/directory/visibility";
import { TENANT_ID } from "@/lib/tenant";
import { readFreeGraceDays } from "@/lib/billing/checkout";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type DuplicateListing = {
  id: string;
  title: string;
  slug: string;
  tier: string;
  status: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  domainKey: string | null;
  companyName: string | null;
};

export type DuplicateCheckResult =
  | { ok: true; duplicates: DuplicateListing[] }
  | { ok: false; error: string; duplicates: DuplicateListing[] };

export type PreviewListingResult =
  | { ok: true; previewUrl: string; message: string }
  | { ok: false; error: string };

export interface ListingFormInput {
  title: string;
  slug: string;
  domainKey?: string;
  tier: ListingTier;
  status: ListingStatus;
  companyName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: string;
  lng?: string;
  summary?: string;
  description?: string;
  isLandingPage: boolean;
  categoryIds: string[];
  regionIds: string[];
  avatarImage?: string;
  feedImage?: string;
  galleryImages?: string;
  videoUrl?: string;
  hoursOfOperation?: string;
  specialties?: string;
  amenities?: string;
  certifications?: string;
  insuranceAccepted?: string;
  pricing?: string;
  seoTitle?: string;
  metaDesc?: string;
  focusKeyphrase?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
}

function parseForm(formData: FormData): ListingFormInput {
  const asString = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || undefined;
  };
  const asBool = (k: string) => formData.get(k) === "on";
  const asJson = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    if (!v) return undefined;
    try { JSON.parse(v); return v; } catch { return undefined; }
  };
  return {
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    domainKey: asString("domainKey"),
    tier: (formData.get("tier") as ListingTier) ?? "FREE",
    status: (formData.get("status") as ListingStatus) ?? "DRAFT",
    companyName: asString("companyName"),
    phone: asString("phone"),
    email: asString("email"),
    website: asString("website"),
    address: asString("address"),
    city: asString("city"),
    state: asString("state"),
    zip: asString("zip"),
    lat: asString("lat"),
    lng: asString("lng"),
    summary: asString("summary"),
    description: asString("description"),
    isLandingPage: formData.get("isLandingPage") === "on",
    categoryIds: formData.getAll("categoryIds").map(String),
    regionIds: formData.getAll("regionIds").map(String),
    avatarImage: asString("avatarImage"),
    feedImage: asString("feedImage"),
    galleryImages: asString("galleryImages"),
    videoUrl: asString("videoUrl"),
    hoursOfOperation: asJson("hoursOfOperation"),
    specialties: asJson("specialties"),
    amenities: asJson("amenities"),
    certifications: asJson("certifications"),
    insuranceAccepted: asJson("insuranceAccepted"),
    pricing: asJson("pricing"),
    seoTitle: asString("seoTitle"),
    metaDesc: asString("metaDesc"),
    focusKeyphrase: asString("focusKeyphrase"),
    ogImage: asString("ogImage"),
    canonicalUrl: asString("canonicalUrl"),
    robotsIndex: asBool("robotsIndex"),
    robotsFollow: asBool("robotsFollow"),
  };
}

function validate(input: ListingFormInput): string | null {
  if (!input.title) return "Title is required.";
  if (!input.slug) return "Slug is required.";
  if (!/^[a-z0-9-]+$/.test(input.slug)) {
    return "Slug must be lowercase letters, digits and hyphens only.";
  }
  if (input.categoryIds.length === 0) return "Select at least one category.";
  if (input.regionIds.length < 3) return "Select 3–5 nearby areas for best results.";
  if (input.regionIds.length > 5) return "Select at most 5 nearby areas.";
  return null;
}

export async function createListing(formData: FormData): Promise<ActionResult> {
  const input = parseForm(formData);
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  try {
    const existing = await prisma.listing.findUnique({ where: { slug: input.slug } });
    if (existing) return { ok: false, error: `Slug "${input.slug}" is already taken.` };

    const listing = await prisma.listing.create({
      data: {
        tenantId: TENANT_ID,
        title: input.title,
        slug: input.slug,
        domainKey: input.domainKey,
        tier: input.tier,
        status: input.status,
        companyName: input.companyName,
        phone: input.phone,
        email: input.email,
        website: input.website,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        lat: input.lat ? Number(input.lat) : null,
        lng: input.lng ? Number(input.lng) : null,
        summary: input.summary,
        description: input.description,
        isLandingPage: input.isLandingPage,
        avatarImage: input.avatarImage,
        feedImage: input.feedImage,
        galleryImages: input.galleryImages,
        videoUrl: input.videoUrl,
        hoursOfOperation: input.hoursOfOperation,
        specialties: input.specialties,
        amenities: input.amenities,
        certifications: input.certifications,
        insuranceAccepted: input.insuranceAccepted,
        pricing: input.pricing,
        seoTitle: input.seoTitle,
        metaDesc: input.metaDesc,
        focusKeyphrase: input.focusKeyphrase,
        ogImage: input.ogImage,
        canonicalUrl: input.canonicalUrl,
        robotsIndex: input.robotsIndex ?? true,
        robotsFollow: input.robotsFollow ?? true,
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
        regions: { create: input.regionIds.map((regionId) => ({ regionId })) },
      },
    });

    await logAudit({
      action: "LISTING_CREATE",
      entity: "Listing",
      entityId: listing.id,
      meta: { tier: input.tier, status: input.status, categoryIds: input.categoryIds },
    });
    revalidatePath("/admin/listings");
    redirect("/admin/listings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create listing." };
  }
}

export async function updateListing(id: string, formData: FormData): Promise<ActionResult> {
  const input = parseForm(formData);
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  try {
    const dup = await prisma.listing.findFirst({
      where: { slug: input.slug, id: { not: id } },
    });
    if (dup) return { ok: false, error: `Slug "${input.slug}" is already taken.` };

    await prisma.$transaction(async (tx) => {
      await tx.listingCategory.deleteMany({ where: { listingId: id } });
      await tx.listingRegion.deleteMany({ where: { listingId: id } });
      await tx.listing.update({
        where: { id },
        data: {
          title: input.title,
          slug: input.slug,
          domainKey: input.domainKey,
          tier: input.tier,
          status: input.status,
          companyName: input.companyName,
          phone: input.phone,
          email: input.email,
          website: input.website,
          address: input.address,
          city: input.city,
          state: input.state,
          zip: input.zip,
          lat: input.lat ? Number(input.lat) : null,
          lng: input.lng ? Number(input.lng) : null,
          summary: input.summary,
          description: input.description,
          isLandingPage: input.isLandingPage,
          avatarImage: input.avatarImage,
          feedImage: input.feedImage,
          galleryImages: input.galleryImages,
          videoUrl: input.videoUrl,
          hoursOfOperation: input.hoursOfOperation,
          specialties: input.specialties,
          amenities: input.amenities,
          certifications: input.certifications,
        insuranceAccepted: input.insuranceAccepted,
        pricing: input.pricing,
        seoTitle: input.seoTitle,
        metaDesc: input.metaDesc,
        focusKeyphrase: input.focusKeyphrase,
        ogImage: input.ogImage,
        canonicalUrl: input.canonicalUrl,
        robotsIndex: input.robotsIndex ?? true,
        robotsFollow: input.robotsFollow ?? true,
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
        regions: { create: input.regionIds.map((regionId) => ({ regionId })) },
      },
      });
    });

    await logAudit({
      action: "LISTING_UPDATE",
      entity: "Listing",
      entityId: id,
      meta: { tier: input.tier, status: input.status },
    });
    revalidatePath("/admin/listings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update listing." };
  }
}

/** Review queue: approve → LIVE (FREE tier gets the migration grace window). */
export async function approveListing(id: string): Promise<ActionResult> {
  try {
    const [listing, tenant] = await Promise.all([
      prisma.listing.findUnique({ where: { id } }),
      prisma.tenant.findUnique({ where: { id: TENANT_ID } }).catch(() => null),
    ]);
    if (!listing) return { ok: false, error: "Listing not found." };

    const graceDays = readFreeGraceDays(tenant?.theme ?? {});
    await prisma.listing.update({
      where: { id },
      data: {
        status: "LIVE",
        freeGraceUntil: listing.tier === "FREE" ? new Date(Date.now() + graceDays * 86400000) : null,
      },
    });
    await logAudit({
      action: "LISTING_APPROVE",
      entity: "Listing",
      entityId: id,
      meta: { tier: listing.tier },
    });
    revalidatePath("/admin/listings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to approve listing." };
  }
}

export async function rejectListing(id: string, reason?: string): Promise<ActionResult> {
  try {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return { ok: false, error: "Listing not found." };

    await prisma.listing.update({ where: { id }, data: { status: "DRAFT" } });
    await logAudit({
      action: "LISTING_REJECT",
      entity: "Listing",
      entityId: id,
      reason: reason ?? null,
      meta: { title: listing.title },
    });
    revalidatePath("/admin/listings");
    return { ok: true };
  } catch ( e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reject listing." };
  }
}

// Form-action wrappers: Next 16 <form action> requires (FormData) => void | Promise<void>.
export async function approveListingForm(id: string, _formData: FormData): Promise<void> {
  await approveListing(id);
}

export async function rejectListingForm(id: string, _formData: FormData): Promise<void> {
  await rejectListing(id);
}

/** Check for potential duplicates based on phone, email, website, or domainKey */
export async function checkDuplicateListing(
  formData: FormData,
): Promise<DuplicateCheckResult> {
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const website = String(formData.get("website") ?? "").trim().toLowerCase();
  const domainKey = String(formData.get("domainKey") ?? "").trim().toLowerCase();
  const companyName = String(formData.get("companyName") ?? "").trim().toLowerCase();

  const where: any = { tenantId: TENANT_ID, OR: [] };

  if (phone) where.OR.push({ phone });
  if (email) where.OR.push({ email });
  if (website) where.OR.push({ website });
  if (domainKey) where.OR.push({ domainKey });
  if (companyName) where.OR.push({ companyName });

  if (where.OR.length === 0) return { ok: true, duplicates: [] };

  const duplicates = await prisma.listing.findMany({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      tier: true,
      status: true,
      phone: true,
      email: true,
      website: true,
      domainKey: true,
      companyName: true,
    },
    take: 5,
  });

  if (duplicates.length > 0) {
    return { ok: false, error: "Potential duplicates found", duplicates };
  }

  return { ok: true, duplicates: [] };
}

/** Generate a preview URL for a listing without creating it */
export async function previewListing(
  formData: FormData,
): Promise<PreviewListingResult> {
  const input = parseForm(formData);
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  // Generate a temporary slug for preview
  const tempSlug = `preview-${Date.now()}-${input.slug}`;
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  return {
    ok: true,
    previewUrl: `${siteUrl}/listing/${tempSlug}`,
    message: "Preview generated. Note: this is a temporary preview URL.",
  };
}
