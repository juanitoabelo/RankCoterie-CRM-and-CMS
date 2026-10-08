export type ListingPaymentSettings = {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  standardPriceId: string;
  premiumPriceId: string;
  freePriceId: string;
  customPriceId: string;
  setupFeeId: string;
  standardLabel: string;
  standardAmount: string;
  premiumLabel: string;
  premiumAmount: string;
  /** Days a FREE-tier listing stays publicly visible after admin approval. */
  freeGraceDays: number;
};

export const DEFAULT_LISTING_PAYMENT_SETTINGS: ListingPaymentSettings = {
  secretKey: "",
  publishableKey: "",
  webhookSecret: "",
  standardPriceId: "",
  premiumPriceId: "",
  freePriceId: "",
  customPriceId: "",
  setupFeeId: "",
  standardLabel: "Standard",
  standardAmount: "97",
  premiumLabel: "Premium",
  premiumAmount: "197",
  freeGraceDays: 90,
};

export type ListingPaymentActionResult = { ok: true } | { ok: false; error: string };
