import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildCheckoutParams,
  DEFAULT_FREE_GRACE_DAYS,
  getPriceId,
  getSetupFeeId,
  isStripeConfigured,
  readFreeGraceDays,
} from "./checkout";

describe("buildCheckoutParams", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  const draft = {
    listingId: "l-1",
    tier: "PREMIUM" as const,
    listingTitle: "Clearview Horizon",
  };

  it("rejects when tier price is missing", () => {
    process.env.STRIPE_PRICE_PREMIUM = "";
    process.env.STRIPE_SETUP_FEE_ID = "price_setup";
    const res = buildCheckoutParams(draft, {
      successUrl: "http://x/s",
      cancelUrl: "http://x/c",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("STRIPE_PRICE_PREMIUM");
  });

  it("rejects when setup fee is missing", () => {
    process.env.STRIPE_PRICE_PREMIUM = "price_prem";
    process.env.STRIPE_SETUP_FEE_ID = "";
    const res = buildCheckoutParams(draft, {
      successUrl: "http://x/s",
      cancelUrl: "http://x/c",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("STRIPE_SETUP_FEE_ID");
  });

  it("builds subscription checkout with setup fee + recurring line items", () => {
    process.env.STRIPE_PRICE_PREMIUM = "price_prem";
    process.env.STRIPE_SETUP_FEE_ID = "price_setup";
    const res = buildCheckoutParams(draft, {
      successUrl: "http://x/s?listingId=l-1",
      cancelUrl: "http://x/c",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const p = res.params;
    expect(p.mode).toBe("subscription");
    expect(p.line_items).toEqual([
      { price: "price_prem", quantity: 1 },
      { price: "price_setup", quantity: 1 },
    ]);
    expect(p.metadata).toEqual({ listingId: "l-1", tier: "PREMIUM" });
    expect(p.client_reference_id).toBe("l-1");
    expect(p.subscription_data).toEqual({ metadata: { listingId: "l-1" } });
  });

  it("exposes tier→env mapping helpers", () => {
    expect(getPriceId("STANDARD")).toBeNull();
    process.env.STRIPE_PRICE_STANDARD = "price_std";
    expect(getPriceId("STANDARD")).toBe("price_std");
    expect(getPriceId("FREE")).toBeNull();
    process.env.STRIPE_SETUP_FEE_ID = "price_setup";
    expect(getSetupFeeId()).toBe("price_setup");
    expect(isStripeConfigured()).toBe(false); // no SECRET_KEY yet
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(isStripeConfigured()).toBe(true);
  });
});
describe("readFreeGraceDays", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.LISTING_FREE_GRACE_DAYS;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("defaults to 90 days when unconfigured", () => {
    expect(readFreeGraceDays({})).toBe(DEFAULT_FREE_GRACE_DAYS);
    expect(readFreeGraceDays()).toBe(DEFAULT_FREE_GRACE_DAYS);
  });

  it("reads the tenant listingPayment.freeGraceDays setting", () => {
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: 30 } })).toBe(30);
    expect(readFreeGraceDays({ freeGraceDays: 14 })).toBe(14);
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: "45" } })).toBe(45);
  });

  it("honours a 0-day setting (FREE never publicly visible)", () => {
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: 0 } })).toBe(0);
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: "0" } })).toBe(0);
  });

  it("falls back to env, then default", () => {
    process.env.LISTING_FREE_GRACE_DAYS = "60";
    expect(readFreeGraceDays({})).toBe(60);
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: 30 } })).toBe(30);
    delete process.env.LISTING_FREE_GRACE_DAYS;
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: "abc" } })).toBe(DEFAULT_FREE_GRACE_DAYS);
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: -5 } })).toBe(DEFAULT_FREE_GRACE_DAYS);
  });

  it("clamps absurd values to 3650 and floors fractions", () => {
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: 99999 } })).toBe(3650);
    expect(readFreeGraceDays({ listingPayment: { freeGraceDays: 10.7 } })).toBe(10);
  });
});
