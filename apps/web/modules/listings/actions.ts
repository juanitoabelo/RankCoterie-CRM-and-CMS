"use server";

/**
 * Listings Module — Server Actions
 * 
 * Server actions for listing CRUD operations.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { createSession, requireSection, requireUser } from "@/modules/auth";
import { hashPassword } from "@/lib/passwords";
import { throttle } from "@/lib/throttle";
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
  await requireSection("listings");
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
  await requireSection("listings");
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
  await requireSection("reviewQueue");
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
  await requireSection("reviewQueue");
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
  await requireSection("listings");
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const website = String(formData.get("website") ?? "").trim().toLowerCase();
  const domainKey = String(formData.get("domainKey") ?? "").trim().toLowerCase();
  const companyName = String(formData.get("companyName") ?? "").trim().toLowerCase();

  const conditions: Prisma.ListingWhereInput[] = [];

  if (phone) conditions.push({ phone });
  if (email) conditions.push({ email });
  if (website) conditions.push({ website });
  if (domainKey) conditions.push({ domainKey });
  if (companyName) conditions.push({ companyName });

  if (conditions.length === 0) return { ok: true, duplicates: [] };

  const duplicates = await prisma.listing.findMany({
    where: { tenantId: TENANT_ID, OR: conditions },
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
  await requireSection("listings");
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

// ---------------------------------------------------------------------------
// Self-service "My Listing" (subscriber) + claim account setup
// ---------------------------------------------------------------------------

/** Fields a listing owner may edit via the self-service My Listing page. */
const OWNER_EDITABLE = [
  "companyName",
  "phone",
  "email",
  "website",
  "address",
  "city",
  "state",
  "zip",
  "lat",
  "lng",
  "summary",
  "description",
  "avatarImage",
  "feedImage",
  "galleryImages",
  "videoUrl",
  "hoursOfOperation",
  "specialties",
  "amenities",
  "certifications",
  "insuranceAccepted",
  "pricing",
] as const;

/** Parse only the whitelisted owner-editable fields (never tier/status/slug/SEO). */
function parseOwnerForm(formData: FormData): Record<string, string | number | null> {
  const asString = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const asJson = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    if (!v) return null;
    try {
      JSON.parse(v);
      return v;
    } catch {
      return null;
    }
  };
  const data: Record<string, string | number | null> = {};
  for (const key of OWNER_EDITABLE) {
    if (key === "lat" || key === "lng") {
      const v = asString(key);
      const n = Number(v);
      data[key] = v !== null && Number.isFinite(n) ? n : null;
    } else if (
      key === "galleryImages" ||
      key === "hoursOfOperation" ||
      key === "specialties" ||
      key === "amenities" ||
      key === "certifications" ||
      key === "insuranceAccepted" ||
      key === "pricing"
    ) {
      data[key] = asJson(key);
    } else {
      data[key] = asString(key);
    }
  }
  return data;
}

/** Owner-scoped update used by the subscriber My Listing page. */
export async function updateMyListing(
  listingId: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const input = parseOwnerForm(formData);

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, claimedById: user.id },
    include: {
      categories: { include: { category: { select: { slug: true } } } },
      regions: { select: { regionId: true } },
    },
  });
  if (!listing) {
    return {
      ok: false,
      error: "Listing not found or you don't have permission to edit it.",
    };
  }

  // Moderation: once a listing went live (or is suspended) any owner edit takes
  // it back into the review queue so staff vet the change before re-publishing.
  // FREE tier listings hide immediately by clearing the grace window.
  const requeue = listing.status === "LIVE" || listing.status === "SUSPENDED";
  const updateData: Prisma.ListingUpdateInput = {
    ...(input as Prisma.ListingUpdateInput),
    ...(requeue ? { status: "PENDING_REVIEW", freeGraceUntil: null } : {}),
  };

  try {
    await prisma.listing.update({
      where: { id: listingId },
      data: updateData,
    });
    await logAudit({
      action: "LISTING_OWNER_UPDATE",
      entity: "Listing",
      entityId: listingId,
      actorId: user.id,
      meta: requeue ? { requeuedForReview: true, previousStatus: listing.status } : undefined,
    });

    // Revalidate everywhere this listing's data surfaces: its detail page, every
    // category page, every category×region page, and the home page.
    revalidatePath(`/listing/${listing.slug}`);
    revalidatePath("/admin/my-listing");
    revalidatePath("/");
    for (const c of listing.categories) {
      revalidatePath(`/g/${c.category.slug}`);
    }
    if (listing.regions.length > 0) {
      const regionRows = await prisma.region.findMany({
        where: { id: { in: listing.regions.map((r) => r.regionId) } },
        select: { slug: true },
      });
      for (const c of listing.categories) {
        for (const r of regionRows) {
          revalidatePath(`/g/${c.category.slug}/${r.slug}`);
        }
      }
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update listing.",
    };
  }
}

