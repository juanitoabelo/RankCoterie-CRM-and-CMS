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
  FREE: "STRIPE_PRICE_FREE",
  CUSTOM: "STRIPE_PRICE_CUSTOM",
};

export function isStripeConfigured(config?: unknown): boolean {
  return readStripeConfig(config) !== null;
}

export type StripeConfig = {
  secretKey: string;
  publishableKey: string | null;
  webhookSecret: string | null;
};

export type ListingPaymentConfig = {
  secretKey: string | null;
  publishableKey: string | null;
  webhookSecret: string | null;
  standardPriceId: string | null;
  premiumPriceId: string | null;
  freePriceId: string | null;
  customPriceId: string | null;
  setupFeeId: string | null;
  standardLabel: string | null;
  standardAmount: string | null;
  premiumLabel: string | null;
  premiumAmount: string | null;
};

function clean(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

/**
 * Stripe credentials from the gateway's admin config, falling back to env.
 * Admin → Configure Payment Gateway is the primary source; env vars keep
 * existing deployments working unchanged.
 */
export function readStripeConfig(config: unknown): StripeConfig | null {
  const c = (config ?? {}) as Record<string, unknown>;
  const secretKey = clean(c.secretKey) ?? clean(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) return null;
  return {
    secretKey,
    publishableKey: clean(c.publishableKey) ?? clean(process.env.STRIPE_PUBLISHABLE_KEY),
    webhookSecret: clean(c.webhookSecret) ?? clean(process.env.STRIPE_WEBHOOK_SECRET),
  };
}

/**
 * Listing payment settings stored in the tenant admin config, falling back to env vars.
 * The webhook/checkout paths prefer dashboard config; env keeps older deployments working.
 */
export function readListingPaymentConfig(config: unknown): ListingPaymentConfig | null {
  const root = (config ?? {}) as Record<string, unknown>;
  const c = ((root.listingPayment ?? root) as Record<string, unknown> | null) ?? {};
  const secretKey = clean(c.secretKey) ?? clean(process.env.STRIPE_SECRET_KEY);
  const publishableKey = clean(c.publishableKey) ?? clean(process.env.STRIPE_PUBLISHABLE_KEY);
  const webhookSecret = clean(c.webhookSecret) ?? clean(process.env.STRIPE_WEBHOOK_SECRET);
  const standardPriceId = clean(c.standardPriceId) ?? clean(process.env.STRIPE_PRICE_STANDARD);
  const premiumPriceId = clean(c.premiumPriceId) ?? clean(process.env.STRIPE_PRICE_PREMIUM);
  const freePriceId = clean(c.freePriceId) ?? clean(process.env.STRIPE_PRICE_FREE);
  const customPriceId = clean(c.customPriceId) ?? clean(process.env.STRIPE_PRICE_CUSTOM);
  const setupFeeId = clean(c.setupFeeId) ?? clean(process.env.STRIPE_SETUP_FEE_ID);
  const standardLabel = clean(c.standardLabel) ?? clean(process.env.STRIPE_STANDARD_LABEL) ?? "Standard";
  const standardAmount = clean(c.standardAmount) ?? clean(process.env.STRIPE_STANDARD_AMOUNT) ?? "97";
  const premiumLabel = clean(c.premiumLabel) ?? clean(process.env.STRIPE_PREMIUM_LABEL) ?? "Premium";
  const premiumAmount = clean(c.premiumAmount) ?? clean(process.env.STRIPE_PREMIUM_AMOUNT) ?? "197";
  if (!secretKey && !webhookSecret && !standardPriceId && !premiumPriceId && !freePriceId && !customPriceId && !setupFeeId) {
    return null;
  }
  return {
    secretKey,
    publishableKey,
    webhookSecret,
    standardPriceId,
    premiumPriceId,
    freePriceId,
    customPriceId,
    setupFeeId,
    standardLabel,
    standardAmount,
    premiumLabel,
    premiumAmount,
  };
}

export function getPriceId(tier: string, config?: ListingPaymentConfig | null): string | null {
  const env = TIER_PRICE_ENV[tier];
  if (!env) return null;
  const priceMap: Record<string, string | null> = {
    STANDARD: config?.standardPriceId ?? null,
    PREMIUM: config?.premiumPriceId ?? null,
    FREE: config?.freePriceId ?? null,
    CUSTOM: config?.customPriceId ?? null,
  };
  return priceMap[tier] ?? process.env[env] ?? null;
}

export function getSetupFeeId(config?: ListingPaymentConfig | null): string | null {
  return config?.setupFeeId ?? process.env.STRIPE_SETUP_FEE_ID ?? null;
}

/** Default public-visibility window (days) for FREE-tier listings after approval. */
export const DEFAULT_FREE_GRACE_DAYS = 90;

/**
 * Days a FREE-tier listing stays publicly visible after admin approval.
 * Source: Listing Payment Configuration → Free Tier → grace period
 * (tenant theme), falling back to env then the 90-day default.
 */
export function readFreeGraceDays(config?: unknown): number {
  const root = (config ?? {}) as Record<string, unknown>;
  const c = ((root.listingPayment ?? root) as Record<string, unknown> | null) ?? {};
  const raw =
    typeof c.freeGraceDays === "number"
      ? String(c.freeGraceDays)
      : clean(c.freeGraceDays) ?? clean(process.env.LISTING_FREE_GRACE_DAYS);
  if (raw === null) return DEFAULT_FREE_GRACE_DAYS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_FREE_GRACE_DAYS;
  return Math.min(Math.floor(n), 3650);
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
  config?: unknown,
): { ok: true; params: Record<string, unknown> } | { ok: false; error: string } {
  const listingConfig = readListingPaymentConfig(config);
  const priceId = getPriceId(draft.tier, listingConfig);
  const setupFeeId = getSetupFeeId(listingConfig);
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