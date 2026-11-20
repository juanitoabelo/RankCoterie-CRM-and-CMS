"use server";

import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { canAccessAnySectionForUser, requireUser } from "@/modules/auth";
import { logAudit } from "@/lib/audit";

export type ReviewModerationResult = { ok: true } | { ok: false; error: string };

export async function moderateProductReview(
  reviewId: string,
  status: "APPROVED" | "REJECTED",
): Promise<ReviewModerationResult> {
  const actor = await requireUser();
  const allowed = await canAccessAnySectionForUser(actor, ["products", "reviews"]);
  if (!allowed) {
    return { ok: false, error: "You do not have permission to moderate reviews." };
  }
  const review = await prisma.productReview.findFirst({
    where: { id: reviewId, tenantId: TENANT_ID },
    select: { id: true, productId: true },
  });
  if (!review) return { ok: false, error: "Review not found." };

  await prisma.productReview.update({
    where: { id: review.id },
    data: { status },
  });
  await logAudit({
    action: "PRODUCT_REVIEW_MODERATE",
    entity: "ProductReview",
    entityId: review.id,
    actorId: actor.id,
    meta: { status, productId: review.productId },
  });
  const product = await prisma.product.findFirst({
    where: { id: review.productId, tenantId: TENANT_ID },
    select: { slug: true },
  });
  if (product) revalidatePath(`/${product.slug}`);
  revalidatePath("/admin/products");
  return { ok: true };
}
