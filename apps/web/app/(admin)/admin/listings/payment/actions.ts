"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import type { ListingPaymentSettings, ListingPaymentActionResult } from "./types";
import { DEFAULT_LISTING_PAYMENT_SETTINGS } from "./types";

/** Read the tenant's listing payment settings (merged over defaults). */
export async function getListingPaymentSettings(): Promise<ListingPaymentSettings> {
  await requireSection("listings");
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as { listingPayment?: Partial<ListingPaymentSettings> };
  return { ...DEFAULT_LISTING_PAYMENT_SETTINGS, ...theme.listingPayment };
}

/** Save listing payment settings. */
export async function saveListingPaymentSettings(formData: FormData): Promise<ListingPaymentActionResult> {
  const actor = await requireSection("listings");
  const str = (k: string) => String(formData.get(k) ?? "").trim();

  const rawGraceDays = str("freeGraceDays");
  const freeGraceDays = rawGraceDays === ""
    ? DEFAULT_LISTING_PAYMENT_SETTINGS.freeGraceDays
    : Number.parseInt(rawGraceDays, 10);
  if (!Number.isFinite(freeGraceDays) || freeGraceDays < 0 || freeGraceDays > 3650) {
    return { ok: false, error: "Free tier grace period must be a number of days between 0 and 3650." };
  }

  const settings: ListingPaymentSettings = {
    secretKey: str("secretKey"),
    publishableKey: str("publishableKey"),
    webhookSecret: str("webhookSecret"),
    standardPriceId: str("standardPriceId"),
    premiumPriceId: str("premiumPriceId"),
    freePriceId: str("freePriceId"),
    customPriceId: str("customPriceId"),
    setupFeeId: str("setupFeeId"),
    standardLabel: str("standardLabel") || DEFAULT_LISTING_PAYMENT_SETTINGS.standardLabel,
    standardAmount: str("standardAmount") || DEFAULT_LISTING_PAYMENT_SETTINGS.standardAmount,
    premiumLabel: str("premiumLabel") || DEFAULT_LISTING_PAYMENT_SETTINGS.premiumLabel,
    premiumAmount: str("premiumAmount") || DEFAULT_LISTING_PAYMENT_SETTINGS.premiumAmount,
    freeGraceDays,
  };

  try {
    const tenant = await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: "Canopy", domainKey: "canopy.local" },
    });
    const theme = (tenant.theme ?? {}) as Record<string, unknown>;
    await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: {
        theme: {
          ...theme,
          listingPayment: settings,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit({
      action: "LISTING_PAYMENT_SETTINGS_UPDATE",
      entity: "Tenant",
      entityId: TENANT_ID,
      actorId: actor.id,
    });
    revalidatePath("/admin/listings/payment");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save listing payment settings.",
    };
  }
}
