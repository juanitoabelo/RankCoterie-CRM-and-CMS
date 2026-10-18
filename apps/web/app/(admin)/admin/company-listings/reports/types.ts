/**
 * Shared shapes for the company-listing subscription revenue report.
 * Row shapes are shared with the listing revenue report — only the container
 * differs (both reports render the same tables/charts).
 */
import type { MonthlyFlow } from "@/lib/billing/listing-revenue";

export type {
  SubscriptionRow,
  RenewalRow,
  SubscriptionSortField,
  SortDirection,
  PaginationParams,
  PaginatedResponse,
} from "../../listings/reports/types";
import type {
  SubscriptionRow,
  RenewalRow,
  PaginatedResponse,
} from "../../listings/reports/types";

export type CompanyListingReportsData = {
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
  subscriptions: PaginatedResponse<SubscriptionRow>;
  renewals: RenewalRow[];
};
