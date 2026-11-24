"use server";

import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const COUPON_TYPES = ["PERCENT", "FIXED_CART", "FIXED_PRODUCT", "FREE_SHIPPING"];

function num(v: FormDataEntryValue | null): number | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function date(v: FormDataEntryValue | null): Date | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const d = new Date(`${raw}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function list(v: FormDataEntryValue | null): string[] {
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.map((item) => String(item).trim()).filter(Boolean))];
    }
  } catch {}
  return [...new Set(raw.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

function readCouponInput(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "PERCENT").trim();
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  return {
    code,
    type,
    amount: num(formData.get("amount")) ?? 0,
    description: String(formData.get("description") ?? "").trim() || null,
    minAmount: num(formData.get("minAmount")),
    maxAmount: num(formData.get("maxAmount")),
    usageLimit: num(formData.get("usageLimit")),
    usageLimitPerUser: Math.max(0, Math.floor(num(formData.get("usageLimitPerUser")) ?? 0)),
    individualUse: formData.get("individualUse") === "on" || formData.get("individualUse") === "true",
    excludeSaleItems: formData.get("excludeSaleItems") === "on" || formData.get("excludeSaleItems") === "true",
    productIds: list(formData.get("productIds")),
    excludedProductIds: list(formData.get("excludedProductIds")),
    categoryIds: list(formData.get("categoryIds")),
    excludedCategoryIds: list(formData.get("excludedCategoryIds")),
    startDate: date(formData.get("startDate")),
    endDate: date(formData.get("endDate")),
    isActive,
  };
}

export async function createCoupon(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("products");
  const input = readCouponInput(formData);

  if (!input.code) return { ok: false, error: "Coupon code is required." };
  if (!COUPON_TYPES.includes(input.type)) return { ok: false, error: "Invalid coupon type." };
  if (input.amount < 0) return { ok: false, error: "Amount cannot be negative." };

  try {
    const clash = await prisma.coupon.findFirst({ where: { code: input.code } });
    if (clash) return { ok: false, error: "That coupon code already exists." };

    await prisma.coupon.create({
      data: {
        tenantId: TENANT_ID,
        code: input.code,
        type: input.type as never,
        amount: input.amount,
        description: input.description,
        minAmount: input.minAmount,
        maxAmount: input.maxAmount,
        usageLimit: input.usageLimit,
        usageLimitPerUser: input.usageLimitPerUser,
        individualUse: input.individualUse,
        excludeSaleItems: input.excludeSaleItems,
        productIds: input.productIds,
        excludedProductIds: input.excludedProductIds,
        categoryIds: input.categoryIds,
        excludedCategoryIds: input.excludedCategoryIds,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive,
        freeShipping: input.type === "FREE_SHIPPING",
      },
    });
    await logAudit({
      action: "COUPON_CREATE",
      entity: "Coupon",
      entityId: input.code,
      meta: { code: input.code, type: input.type },
      actorId: actor.id,
    });
    revalidatePath("/admin/coupons");
    revalidatePath("/checkout");
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create coupon." };
  }
}

export async function updateCoupon(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("products");
  const input = readCouponInput(formData);

  if (!input.code) return { ok: false, error: "Coupon code is required." };
  if (!COUPON_TYPES.includes(input.type)) return { ok: false, error: "Invalid coupon type." };

  try {
    const existing = await prisma.coupon.findFirst({ where: { id, tenantId: TENANT_ID } });
    if (!existing) return { ok: false, error: "Coupon not found." };

    const clash = await prisma.coupon.findFirst({
      where: { code: input.code, NOT: { id } },
    });
    if (clash) return { ok: false, error: "That coupon code already exists." };

    await prisma.coupon.update({
      where: { id },
      data: {
        code: input.code,
        type: input.type as never,
        amount: input.amount,
        description: input.description,
        minAmount: input.minAmount,
        maxAmount: input.maxAmount,
        usageLimit: input.usageLimit,
        usageLimitPerUser: input.usageLimitPerUser,
        individualUse: input.individualUse,
        excludeSaleItems: input.excludeSaleItems,
        productIds: input.productIds,
        excludedProductIds: input.excludedProductIds,
        categoryIds: input.categoryIds,
        excludedCategoryIds: input.excludedCategoryIds,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive,
        freeShipping: input.type === "FREE_SHIPPING",
      },
    });
    await logAudit({
      action: "COUPON_UPDATE",
      entity: "Coupon",
      entityId: id,
      meta: { code: input.code, type: input.type },
      actorId: actor.id,
    });
    revalidatePath("/admin/coupons");
    revalidatePath("/admin/coupons/" + id);
    revalidatePath("/checkout");
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update coupon." };
  }
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  const actor = await requireSection("products");
  try {
    const existing = await prisma.coupon.findFirst({ where: { id, tenantId: TENANT_ID } });
    if (!existing) return { ok: false, error: "Coupon not found." };

    await prisma.coupon.delete({ where: { id } });
    await logAudit({
      action: "COUPON_DELETE",
      entity: "Coupon",
      entityId: id,
      meta: { code: existing.code },
      actorId: actor.id,
    });
    revalidatePath("/admin/coupons");
    revalidatePath("/checkout");
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete coupon.";
    return {
      ok: false,
      error: /foreign key|constraint/i.test(msg)
        ? "This coupon is referenced by existing carts. Remove it from those carts first, or deactivate it instead."
        : msg,
    };
  }
}
