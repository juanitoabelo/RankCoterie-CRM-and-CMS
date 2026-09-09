/**
 * Shared Module — Public API
 * 
 * Provides shared utilities for use across all modules including
 * database access, tenant configuration, and caching.
 * 
 * @example
 * ```tsx
 * // In any module
 * import { prisma, TENANT_ID, MemoryCache } from "@/modules/shared";
 * 
 * const listings = await prisma.listing.findMany({
 *   where: { tenantId: TENANT_ID }
 * });
 * ```
 */

// Database
/** Prisma client instance */
export { prisma } from "./prisma";

// Tenant
/** Current tenant ID */
export { TENANT_ID } from "./tenant";

// Caching
/** In-memory cache with TTL support */
export { MemoryCache } from "./cache";
