/**
 * Billing Module — Database Queries
 * 
 * All database queries for billing operations (invoices, clients, merchants).
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { InvoiceWithRelations, ClientWithRelations, MerchantWithRelations, BillingFilter, PaginatedBilling } from "./types";

const DEFAULT_PAGE_SIZE = 50;

// ============================================================================
// Invoices
// ============================================================================

/** Fetch paginated invoices */
export async function getInvoices(filter: BillingFilter = {}): Promise<PaginatedBilling<InvoiceWithRelations>> {
  const { status = "ALL", clientId, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = {};
  if (status !== "ALL") where.status = status;
  if (clientId) where.clientId = clientId;
  
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items: items as unknown as InvoiceWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch invoice stats by status */
export async function getInvoiceStats() {
  return prisma.invoice.groupBy({
    by: ["status"],
    _count: true,
    _sum: { amount: true },
  });
}

/** Fetch a single invoice by ID */
export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { client: true },
  });
}

// ============================================================================
// Clients
// ============================================================================

/** Fetch paginated clients */
export async function getClients(filter: BillingFilter = {}): Promise<PaginatedBilling<ClientWithRelations>> {
  const { search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  
  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { _count: { select: { invoices: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return { items: items as ClientWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch a single client by ID */
export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: { invoices: true },
  });
}

// ============================================================================
// Merchants
// ============================================================================

/** Fetch all merchants */
export async function getMerchants(): Promise<MerchantWithRelations[]> {
  return prisma.merchant.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { createdAt: "desc" },
  }) as unknown as Promise<MerchantWithRelations[]>;
}

/** Fetch a single merchant by ID */
export async function getMerchantById(id: string) {
  return prisma.merchant.findUnique({ where: { id } });
}
