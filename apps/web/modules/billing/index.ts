/**
 * Billing Module — Public API
 * 
 * Provides billing management for invoices, clients, and merchants.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getInvoices, getInvoiceStats } from "@/modules/billing";
 * 
 * const { invoices, total } = await getInvoices({ status: "PENDING", page: 1 });
 * const stats = await getInvoiceStats();
 * ```
 */

// Types
/** Invoice status type */
export type { InvoiceStatus } from "./types";
/** Invoice with relations */
export type { InvoiceWithRelations } from "./types";
/** Client with relations */
export type { ClientWithRelations } from "./types";
/** Merchant with relations */
export type { MerchantWithRelations } from "./types";
/** Billing filter options */
export type { BillingFilter } from "./types";
/** Paginated billing response */
export type { PaginatedBilling } from "./types";
/** Invoice status badge configuration */
export { INVOICE_STATUS_BADGE } from "./types";

// Queries
/** Get paginated invoices with filters */
export { getInvoices } from "./queries";
/** Get invoice statistics */
export { getInvoiceStats } from "./queries";
/** Get a single invoice by ID */
export { getInvoiceById } from "./queries";
/** Get paginated clients */
export { getClients } from "./queries";
/** Get a single client by ID */
export { getClientById } from "./queries";
/** Get paginated merchants */
export { getMerchants } from "./queries";
/** Get a single merchant by ID */
export { getMerchantById } from "./queries";
