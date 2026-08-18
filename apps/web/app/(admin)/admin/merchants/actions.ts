"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string; message?: string };

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
      tenantId: process.env.CANOPY_TENANT_ID ?? "tenant-masternet",
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
  return { ok: true, message: `Merchant "${name}" added.` };
}

export async function toggleMerchantStatus(merchantId: string): Promise<ActionResult> {
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

// Form-action wrappers (Next 16: <form action> needs (FormData) => void | Promise<void>).
export async function merchantAddForm(formData: FormData): Promise<void> {
  await addMerchant({
    name: String(formData.get("name") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    listingId: String(formData.get("listingId") ?? ""),
    stripeAccountId: String(formData.get("stripeAccountId") ?? ""),
    status: String(formData.get("status") ?? "INACTIVE"),
    payoutMethod: String(formData.get("payoutMethod") ?? ""),
    feePercent: String(formData.get("feePercent") ?? ""),
  });
}

export async function merchantToggleForm(formData: FormData): Promise<void> {
  await toggleMerchantStatus(String(formData.get("merchantId") ?? ""));
}