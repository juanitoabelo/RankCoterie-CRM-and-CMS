"use server";

import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { throttle } from "@/lib/throttle";

export type ReviewSubmissionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function submitProductReview(formData: FormData): Promise<ReviewSubmissionResult> {
  const throttled = await throttle("productReview", 5, 60_000);
  if (throttled) return { ok: false, error: throttled };

  const productId = String(formData.get("productId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const authorName = String(formData.get("authorName") ?? "").trim().slice(0, 120);
  const authorEmail = String(formData.get("authorEmail") ?? "").trim().toLowerCase().slice(0, 200);
  const rating = parseInt(String(formData.get("rating") ?? "0"), 10);
  const title = String(formData.get("title") ?? "").trim().slice(0, 160) || null;
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000) || null;

  if (!productId || !slug) return { ok: false, error: "Missing product information." };
  if (authorName.length < 2) return { ok: false, error: "Please enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Please choose a rating from 1 to 5." };
  }
  if (!title && !body) return { ok: false, error: "Please add a title or review." };

  const product = await prisma.product.findFirst({
    where: { id: productId, slug, tenantId: TENANT_ID, status: "PUBLISHED", visibility: "PUBLIC" },
    select: { id: true, slug: true, reviewsAllowed: true },
  });
  if (!product) return { ok: false, error: "This product is not available for reviews." };
  if (!product.reviewsAllowed) return { ok: false, error: "Reviews are closed for this product." };

  const existing = await prisma.productReview.findFirst({
    where: {
      tenantId: TENANT_ID,
      productId: product.id,
      authorEmail: { equals: authorEmail, mode: "insensitive" },
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "You already submitted a review for this product." };
  }

  await prisma.productReview.create({
    data: {
      tenantId: TENANT_ID,
      productId: product.id,
      authorName,
      authorEmail,
      rating,
      title,
      body,
      status: "PENDING",
    },
  });

  revalidatePath(`/${product.slug}`);
  return { ok: true, message: "Thanks — your review has been submitted for moderation." };
}
