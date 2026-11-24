import { prisma, TENANT_ID } from "@/modules/shared";

export type WishlistEntry = { productId: string; variantId: string | null };

const MAX_ITEMS = 100;

/** Accept either raw product ids (legacy localStorage) or structured entries. */
export function normalizeWishlistEntries(input: unknown): WishlistEntry[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const entries: WishlistEntry[] = [];
  for (const value of input) {
    const productId = typeof value === "string" ? value : (value as { productId?: unknown } | null)?.productId;
    if (typeof productId !== "string" || !productId) continue;
    const rawVariant = typeof value === "string" ? null : (value as { variantId?: unknown }).variantId;
    const variantId = typeof rawVariant === "string" && rawVariant ? rawVariant : null;
    const key = `${productId}::${variantId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ productId, variantId });
    if (entries.length >= MAX_ITEMS) break;
  }
  return entries;
}

async function getOrCreateWishlist(userId: string) {
  const existing = await prisma.wishlist.findFirst({
    where: { tenantId: TENANT_ID, userId },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.wishlist.create({
    data: { tenantId: TENANT_ID, userId, name: "My Wishlist", isPublic: false },
    select: { id: true },
  });
}

export async function listWishlistForUser(userId: string): Promise<WishlistEntry[]> {
  const wishlist = await prisma.wishlist.findFirst({
    where: { tenantId: TENANT_ID, userId },
    select: { id: true },
  });
  if (!wishlist) return [];
  const items = await prisma.wishlistItem.findMany({
    where: { wishlistId: wishlist.id },
    select: { productId: true, variantId: true },
    orderBy: { addedAt: "asc" },
  });
  return items.map((item) => ({ productId: item.productId, variantId: item.variantId }));
}

/** Replace the server wishlist with a validated snapshot from the client. */
export async function syncWishlistForUser(userId: string, input: unknown): Promise<WishlistEntry[]> {
  const wishlist = await getOrCreateWishlist(userId);
  const requested = normalizeWishlistEntries(input);
  if (requested.length === 0) {
    await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
    return [];
  }

  const productIds = requested.map((entry) => entry.productId);
  const published = await prisma.product.findMany({
    where: { tenantId: TENANT_ID, status: "PUBLISHED", id: { in: productIds } },
    select: { id: true },
  });
  const allowed = new Set(published.map((product) => product.id));

  const validated: WishlistEntry[] = [];
  for (const entry of requested) {
    if (!allowed.has(entry.productId)) continue;
    if (entry.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: entry.variantId, productId: entry.productId },
        select: { id: true },
      });
      if (!variant) continue;
    }
    validated.push(entry);
  }

  await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
  if (validated.length > 0) {
    await prisma.wishlistItem.createMany({
      data: validated.map((entry) => ({ wishlistId: wishlist.id, ...entry })),
      skipDuplicates: true,
    });
  }
  return validated;
}

export async function addWishlistProduct(userId: string, input: unknown): Promise<WishlistEntry | null> {
  const entry = normalizeWishlistEntries([input])[0];
  if (!entry) return null;
  const [product, current] = await Promise.all([
    prisma.product.findFirst({
      where: { id: entry.productId, tenantId: TENANT_ID, status: "PUBLISHED" },
      select: { id: true },
    }),
    listWishlistForUser(userId),
  ]);
  if (!product) return null;
  if (current.some((item) => item.productId === entry.productId && item.variantId === entry.variantId)) {
    return entry;
  }
  if (current.length >= MAX_ITEMS) return null;
  const wishlist = await getOrCreateWishlist(userId);
  await prisma.wishlistItem.create({
    data: { wishlistId: wishlist.id, ...entry },
  });
  return entry;
}

export async function removeWishlistProduct(
  userId: string,
  productId: string,
  variantId: string | null = null,
): Promise<void> {
  const wishlist = await prisma.wishlist.findFirst({
    where: { tenantId: TENANT_ID, userId },
    select: { id: true },
  });
  if (!wishlist) return;
  await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, productId, variantId },
  });
}
