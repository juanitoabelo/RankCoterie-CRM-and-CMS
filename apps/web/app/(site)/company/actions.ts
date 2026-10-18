"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { requireUser } from "@/modules/auth";
import { logAudit } from "@/lib/audit";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/**
 * Owner edit for a company landing page — content fields only. Owners never
 * touch status, tier, ownership, templates, or SEO switches (admin-only).
 */
export async function updateCompanyListingContent(id: string, fd: FormData): Promise<void> {
  const user = await requireUser();
  const listing = await prisma.listing.findFirst({
    where: { id, isLandingPage: true, claimedById: user.id },
    select: { id: true, slug: true },
  });
  if (!listing) redirect("/company?error=" + encodeURIComponent("Page not found."));

  const title = str(fd, "title");
  if (!title) {
    redirect(`/company/edit/${id}?error=${encodeURIComponent("Company name is required.")}`);
  }

  await prisma.listing.update({
    where: { id },
    data: {
      title,
      summary: str(fd, "summary") || null,
      description: str(fd, "description") || null,
      phone: str(fd, "phone") || null,
      website: str(fd, "website") || null,
      address: str(fd, "address") || null,
      city: str(fd, "city") || null,
      state: str(fd, "state") || null,
      zip: str(fd, "zip") || null,
    },
  });
  await logAudit({
    actorId: user.id,
    action: "LISTING_UPDATE",
    entity: "CompanyListing",
    entityId: id,
    reason: `Owner edit by ${user.email}`,
    meta: { title },
  });
  revalidatePath("/company");
  revalidatePath(`/LandingPage/${listing.slug}/`);
  redirect("/company?ok=" + encodeURIComponent("Page updated."));
}
