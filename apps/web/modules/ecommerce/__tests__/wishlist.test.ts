import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const create = vi.fn();
const findMany = vi.fn();
const createMany = vi.fn();
const deleteMany = vi.fn();
const productFindMany = vi.fn();
const variantFindFirst = vi.fn();

vi.mock("@/modules/shared", () => ({
  TENANT_ID: "tenant-test",
  prisma: {
    wishlist: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      create: (...args: unknown[]) => create(...args),
    },
    wishlistItem: {
      findMany: (...args: unknown[]) => findMany(...args),
      createMany: (...args: unknown[]) => createMany(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
      create: (...args: unknown[]) => createMany(...args),
    },
    product: {
      findMany: (...args: unknown[]) => productFindMany(...args),
    },
    productVariant: {
      findFirst: (...args: unknown[]) => variantFindFirst(...args),
    },
  },
}));

import {
  normalizeWishlistEntries,
  syncWishlistForUser,
} from "../wishlist";

describe("server wishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue({ id: "wishlist-1" });
    productFindMany.mockResolvedValue([
      { id: "p1" },
      { id: "p2" },
    ]);
    variantFindFirst.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(args.where.id === "v1" ? { id: "v1" } : null),
    );
    findMany.mockResolvedValue([{ productId: "p1", variantId: null }]);
    createMany.mockResolvedValue({ count: 2 });
    deleteMany.mockResolvedValue({ count: 1 });
  });

  it("normalizes ids and ignores malformed or duplicate entries", () => {
    expect(
      normalizeWishlistEntries([
        "p1",
        { productId: "p2", variantId: "v1" },
        { productId: "p1", variantId: null },
        null,
        { productId: "", variantId: undefined },
      ]),
    ).toEqual([
      { productId: "p1", variantId: null },
      { productId: "p2", variantId: "v1" },
    ]);
  });

  it("replaces items with only tenant-published products and valid variants", async () => {
    const result = await syncWishlistForUser("user-1", [
      { productId: "p1", variantId: null },
      { productId: "p2", variantId: "v1" },
      { productId: "missing", variantId: null },
      { productId: "p2", variantId: "bad" },
    ]);

    expect(result).toEqual([
      { productId: "p1", variantId: null },
      { productId: "p2", variantId: "v1" },
    ]);
    expect(deleteMany).toHaveBeenCalledWith({ where: { wishlistId: "wishlist-1" } });
    const inserted = createMany.mock.calls[0][0] as {
      data: Array<{ productId: string; variantId: string | null }>;
    };
    expect(inserted.data).toEqual(result.map((entry) => ({ ...entry, wishlistId: "wishlist-1" })));
    const productQuery = productFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(productQuery.where).toMatchObject({ tenantId: "tenant-test", status: "PUBLISHED" });
  });

  it("creates a default wishlist when none exists", async () => {
    findFirst.mockResolvedValueOnce(null);
    create.mockResolvedValueOnce({ id: "wishlist-new" });
    await syncWishlistForUser("user-2", [{ productId: "p1", variantId: null }]);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: "tenant-test", userId: "user-2", name: "My Wishlist" }),
      }),
    );
  });
});
