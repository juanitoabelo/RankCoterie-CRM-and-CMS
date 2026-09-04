"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import type { ListingTier, ListingStatus } from "@/lib/directory/visibility";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

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
  city?: string;
  state?: string;
  zip?: string;
  summary?: string;
  isLandingPage: boolean;
  categoryIds: string[];
  regionIds: string[];
}

function parseForm(formData: FormData): ListingFormInput {
  const asString = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || undefined;
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
    city: asString("city"),
    state: asString("state"),
    zip: asString("zip"),
    summary: asString("summary"),
    isLandingPage: formData.get("isLandingPage") === "on",
    categoryIds: formData.getAll("categoryIds").map(String),
    regionIds: formData.getAll("regionIds").map(String),
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
        city: input.city,
        state: input.state,
        zip: input.zip,
        summary: input.summary,
        isLandingPage: input.isLandingPage,
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
          city: input.city,
          state: input.state,
          zip: input.zip,
          summary: input.summary,
          isLandingPage: input.isLandingPage,
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
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return { ok: false, error: "Listing not found." };

    const GRACE_DAYS = 90;
    await prisma.listing.update({
      where: { id },
      data: {
        status: "LIVE",
        freeGraceUntil: listing.tier === "FREE" ? new Date(Date.now() + GRACE_DAYS * 86400000) : null,
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
  } catch (e) {
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