/**
 * Cart stock clamping — guards the "cart can exceed available stock" bug.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const productFindFirst = vi.fn();
const cartFindFirst = vi.fn();
const cartItemFindFirst = vi.fn();
const cartItemDeleteMany = vi.fn();
const variantFindUnique = vi.fn();
const cartItemUpdate = vi.fn();
const cartItemCreate = vi.fn();
const cartItemFindMany = vi.fn();
const cartUpdate = vi.fn();

const tx = {
  cartItem: {
    update: (...args: unknown[]) => cartItemUpdate(...args),
    create: (...args: unknown[]) => cartItemCreate(...args),
    findMany: (...args: unknown[]) => cartItemFindMany(...args),
  },
  cart: { update: (...args: unknown[]) => cartUpdate(...args) },
};

vi.mock("@/lib/directory/prismaCatalog", () => ({
  prisma: {
    product: { findFirst: (...args: unknown[]) => productFindFirst(...args) },
    cart: { findFirst: (...args: unknown[]) => cartFindFirst(...args) },
    cartItem: {
      findFirst: (...args: unknown[]) => cartItemFindFirst(...args),
      deleteMany: (...args: unknown[]) => cartItemDeleteMany(...args),
    },
    productVariant: { findUnique: (...args: unknown[]) => variantFindUnique(...args) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));

vi.mock("@/lib/tenant", () => ({ TENANT_ID: "tenant-test" }));

import { addItemToCart, availableStock, updateCartItemQuantity } from "../queries";

type ProductOverrides = Partial<{
  id: string;
  name: string;
  price: number;
  stockStatus: string;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders: string;
}>;

function makeProduct(overrides: ProductOverrides = {}) {
  return {
    id: "prod_1",
    name: "Widget",
    price: 10,
    stockStatus: "IN_STOCK",
    manageStock: true,
    stockQuantity: 5,
    backorders: "no",
    ...overrides,
  };
}

function makeCart(items: unknown[] = []) {
  return { id: "cart_1", items };
}

beforeEach(() => {
  vi.clearAllMocks();
  cartItemFindMany.mockResolvedValue([]);
  cartItemUpdate.mockResolvedValue({});
  cartItemCreate.mockResolvedValue({ id: "item_new" });
  cartUpdate.mockResolvedValue({});
  cartItemDeleteMany.mockResolvedValue({ count: 1 });
  cartFindFirst.mockResolvedValue(makeCart());
  variantFindUnique.mockResolvedValue(null);
});

describe("availableStock", () => {
  it("is unlimited when stock management is off", () => {
    expect(availableStock({ manageStock: false, stockQuantity: 0, backorders: "no" })).toBeNull();
  });

  it("is unlimited when stockQuantity is null", () => {
    expect(availableStock({ manageStock: true, stockQuantity: null, backorders: "no" })).toBeNull();
  });

  it("is unlimited when backorders are allowed (yes/notify)", () => {
    expect(availableStock({ manageStock: true, stockQuantity: 0, backorders: "yes" })).toBeNull();
    expect(availableStock({ manageStock: true, stockQuantity: 0, backorders: "notify" })).toBeNull();
  });

  it("returns the quantity when backorders are not allowed", () => {
    expect(availableStock({ manageStock: true, stockQuantity: 7, backorders: "no" })).toBe(7);
    expect(availableStock({ manageStock: true, stockQuantity: 7 })).toBe(7);
  });
});

describe("addItemToCart", () => {
  it("caps a new item at the available stock and warns", async () => {
    productFindFirst.mockResolvedValue(makeProduct({ stockQuantity: 3 }));

    const result = await addItemToCart("cart_1", "prod_1", 5);

    expect(result.ok).toBe(true);
    expect(result.warning).toBe("Only 3 left in stock — quantity capped.");
    expect(cartItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 3 }) }),
    );
  });

  it("allows overselling when backorders are allowed", async () => {
    productFindFirst.mockResolvedValue(makeProduct({ stockQuantity: 3, backorders: "yes" }));

    const result = await addItemToCart("cart_1", "prod_1", 5);

    expect(result.ok).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(cartItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 5 }) }),
    );
  });

  it("rejects a new item when out of stock", async () => {
    productFindFirst.mockResolvedValue(makeProduct({ stockQuantity: 0 }));

    const result = await addItemToCart("cart_1", "prod_1", 1);

    expect(result).toEqual({ ok: false, error: "Product is out of stock." });
    expect(cartItemCreate).not.toHaveBeenCalled();
  });

  it("caps an existing cart item without lowering what is already there", async () => {
    productFindFirst.mockResolvedValue(makeProduct({ stockQuantity: 3 }));
    cartFindFirst.mockResolvedValue(
      makeCart([{ id: "item_1", productId: "prod_1", variantId: null, quantity: 2, price: 10 }]),
    );

    const result = await addItemToCart("cart_1", "prod_1", 5);

    expect(result).toEqual({
      ok: true,
      cartItemId: "item_1",
      warning: "Only 3 left in stock — quantity capped.",
    });
    expect(cartItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 3 }) }),
    );
  });

  it("keeps an existing quantity when stock has since dropped to zero", async () => {
    productFindFirst.mockResolvedValue(makeProduct({ stockQuantity: 0 }));
    cartFindFirst.mockResolvedValue(
      makeCart([{ id: "item_1", productId: "prod_1", variantId: null, quantity: 2, price: 10 }]),
    );

    const result = await addItemToCart("cart_1", "prod_1", 1);

    expect(result.ok).toBe(true);
    expect(result.warning).toBe("Product is out of stock.");
    expect(cartItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 2 }) }),
    );
  });

  it("does not clamp when stock management is off", async () => {
    productFindFirst.mockResolvedValue(makeProduct({ manageStock: false, stockQuantity: null }));

    const result = await addItemToCart("cart_1", "prod_1", 50);

    expect(result.ok).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(cartItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 50 }) }),
    );
  });
});

describe("updateCartItemQuantity", () => {
  it("clamps the requested quantity to available stock with a warning", async () => {
    cartItemFindFirst.mockResolvedValue({
      id: "item_1",
      cartId: "cart_1",
      price: 10,
      product: { manageStock: true, stockQuantity: 4, backorders: "no" },
    });

    const result = await updateCartItemQuantity("cart_1", "item_1", 10);

    expect(result).toEqual({
      ok: true,
      warning: "Only 4 left in stock — quantity capped.",
    });
    expect(cartItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 4, lineTotal: 40 } }),
    );
  });

  it("allows the requested quantity when backorders are allowed", async () => {
    cartItemFindFirst.mockResolvedValue({
      id: "item_1",
      cartId: "cart_1",
      price: 10,
      product: { manageStock: true, stockQuantity: 1, backorders: "notify" },
    });

    const result = await updateCartItemQuantity("cart_1", "item_1", 10);

    expect(result).toEqual({ ok: true, warning: undefined });
    expect(cartItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 10, lineTotal: 100 } }),
    );
  });

  it("does not clamp when stock management is off", async () => {
    cartItemFindFirst.mockResolvedValue({
      id: "item_1",
      cartId: "cart_1",
      price: 10,
      product: { manageStock: false, stockQuantity: null, backorders: "no" },
    });

    const result = await updateCartItemQuantity("cart_1", "item_1", 42);

    expect(result).toEqual({ ok: true, warning: undefined });
    expect(cartItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 42, lineTotal: 420 } }),
    );
  });

  it("removes the item when quantity drops below 1", async () => {
    const result = await updateCartItemQuantity("cart_1", "item_1", 0);

    expect(result.ok).toBe(true);
    expect(cartItemDeleteMany).toHaveBeenCalled();
    expect(cartItemUpdate).not.toHaveBeenCalled();
  });

  it("errors when the cart item does not exist", async () => {
    cartItemFindFirst.mockResolvedValue(null);

    const result = await updateCartItemQuantity("cart_1", "missing", 2);

    expect(result).toEqual({ ok: false, error: "Cart item not found." });
  });
});
