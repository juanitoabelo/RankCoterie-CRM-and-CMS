export type CompanyListingPaymentSettings = {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  standardPriceId: string;
  premiumPriceId: string;
  setupFeeId: string;
  /** One-time landing page setup fee amount — default for generated invoices. */
  setupFeeAmount: string;
  standardLabel: string;
  standardAmount: string;
  premiumLabel: string;
  premiumAmount: string;
};

export const DEFAULT_COMPANY_LISTING_PAYMENT_SETTINGS: CompanyListingPaymentSettings = {
  secretKey: "",
  publishableKey: "",
  webhookSecret: "",
  standardPriceId: "",
  premiumPriceId: "",
  setupFeeId: "",
  setupFeeAmount: "",
  standardLabel: "Standard",
  standardAmount: "97",
  premiumLabel: "Premium",
  premiumAmount: "197",
};

export type CompanyListingPaymentActionResult = { ok: true } | { ok: false; error: string };
