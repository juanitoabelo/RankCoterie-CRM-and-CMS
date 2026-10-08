"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/modules/shared";
import {
  buildCheckoutParams,
  isStripeConfigured,
  readListingPaymentConfig,
  readStripeConfig,
} from "@/lib/billing/checkout";
import { throttle } from "@/lib/throttle";

export type ApplyResult = { ok: false; error: string } | { ok: true };

export type ApplyFormOptions = {
  categories: { id: string; title: string }[];
  regions: { id: string; state: string; stateFull: string; city: string | null }[];
  configured: boolean;
  payment: {
    standardLabel: string;
    standardAmount: string;
    premiumLabel: string;
    premiumAmount: string;
  };
};

/** Data needed to render the apply form (used by /apply and the listingApplyForm block). */
export async function getApplyFormOptions(): Promise<ApplyFormOptions> {
  const [tenant, categories, regions] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: TENANT_ID } }).catch(() => null),
    prisma.category.findMany({
      where: { tenantId: TENANT_ID, status: "LIVE" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.region.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: [{ priority: "asc" }, { id: "asc" }],
      select: { id: true, state: true, stateFull: true, city: true },
    }),
  ]);
  const tenantTheme = (tenant?.theme ?? {}) as Record<string, unknown>;
  const payment = readListingPaymentConfig(tenantTheme.listingPayment) ?? {
    standardLabel: "Standard",
    standardAmount: "97",
    premiumLabel: "Premium",
    premiumAmount: "197",
  };
  return {
    categories,
    regions,
    configured: isStripeConfigured(tenantTheme.listingPayment),
    payment: {
      standardLabel: payment.standardLabel ?? "Standard",
      standardAmount: payment.standardAmount ?? "97",
      premiumLabel: payment.premiumLabel ?? "Premium",
      premiumAmount: payment.premiumAmount ?? "197",
    },
  };
}

/** useActionState wrapper around applyListing — returns the result instead of redirecting on error. */
export async function applyListingWithState(
  _prev: ApplyResult | null,
  formData: FormData,
): Promise<ApplyResult> {
  return applyListing(formData);
}

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function applyListing(formData: FormData): Promise<ApplyResult> {
  const throttled = await throttle("applyListing", 5, 10 * 60_000);
  if (throttled) return { ok: false, error: throttled };

  const tier = String(formData.get("tier") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const categoryIds = formData.getAll("categoryIds").map(String);
  const regionIds = formData.getAll("regionIds").map(String);

  if (tier !== "STANDARD" && tier !== "PREMIUM") {
    return { ok: false, error: "Choose a listing tier." };
  }
  if (!title) return { ok: false, error: "Company title is required." };
  if (!email) return { ok: false, error: "Contact email is required." };
  if (categoryIds.length === 0) {
    return { ok: false, error: "Select at least one category." };
  }
  if (regionIds.length < 3) {
    return { ok: false, error: "Select 3–5 nearby areas for best results." };
  }
  if (regionIds.length > 5) {
    return { ok: false, error: "Select at most 5 nearby areas." };
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const tenantTheme = (tenant?.theme ?? {}) as Record<string, unknown>;
  const listingPayment = tenantTheme.listingPayment as unknown;
  if (!isStripeConfigured(listingPayment)) {
    return { ok: false, error: "Payments are not configured yet — please try again later." };
  }

  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;

  try {
    const listing = await prisma.listing.create({
      data: {
        tenantId: TENANT_ID,
        title,
        slug,
        tier,
        status: "PENDING_REVIEW",
        companyName: companyName || title,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        summary: summary || null,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        regions: { create: regionIds.map((regionId) => ({ regionId })) },
      },
    });

    await logAudit({
      action: "LISTING_CREATE",
      entity: "Listing",
      entityId: listing.id,
      meta: { source: "apply", tier, title, categoryIds, regionIds },
    });

    const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    const built = buildCheckoutParams(
      { listingId: listing.id, tier, listingTitle: title },
      {
        successUrl: `${siteUrl}/checkout/success?listingId=${listing.id}`,
        cancelUrl: `${siteUrl}/checkout/cancel?listingId=${listing.id}`,
      },
      tenantTheme,
    );
    if (!built.ok) {
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "DRAFT" } });
      return built;
    }

    const stripeConfig = readStripeConfig(listingPayment);
    if (!stripeConfig) {
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "DRAFT" } });
      return { ok: false, error: "Payments are not configured yet — please try again later." };
    }
    const stripe = new Stripe(stripeConfig.secretKey);
    const session = await stripe.checkout.sessions.create(
      built.params as Stripe.Checkout.SessionCreateParams,
    );
    redirect(session.url!);
    return { ok: true };
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    return { ok: false, error: e instanceof Error ? e.message : "Application failed." };
  }
}

// Form-action wrapper: Next 16 <form action> requires (FormData) => void | Promise<void>.
export async function applyListingForm(formData: FormData): Promise<void> {
  try {
    const result = await applyListing(formData);
    if (result && result.ok === false) {
      const message = result.error;
      console.error("[applyListingForm]", message);
      const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
      const { redirect } = await import("next/navigation");
      redirect(`${siteUrl}/apply?error=${encodeURIComponent(message)}`);
    }
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    const message = e instanceof Error ? e.message : "Application failed.";
    console.error("[applyListingForm]", message);
    const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    const { redirect } = await import("next/navigation");
    redirect(`${siteUrl}/apply?error=${encodeURIComponent(message)}`);
  }
}