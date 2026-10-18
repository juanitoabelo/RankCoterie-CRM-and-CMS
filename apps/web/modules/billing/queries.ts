/**
 * Billing Module — Database Queries
 *
 * All database queries for billing operations (invoices, clients, merchants).
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { withDbRetry } from "@/lib/db-retry";
import { TENANT_ID } from "@/lib/tenant";
import type {
  InvoiceWithRelations,
  ClientWithRelations,
  MerchantWithRelations,
  BillingFilter,
  ClientFilter,
  PaginatedBilling,
} from "./types";

const DEFAULT_PAGE_SIZE = 50;

function dateRangeWhere(from?: string, to?: string) {
  const fromDate = from && !Number.isNaN(new Date(from).getTime()) ? new Date(from) : null;
  const toDate = to && !Number.isNaN(new Date(to).getTime()) ? new Date(to) : null;
  if (!fromDate && !toDate) return null;
  return {
    ...(fromDate ? { gte: fromDate } : {}),
    ...(toDate ? { lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
  };
}

// ============================================================================
// Invoices
// ============================================================================

/** Fetch paginated invoices (tenant-scoped through the client). */
export async function getInvoices(filter: BillingFilter = {}): Promise<PaginatedBilling<InvoiceWithRelations>> {
  const { status = "ALL", clientId, client, from, to, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { client: { tenantId: TENANT_ID } };
  if (status !== "ALL") where.status = status;
  if (clientId) where.clientId = clientId;
  if (client) {
    where.client = {
      tenantId: TENANT_ID,
      OR: [
        { firstName: { contains: client, mode: "insensitive" } },
        { lastName: { contains: client, mode: "insensitive" } },
        { email: { contains: client, mode: "insensitive" } },
      ],
    };
  }
  const createdAt = dateRangeWhere(from, to);
  if (createdAt) where.createdAt = createdAt;

  const [items, total] = await withDbRetry(() =>
    Promise.all([
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
    ]),
  );

  return { items: items as unknown as InvoiceWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch invoice stats by status (tenant-scoped through the client). */
export async function getInvoiceStats() {
  return withDbRetry(() =>
    prisma.invoice.groupBy({
      by: ["status"],
      where: { client: { tenantId: TENANT_ID } },
      _count: true,
      _sum: { amount: true },
    }),
  );
}

/** Fetch a single invoice by ID */
export async function getInvoiceById(id: string) {
  return withDbRetry(() =>
    prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    }),
  );
}

// ============================================================================
// Clients
// ============================================================================

/** Fetch paginated clients with invoice rollups (search / partial / recurring / date filters). */
export async function getClients(filter: ClientFilter = {}): Promise<PaginatedBilling<ClientWithRelations>> {
  const { search, partial, recurring, from, to, page = 1, pageSize = 50 } = filter;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (partial === true) where.isPartial = true;
  if (recurring === true) where.invoices = { some: { isRecurring: true } };
  const createdAt = dateRangeWhere(from, to);
  if (createdAt) where.createdAt = createdAt;

  const [items, total] = await withDbRetry(() =>
    Promise.all([
      prisma.client.findMany({
        where,
        include: { invoices: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.client.count({ where }),
    ]),
  );

  return {
    items: items as unknown as ClientWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Fetch a single client by ID */
export async function getClientById(id: string) {
  return withDbRetry(() =>
    prisma.client.findUnique({
      where: { id },
      include: { invoices: true, notes: { orderBy: { createdAt: "desc" } } },
    }),
  );
}

// ============================================================================
// Merchants
// ============================================================================

/** Fetch all merchants */
export async function getMerchants(): Promise<MerchantWithRelations[]> {
  return withDbRetry(() =>
    prisma.merchant.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { createdAt: "desc" },
    }),
  ) as unknown as Promise<MerchantWithRelations[]>;
}

/** Fetch a single merchant by ID */
export async function getMerchantById(id: string) {
  return withDbRetry(() => prisma.merchant.findUnique({ where: { id } }));
}
