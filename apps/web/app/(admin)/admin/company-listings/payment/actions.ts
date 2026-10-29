"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import type { CompanyListingPaymentSettings, CompanyListingPaymentActionResult } from "./types";
import { DEFAULT_COMPANY_LISTING_PAYMENT_SETTINGS } from "./types";

/** Read the company listing payment settings (merged over defaults). */
export async function getCompanyListingPaymentSettings(): Promise<CompanyListingPaymentSettings> {
  await requireSection("listings");
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as {
    companyListingPayment?: Partial<CompanyListingPaymentSettings>;
  };
  return { ...DEFAULT_COMPANY_LISTING_PAYMENT_SETTINGS, ...theme.companyListingPayment };
}

/** Save company listing payment settings. */
export async function saveCompanyListingPaymentSettings(
  formData: FormData,
): Promise<CompanyListingPaymentActionResult> {
  const actor = await requireSection("listings");
  const str = (k: string) => String(formData.get(k) ?? "").trim();

  const setupFeeAmount = str("setupFeeAmount");
  if (setupFeeAmount && !/^\d+(\.\d{1,2})?$/.test(setupFeeAmount)) {
    return { ok: false, error: "Setup fee amount must be a number (e.g. 497)." };
  }

  const settings: CompanyListingPaymentSettings = {
    secretKey: str("secretKey"),
    publishableKey: str("publishableKey"),
    webhookSecret: str("webhookSecret"),
    standardPriceId: str("standardPriceId"),
    premiumPriceId: str("premiumPriceId"),
    setupFeeId: str("setupFeeId"),
    setupFeeAmount,
    standardLabel: str("standardLabel") || DEFAULT_COMPANY_LISTING_PAYMENT_SETTINGS.standardLabel,
    standardAmount:
      str("standardAmount") || DEFAULT_COMPANY_LISTING_PAYMENT_SETTINGS.standardAmount,
    premiumLabel: str("premiumLabel") || DEFAULT_COMPANY_LISTING_PAYMENT_SETTINGS.premiumLabel,
    premiumAmount: str("premiumAmount") || DEFAULT_COMPANY_LISTING_PAYMENT_SETTINGS.premiumAmount,
  };

  try {
    const tenant = await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: "Rank Coterie", domainKey: "canopy.local" },
    });
    const theme = (tenant.theme ?? {}) as Record<string, unknown>;
    await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: {
        theme: {
          ...theme,
          companyListingPayment: settings,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit({
      action: "LISTING_PAYMENT_SETTINGS_UPDATE",
      entity: "Tenant",
      entityId: TENANT_ID,
      actorId: actor.id,
    });
    revalidatePath("/admin/company-listings/payment");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save company payment settings.",
    };
  }
}
