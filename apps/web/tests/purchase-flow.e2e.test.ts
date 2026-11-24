import { expect, test, type APIRequestContext } from "@playwright/test";
import type { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/billing/payment-events";

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createProduct(
  prefix: string,
  overrides: Partial<Prisma.ProductCreateInput> = {},
) {
  const suffix = unique(prefix);
  return prisma.product.create({
    data: {
      tenantId: TENANT_ID,
      name: suffix,
      slug: suffix,
      type: "SIMPLE",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      regularPrice: 25,
      price: 25,
      publishedAt: new Date(),
      ...overrides,
    },
  });
}

async function createPendingOrder(productId: string, meta: Record<string, unknown> = {}) {
  return prisma.order.create({
    data: {
      tenantId: TENANT_ID,
      orderNumber: unique("ord"),
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 25,
      total: 25,
      meta: meta as Prisma.InputJsonValue,
      items: {
        create: {
          productId,
          name: "E2E product",
          type: "SIMPLE",
          quantity: 1,
          price: 25,
          lineSubtotal: 25,
          lineTotal: 25,
        },
      },
    },
  });
}

async function addToCart(request: APIRequestContext, productId: string) {
  return request.post("/api/cart", { data: { productId, quantity: 1 } });
}

test.describe("Storefront purchase hardening", () => {
  test("cart rejects grouped products", async ({ request }) => {
    const product = await createProduct("grouped-e2e", { type: "GROUPED" });
    try {
      const response = await addToCart(request, product.id);
      expect(response.status()).toBe(409);
      expect((await response.json()).error).toBe(
        "This product must be purchased from its own product page.",
      );
    } finally {
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    }
  });

  test("paid orders grant download links", async () => {
    const product = await createProduct("digital-e2e", {
      downloadable: true,
      virtual: true,
      shippingRequired: false,
      downloadFiles: [{ name: "Guide", url: "/api/assets/guide.pdf" }],
      downloadLimit: 3,
      downloadExpiry: 7,
    });
    const order = await createPendingOrder(product.id);
    try {
      const marked = await markOrderPaid(order.id, "e2e-regression");
      expect(marked).toBe(true);

      const updated = await prisma.order.findUnique({
        where: { id: order.id },
        include: { downloadGrants: true },
      });
      expect(updated?.paymentStatus).toBe("PAID");
      expect(updated?.downloadGrants).toHaveLength(1);
      expect(updated?.downloadGrants[0].name).toBe("Guide");
      expect(updated?.downloadGrants[0].downloadLimit).toBe(3);
    } finally {
      await prisma.digitalDownloadGrant
        .deleteMany({ where: { orderId: order.id } })
        .catch(() => {});
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    }
  });

  test("failed payments restore stock and coupon usage", async () => {
    const suffix = unique("fail-e2e");
    const coupon = await prisma.coupon.create({
      data: {
        tenantId: TENANT_ID,
        code: suffix,
        type: "FIXED_CART",
        amount: 5,
        usedCount: 1,
      },
    });
    const product = await createProduct("fail-e2e", {
      manageStock: true,
      stockQuantity: 3,
    });
    const order = await createPendingOrder(product.id, {
      couponCode: coupon.code,
      stockReserved: true,
      stockQuantity: 1,
    });
    try {
      expect(product.manageStock).toBe(true);
      const marked = await markOrderPaymentFailed(order.id, "e2e-regression", "payment_failed");
      expect(marked).toBe(true);

      const updated = await prisma.order.findUnique({ where: { id: order.id } });
      const refreshedProduct = await prisma.product.findUnique({ where: { id: product.id } });
      const refreshedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(updated?.status).toBe("FAILED");
      expect(updated?.paymentStatus).toBe("FAILED");
      expect(refreshedProduct?.stockQuantity).toBe(4);
      expect(refreshedCoupon?.usedCount).toBe(0);
    } finally {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
      await prisma.coupon.delete({ where: { id: coupon.id } }).catch(() => {});
    }
  });
});
