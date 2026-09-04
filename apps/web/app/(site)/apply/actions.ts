"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";
import {
  buildCheckoutParams,
  isStripeConfigured,
} from "@/lib/billing/checkout";

export type ApplyResult = { ok: false; error: string } | { ok: true };

export async function applyListing(formData: FormData): Promise<ApplyResult> {
  const tier = String(formData.get("tier") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();

  if (tier !== "STANDARD" && tier !== "PREMIUM") {
    return { ok: false, error: "Choose a listing tier." };
  }
  if (!title) return { ok: false, error: "Company title is required." };
  if (!email) return { ok: false, error: "Contact email is required." };
  if (!isStripeConfigured()) {
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
        city: city || null,
        state: state || null,
      },
    });

    await logAudit({
      action: "LISTING_CREATE",
      entity: "Listing",
      entityId: listing.id,
      meta: { source: "apply", tier, title },
    });

    const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    const built = buildCheckoutParams(
      { listingId: listing.id, tier, listingTitle: title },
      {
        successUrl: `${siteUrl}/checkout/success?listingId=${listing.id}`,
        cancelUrl: `${siteUrl}/checkout/cancel?listingId=${listing.id}`,
      },
    );
    if (!built.ok) {
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "DRAFT" } });
      return built;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.create(
      built.params as Stripe.Checkout.SessionCreateParams,
    );
    redirect(session.url!);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Application failed." };
  }
}

// Form-action wrapper: Next 16 <form action> requires (FormData) => void | Promise<void>.
export async function applyListingForm(formData: FormData): Promise<void> {
  await applyListing(formData);
}