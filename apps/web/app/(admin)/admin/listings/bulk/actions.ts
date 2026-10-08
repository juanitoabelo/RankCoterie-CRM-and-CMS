"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true; count?: number } | { ok: false; error: string };

export async function bulkUpdateListings(formData: FormData): Promise<ActionResult> {
  const action = formData.get("action") as string;
  const ids = formData.getAll("ids") as string[];
  const value = formData.get("value") as string;

  if (!ids.length) return { ok: false, error: "No listings selected" };

  try {
    let updateData: Record<string, any> = {};

    switch (action) {
      case "status":
        if (!["DRAFT", "PENDING_REVIEW", "LIVE", "SUSPENDED", "EXPIRED"].includes(value)) {
          return { ok: false, error: "Invalid status" };
        }
        updateData.status = value;
        break;
      case "tier":
        if (!["FREE", "STANDARD", "PREMIUM", "FEATURED", "SUPPRESSED"].includes(value)) {
          return { ok: false, error: "Invalid tier" };
        }
        updateData.tier = value;
        break;
      case "featured":
        if (value === "true") {
          updateData.featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        } else {
          updateData.featuredUntil = null;
        }
        break;
      default:
        return { ok: false, error: "Invalid action" };
    }

    const result = await prisma.listing.updateMany({
      where: { id: { in: ids }, tenantId: TENANT_ID },
      data: updateData,
    });

    await logAudit({
      action: `LISTING_BULK_${action.toUpperCase()}`,
      entity: "Listing",
      entityId: ids.join(","),
      meta: { action, value, count: result.count },
    });

    revalidatePath("/admin/listings");
    revalidatePath("/", "layout");

    return { ok: true, count: result.count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk update failed" };
  }
}

export async function bulkDeleteListings(formData: FormData): Promise<ActionResult> {
  const ids = formData.getAll("ids") as string[];

  if (!ids.length) return { ok: false, error: "No listings selected" };

  try {
    const result = await prisma.listing.deleteMany({
      where: { id: { in: ids }, tenantId: TENANT_ID },
    });

    await logAudit({
      action: "LISTING_BULK_DELETE",
      entity: "Listing",
      entityId: ids.join(","),
      meta: { count: result.count },
    });

    revalidatePath("/admin/listings");
    revalidatePath("/", "layout");

    return { ok: true, count: result.count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk delete failed" };
  }
}

export async function exportListings(formData: FormData): Promise<ActionResult> {
  const ids = formData.getAll("ids") as string[];
  const format = formData.get("format") as string || "csv";

  try {
    const where = ids.length ? { id: { in: ids } } : { tenantId: TENANT_ID };

    const listings = await prisma.listing.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        regions: true,
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "ID", "Title", "Slug", "Tier", "Status", "Company Name", "Phone", "Email",
      "Website", "Address", "City", "State", "Zip", "Summary", "Categories",
      "Regions", "Tier", "Subscription Status", "Created At", "Updated At"
    ];

    const rows = listings.map((l) => [
      l.id,
      l.title,
      l.slug,
      l.tier,
      l.status,
      l.companyName || "",
      l.phone || "",
      l.email || "",
      l.website || "",
      l.address || "",
      l.city || "",
      l.state || "",
      l.zip || "",
      l.summary || "",
      l.categories.map((c) => c.category.title).join("; "),
      l.regions.map((r) => r.regionId).join("; "),
      l.tier,
      l.subscription?.status || "NONE",
      l.createdAt.toISOString(),
      l.updatedAt.toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

    return { ok: true, count: listings.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Export failed" };
  }
}