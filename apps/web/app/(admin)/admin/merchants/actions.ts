"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";

export type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

export async function addMerchant(input: {
  name: string;
  contactName?: string;
  email?: string;
  listingId?: string;
  stripeAccountId?: string;
  status?: string;
  payoutMethod?: string;
  feePercent?: string;
}): Promise<ActionResult> {
  await requireSection("merchants");
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Merchant name is required." };
  if (input.stripeAccountId && !/^acct_/.test(input.stripeAccountId.trim())) {
    return { ok: false, error: "Stripe account ID must start with acct_." };
  }

  const feePercent = new Prisma.Decimal(input.feePercent?.trim() ? input.feePercent.trim() : "0");
  if (feePercent.isNegative() || feePercent.greaterThan(100)) {
    return { ok: false, error: "Fee percent must be between 0 and 100." };
  }

  const merchant = await prisma.merchant.create({
    data: {
      tenantId: TENANT_ID,
      name,
      contactName: input.contactName?.trim() || null,
      email: input.email?.trim() || null,
      listingId: input.listingId?.trim() || null,
      stripeAccountId: input.stripeAccountId?.trim() || null,
      status: input.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      payoutMethod: input.payoutMethod?.trim() || null,
      feePercent,
    },
  });
  await logAudit({
    action: "MERCHANT_CREATE",
    entity: "Merchant",
    entityId: merchant.id,
    reason: `Merchant "${name}" created`,
    meta: { listingId: merchant.listingId, status: merchant.status },
  });
  revalidatePath("/admin/merchants");
  return { ok: true, message: `Merchant "${name}" added.`, id: merchant.id };
}

export async function toggleMerchantStatus(merchantId: string): Promise<ActionResult> {
  await requireSection("merchants");
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return { ok: false, error: "Merchant not found." };

  const next = merchant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.merchant.update({ where: { id: merchantId }, data: { status: next } });
  await logAudit({
    action: "MERCHANT_TOGGLE",
    entity: "Merchant",
    entityId: merchantId,
    reason: `Merchant "${merchant.name}" ${next === "ACTIVE" ? "activated" : "deactivated"}`,
    meta: { from: merchant.status, to: next },
  });
  revalidatePath("/admin/merchants");
  return { ok: true, message: `Merchant is now ${next}.` };
}

export async function updateMerchant(
  merchantId: string,
  input: {
    name: string;
    contactName?: string;
    email?: string;
    listingId?: string;
    stripeAccountId?: string;
    payoutMethod?: string;
    feePercent?: string;
  },
): Promise<ActionResult> {
  await requireSection("merchants");
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return { ok: false, error: "Merchant not found." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Merchant name is required." };
  if (input.stripeAccountId && !/^acct_/.test(input.stripeAccountId.trim())) {
    return { ok: false, error: "Stripe account ID must start with acct_." };
  }
  const feePercent = new Prisma.Decimal(input.feePercent?.trim() ? input.feePercent.trim() : "0");
  if (feePercent.isNegative() || feePercent.greaterThan(100)) {
    return { ok: false, error: "Fee percent must be between 0 and 100." };
  }

  await prisma.merchant.update({
    where: { id: merchantId },
    data: {
      name,
      contactName: input.contactName?.trim() || null,
      email: input.email?.trim() || null,
      listingId: input.listingId?.trim() || null,
      stripeAccountId: input.stripeAccountId?.trim() || null,
      payoutMethod: input.payoutMethod?.trim() || null,
      feePercent,
    },
  });
  await logAudit({
    action: "MERCHANT_UPDATE",
    entity: "Merchant",
    entityId: merchantId,
    reason: `Merchant "${name}" updated`,
    meta: { name, feePercent: feePercent.toString() },
  });
  revalidatePath("/admin/merchants");
  revalidatePath(`/admin/merchants/${merchantId}`);
  return { ok: true, message: "Merchant updated." };
}

// Form-action wrappers (Next 16: <form action> needs (FormData) => void | Promise<void>).
// Failures redirect back with ?error= so nothing fails silently.

function merchantsError(error: string): never {
  redirect(`/admin/merchants?error=${encodeURIComponent(error)}`);
}
function merchantDetailError(merchantId: string, error: string): never {
  redirect(`/admin/merchants/${merchantId}?error=${encodeURIComponent(error)}`);
}
function merchantDetailOk(merchantId: string, message: string): never {
  redirect(`/admin/merchants/${merchantId}?ok=${encodeURIComponent(message)}`);
}

export async function merchantAddForm(formData: FormData): Promise<void> {
  const result = await addMerchant({
    name: String(formData.get("name") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    listingId: String(formData.get("listingId") ?? ""),
    stripeAccountId: String(formData.get("stripeAccountId") ?? ""),
    status: String(formData.get("status") ?? "INACTIVE"),
    payoutMethod: String(formData.get("payoutMethod") ?? ""),
    feePercent: String(formData.get("feePercent") ?? ""),
  });
  if (!result.ok) merchantsError(result.error ?? "Could not add merchant.");
  if (!result.id) merchantsError("Merchant added, but id missing.");
  redirect(`/admin/merchants/${result.id}?ok=${encodeURIComponent(result.message ?? "Merchant added.")}`);
}

export async function merchantToggleForm(formData: FormData): Promise<void> {
  const merchantId = String(formData.get("merchantId") ?? "");
  const result = await toggleMerchantStatus(merchantId);
  if (!result.ok) merchantDetailError(merchantId, result.error ?? "Could not toggle merchant.");
  merchantDetailOk(merchantId, result.message ?? "Merchant updated.");
}

export async function merchantEditForm(formData: FormData): Promise<void> {
  const merchantId = String(formData.get("merchantId") ?? "");
  const result = await updateMerchant(merchantId, {
    name: String(formData.get("name") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    listingId: String(formData.get("listingId") ?? ""),
    stripeAccountId: String(formData.get("stripeAccountId") ?? ""),
    payoutMethod: String(formData.get("payoutMethod") ?? ""),
    feePercent: String(formData.get("feePercent") ?? ""),
  });
  if (!result.ok) merchantDetailError(merchantId, result.error ?? "Could not save merchant.");
  merchantDetailOk(merchantId, result.message ?? "Merchant updated.");
}