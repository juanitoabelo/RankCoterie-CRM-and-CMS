/**
 * Menus Module — Database Queries
 * 
 * All database queries for menu operations.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { MenuWithItems, MenuFilter, MenuLocation } from "./types";

/** Fetch menus with optional filters */
export async function getMenus(filter: MenuFilter = {}): Promise<MenuWithItems[]> {
  const { location, search } = filter;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (location) where.location = location;
  if (search) where.name = { contains: search, mode: "insensitive" };
  
  return prisma.menu.findMany({
    where,
    include: {
      items: {
        where: { parentId: null },
        orderBy: { order: "asc" },
        include: {
          children: { orderBy: { order: "asc" } },
        },
      },
    },
    orderBy: { name: "asc" },
  }) as Promise<MenuWithItems[]>;
}

/** Fetch a single menu by ID */
export async function getMenuById(id: string) {
  return prisma.menu.findUnique({
    where: { id },
    include: {
      items: {
        where: { parentId: null },
        orderBy: { order: "asc" },
        include: {
          children: { orderBy: { order: "asc" } },
        },
      },
    },
  });
}

/** Fetch menu by location (for layouts) */
export async function getMenuByLocation(location: MenuLocation) {
  return prisma.menu.findFirst({
    where: { tenantId: TENANT_ID, location },
    include: {
      items: {
        where: { parentId: null },
        orderBy: { order: "asc" },
        include: {
          children: { orderBy: { order: "asc" } },
        },
      },
    },
  });
}
