/**
 * Shared shapes for the listing subscription revenue report.
 * Kept separate from the "use server" actions module (which may only export
 * async functions) so the client component can import the types.
 */
import type { MonthlyFlow } from "@/lib/billing/listing-revenue";

export type SubscriptionRow = {
  id: string;
  listingId: string;
  title: string;
  tier: string;
  status: string;
  stripeSubId: string | null;
  currentPeriodEnd: string | null;
  paymentGraceUntil: string | null;
  canceledAt: string | null;
  createdAt: string;
  /** Estimated monthly value from the configured tier price. */
  mrr: number;
};

export type RenewalRow = {
  id: string | null;
  listingId: string;
  title: string;
  tier: string;
  currentPeriodEnd: string;
  daysUntil: number;
  /** Estimated monthly value. */
  value: number;
};

export type ListingReportsData = {
  generatedAt: string;
  /** Whether a Stripe secret key was found (config/gateway/env). */
  stripeConfigured: boolean;
  stripeError: string | null;
  currency: string;
  amounts: { currency: string; standard: number; premium: number };

  summary: {
    total: number;
    active: number;
    suspended: number;
    expired: number;
    inGrace: number;
    standard: number;
    premium: number;
    free: number;
    mrr: number;
    arr: number;
    arpu: number;
    new30: number;
    churn30: number;
    renewals30: number;
    renewals30Value: number;

    collected: number;
    refunded: number;
    net: number;
    paidInvoices: number;
    failedInvoices: number;
  };

  byTier: { tier: string; count: number; mrr: number }[];
  byStatus: { status: string; count: number }[];
  monthly: MonthlyFlow[];
  subscriptions: SubscriptionRow[];
  renewals: RenewalRow[];
};
