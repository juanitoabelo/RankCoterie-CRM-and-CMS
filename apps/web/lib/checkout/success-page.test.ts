import { beforeEach, describe, expect, it, vi } from "vitest";

const orderFindFirst = vi.fn();
const listingFindUnique = vi.fn();
const clearCart = vi.fn();
const getCartBySession = vi.fn();
const readExistingCartSession = vi.fn();
const verifyOrderAccessToken = vi.fn();
const orderAccessTokenMatchesOrder = vi.fn();

vi.mock("@/modules/shared", () => ({
  TENANT_ID: "tenant-test",
  prisma: {
    order: { findFirst: (...args: unknown[]) => orderFindFirst(...args) },
    listing: { findUnique: (...args: unknown[]) => listingFindUnique(...args) },
  },
}));
vi.mock("@/modules/ecommerce/queries", () => ({
  clearCart: (...args: unknown[]) => clearCart(...args),
  getCartBySession: (...args: unknown[]) => getCartBySession(...args),
}));
vi.mock("@/lib/cart-session", () => ({
  readExistingCartSession: (...args: unknown[]) => readExistingCartSession(...args),
}));
vi.mock("@/lib/checkout/order-access", () => ({
  verifyOrderAccessToken: (...args: unknown[]) => verifyOrderAccessToken(...args),
  orderAccessTokenMatchesOrder: (...args: unknown[]) => orderAccessTokenMatchesOrder(...args),
}));
vi.mock("@/components/analytics/ConversionTracker", () => ({
  default: () => null,
}));
vi.mock("next/link", () => ({ default: ({ children }: { children: unknown }) => children }));

import CheckoutSuccessPage from "../../app/(site)/checkout/success/page";

function texts(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(texts).join(" ");
  if (node && typeof node === "object" && "props" in node) {
    return texts((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}

const order = {
  id: "ord_1",
  orderNumber: "CNP-1001",
  paymentStatus: "AUTHORIZED",
  paymentMethod: "MANUAL",
  paymentMethodTitle: "Cash on delivery",
  currency: "USD",
  total: 30,
  items: [{ id: "item_1", name: "Planter", quantity: 1, lineTotal: 30 }],
};

async function render(params: { orderId?: string; access?: string }) {
  const element = await CheckoutSuccessPage({ searchParams: Promise.resolve(params) });
  return texts(element);
}

beforeEach(() => {
  vi.clearAllMocks();
  readExistingCartSession.mockResolvedValue("cart_session_1");
  getCartBySession.mockResolvedValue({ id: "cart_1" });
  clearCart.mockResolvedValue(undefined);
  orderFindFirst.mockResolvedValue(order);
  verifyOrderAccessToken.mockResolvedValue({ oid: "ord_1", tid: "tenant-test", email: "a@example.com" });
  orderAccessTokenMatchesOrder.mockReturnValue(true);
});

describe("checkout success page", () => {
  it("shows a signed-in-scope order with accurate manual payment copy and clears the cart", async () => {
    const output = await render({ orderId: "ord_1", access: "signed-token" });
    expect(output).toContain("Awaiting manual payment");
    expect(output).not.toContain("Payment confirmed");
    expect(orderFindFirst).toHaveBeenCalledWith({
      where: { id: "ord_1", tenantId: "tenant-test" },
      include: { items: true },
    });
    expect(clearCart).toHaveBeenCalledWith("cart_1");
  }, 15000);

  it("never looks up an order without a valid signed token", async () => {
    verifyOrderAccessToken.mockResolvedValue(null);
    const output = await render({ orderId: "ord_1" });
    expect(output).toContain("Checkout link unavailable");
    expect(output).not.toContain("CNP-1001");
    expect(orderFindFirst).not.toHaveBeenCalled();
    expect(clearCart).not.toHaveBeenCalled();
  });

  it("does not reveal order details when the token does not match the order", async () => {
    orderAccessTokenMatchesOrder.mockReturnValue(false);
    const output = await render({ orderId: "ord_1", access: "signed-token" });
    expect(output).toContain("Checkout link unavailable");
    expect(output).not.toContain("CNP-1001");
    expect(clearCart).not.toHaveBeenCalled();
  });
});
