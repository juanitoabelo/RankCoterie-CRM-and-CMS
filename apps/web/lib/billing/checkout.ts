/**
 * Canopy V2 — Stripe Checkout builder for the paid directory (§6.7.3.2, legacy §4.6).
 *
 * Apply flow: the listing is created (PENDING_REVIEW), then the applicant pays
 * through Checkout — one-time setup fee + recurring subscription (STANDARD or
 * PREMIUM tier). On `checkout.session.completed` the webhook activates the listing.
 *
 * Pure functions here (no Stripe calls) — unit-testable; the Stripe API client is
 * constructed lazily in `getStripe()`.
 */

export const TIER_PRICE_ENV: Record<string, string> = {
  STANDARD: "STRIPE_PRICE_STANDARD",
  PREMIUM: "STRIPE_PRICE_PREMIUM",
};

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getPriceId(tier: string): string | null {
  const env = TIER_PRICE_ENV[tier];
  if (!env) return null;
  return process.env[env] ?? null;
}

export function getSetupFeeId(): string | null {
  return process.env.STRIPE_SETUP_FEE_ID ?? null;
}

export interface CheckoutDraft {
  listingId: string;
  tier: "STANDARD" | "PREMIUM";
  listingTitle: string;
}

/**
 * Build the Checkout Session params. `successUrl`/`cancelUrl` carry the listing id
 * so the public success page can show a meaningful confirmation.
 */
export function buildCheckoutParams(
  draft: CheckoutDraft,
  opts: { successUrl: string; cancelUrl: string },
): { ok: true; params: Record<string, unknown> } | { ok: false; error: string } {
  const priceId = getPriceId(draft.tier);
  const setupFeeId = getSetupFeeId();
  if (!priceId) {
    return { ok: false, error: `No price configured for tier ${draft.tier} (${TIER_PRICE_ENV[draft.tier]}).` };
  }
  if (!setupFeeId) {
    return { ok: false, error: "No setup fee configured (STRIPE_SETUP_FEE_ID)." };
  }

  const lineItems: Record<string, unknown>[] = [
    { price: priceId, quantity: 1 },
    { price: setupFeeId, quantity: 1 },
  ];

  return {
    ok: true,
    params: {
      mode: "subscription",
      line_items: lineItems,
      metadata: {
        listingId: draft.listingId,
        tier: draft.tier,
      },
      subscription_data: { metadata: { listingId: draft.listingId } },
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      client_reference_id: draft.listingId,
    },
  };
}