/**
 * Billing Module — Types
 * 
 * Defines types for billing operations (invoices, clients, merchants).
 * Types match the actual Prisma schema fields.
 */

/** Invoice status */
export type InvoiceStatus = "ATTEMPTED" | "APPROVED" | "DECLINED" | "ERROR" | "REFUNDED" | "CHARGEDBACK";

/** Invoice with relations */
export interface InvoiceWithRelations {
  id: string;
  clientId: string;
  amount: number;
  chargeDate: Date | null;
  status: string;
  isRecurring: boolean;
  interval: string | null;
  retries: number;
  stripePaymentId: string | null;
  responseMsg: string | null;
  createdAt: Date;
  client?: { id: string; firstName: string | null; lastName: string | null } | null;
}

/** Client with relations */
export interface ClientWithRelations {
  id: string;
  tenantId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phones: unknown;
  maskedCard: string | null;
  assignedToId: string | null;
  leadId: string | null;
  campaignId: string | null;
  isPartial: boolean;
  createdAt: Date;
  invoices?: Array<{
    id: string;
    amount: unknown; // Prisma.Decimal at runtime
    status: string;
    isRecurring: boolean;
    interval: string | null;
    chargeDate: Date | null;
  }>;
  _count?: { invoices: number };
}

/** Client query filters */
export interface ClientFilter {
  search?: string;
  /** Only partial (incomplete billing) clients. */
  partial?: boolean;
  /** Only clients with at least one recurring invoice. */
  recurring?: boolean;
  /** Created-at range (ISO date strings, inclusive). */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** Merchant with relations */
export interface MerchantWithRelations {
  id: string;
  name: string;
  tenantId: string;
  contactName: string | null;
  email: string | null;
  listingId: string | null;
  stripeAccountId: string | null;
  status: string;
  payoutMethod: string | null;
  feePercent: number;
  createdAt: Date;
}

/** Billing query filters */
export interface BillingFilter {
  status?: InvoiceStatus | "ALL";
  clientId?: string;
  search?: string;
  /** Client text search (name/email) applied through the relation. */
  client?: string;
  /** Created-at range (ISO date strings, inclusive). */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated response */
export interface PaginatedBilling<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Invoice status badge mapping */
export const INVOICE_STATUS_BADGE: Record<string, string> = {
  ATTEMPTED: "bg-zinc-100 text-zinc-600",
  APPROVED: "bg-emerald-50 text-emerald-700",
  DECLINED: "bg-red-50 text-red-700",
  ERROR: "bg-zinc-100 text-zinc-600",
  REFUNDED: "bg-sky-50 text-sky-700",
  CHARGEDBACK: "bg-purple-50 text-purple-700",
};
