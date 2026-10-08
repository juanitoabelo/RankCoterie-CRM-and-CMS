"use server";

import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function getReviews(status?: string) {
  await requireSection("reviews");
  const where: any = { tenantId: TENANT_ID };
  if (status && status !== "ALL") where.status = status;
  
  return prisma.review.findMany({
    where,
    include: {
      listing: { select: { title: true, slug: true, tier: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReview(id: string) {
  await requireSection("reviews");
  return prisma.review.findUnique({
    where: { id, tenantId: TENANT_ID },
    include: {
      listing: { select: { title: true, slug: true, tier: true } },
    },
  });
}

export async function updateReviewStatus(id: string, formData: FormData): Promise<ActionResult> {
  await requireSection("reviews");
  const status = formData.get("status") as string;
  const response = formData.get("response") as string | null;

  if (!status || !["PENDING", "APPROVED", "REJECTED", "FLAGGED"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  try {
    const updateData: any = { status };
    if (response) {
      updateData.response = response;
      updateData.respondedAt = new Date();
    }

    const review = await prisma.review.update({
      where: { id, tenantId: TENANT_ID },
      data: updateData,
      include: { listing: true },
    });

    await logAudit({
      action: `REVIEW_${status}`,
      entity: "Review",
      entityId: id,
      meta: { listingId: review.listingId },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update review." };
  }
}

export async function getReviewStatuses() {
  return [
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "FLAGGED", label: "Flagged" },
  ];
}