/** Claim completion: create a subscriber account and link the verified listing. */
export async function completeClaim(formData: FormData): Promise<ActionResult> {
  const throttled = await throttle("completeClaim", 5, 10 * 60_000);
  if (throttled) return { ok: false, error: throttled };

  const listingId = String(formData.get("listingId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!listingId || !email) {
    return { ok: false, error: "Email is required." };
  }
  if (!name) return { ok: false, error: "Your name is required." };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      tier: true,
      status: true,
      slug: true,
      verifiedAt: true,
      claimedById: true,
      freeGraceUntil: true,
    },
  });
  if (!listing) return { ok: false, error: "Listing not found." };
  if (!listing.verifiedAt) {
    return { ok: false, error: "This listing hasn't been verified yet." };
  }
  if (listing.claimedById) {
    return { ok: false, error: "This listing has already been claimed." };
  }

  let accountId: string;
  try {
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId: TENANT_ID },
      include: { roles: true },
    });
    if (existingUser) {
      accountId = existingUser.id;
      if (!existingUser.roles.some((r) => r.role === Role.SUBSCRIBER)) {
        await prisma.userRole.create({
          data: { userId: existingUser.id, role: Role.SUBSCRIBER },
        });
      }
    } else {
      const created = await prisma.user.create({
        data: {
          tenantId: TENANT_ID,
          email,
          passwordHash: hashPassword(password),
          firstName: name || null,
          active: true,
          roles: { create: [{ role: Role.SUBSCRIBER }] },
        },
      });
      accountId = created.id;
    }

    // Atomic claim: only one claimant can ever win, even under a race.
    const claimed = await prisma.listing.updateMany({
      where: { id: listingId, claimedById: null },
      data: { claimedById: accountId, claimedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new Error("This listing has already been claimed.");
    }

    // Billing: ensure the claimed listing carries a subscription record. A FREE
    // listing gets the same migration grace window an admin approval would set so
    // it stays visible and the billing layer has a full row to act on. Paid tiers
    // are left untouched — their Stripe subscription drives status/lifecycle.
    if (listing.tier === "FREE") {
      const existingSub = await prisma.listingSubscription.findUnique({
        where: { listingId },
        select: { id: true },
      });
      if (!existingSub) {
        const graceDays = readFreeGraceDays(
          (await prisma.tenant.findUnique({ where: { id: TENANT_ID } }).catch(() => null))?.theme ?? undefined,
        );
        const graceUntil =
          listing.status === "LIVE"
            ? listing.freeGraceUntil ?? new Date(Date.now() + graceDays * 86400000)
            : null;
        await prisma.$transaction(async (tx) => {
          await tx.listingSubscription.create({
            data: {
              listingId,
              tier: "FREE",
              status: listing.status,
              approvedAt: listing.status === "LIVE" ? new Date() : null,
            },
          });
          if (graceUntil) {
            await tx.listing.update({
              where: { id: listingId },
              data: { freeGraceUntil: graceUntil },
            });
          }
        });
      }
    }

    await logAudit({
      action: "LISTING_CLAIM",
      entity: "Listing",
      entityId: listingId,
      actorId: accountId,
      meta: { email },
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to complete claim.",
    };
  }

  revalidatePath(`/listing/${listing.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/my-listing");
  await createSession(accountId);
  redirect("/admin/my-listing");
  return { ok: true };
}
