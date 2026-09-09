/**
 * Users Module — Database Queries
 * 
 * All database queries for user operations.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { UsersFilter, PaginatedUsers, UserWithRoles } from "./types";

const DEFAULT_PAGE_SIZE = 50;

/** Fetch paginated users with filters */
export async function getUsers(filter: UsersFilter = {}): Promise<PaginatedUsers> {
  const { search, department, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  
  if (department && department !== "All") {
    where.department = department;
  }
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { roles: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users as UserWithRoles[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Fetch a single user by ID */
export async function getUserById(id: string) {
  return prisma.user.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: { roles: true },
  });
}
