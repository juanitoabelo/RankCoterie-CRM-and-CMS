import { beforeEach, describe, expect, it, vi } from "vitest";

const orderFindFirst = vi.fn();
const orderFindMany = vi.fn();
const orderUpdate = vi.fn();
const subscriptionFindMany = vi.fn();
const subscriptionCreate = vi.fn();
const userFindFirst = vi.fn();

vi.mock("@/lib/directory/prismaCatalog", () => ({
  prisma: {
    order: {
      findFirst: (...args: unknown[]) => orderFindFirst(...args),
      findMany: (...args: unknown[]) => orderFindMany(...args),
      update: (...args: unknown[]) => orderUpdate(...args),
    },
    subscription: {
      findMany: (...args: unknown[]) => subscriptionFindMany(...args),
      create: (...args: unknown[]) => subscriptionCreate(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => userFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({ TENANT_ID: "tenant-test" }));

import {
  addSubscriptionPeriod,
  buildSubscriptionPlan,
  fulfillSubscriptionsForPaidOrder,
  retryPendingSubscriptionFulfillmentsForCustomer,
  type SubscriptionPlanSnapshot,
} from "../queries";

const plan: SubscriptionPlanSnapshot = {
  productId: "prod_1",
  variantId: "var_1",
  quantity: 1,
  amount: 79,
  interval: "month",
  intervalCount: 1,
  signUpFee: 10,
  length: 12,
  trialPeriod: 0,
  currency: "USD",
};

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order_1",
    userId: "user_1",
    guestEmail: null,
    paymentStatus: "PAID",
    paymentGatewayId: null,
    currency: "USD",
    meta: { subscriptionPlans: [plan] },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  orderFindFirst.mockResolvedValue(paidOrder());
  orderFindMany.mockResolvedValue([]);
  subscriptionFindMany.mockResolvedValue([]);
  subscriptionCreate.mockResolvedValue({ id: "sub_1" });
  orderUpdate.mockResolvedValue({});
  userFindFirst.mockResolvedValue(null);
});

describe("subscription plan helpers", () => {
  it("builds a normalized plan snapshot from product subscription settings", () => {
    expect(
      buildSubscriptionPlan(
        {
          id: "prod_1",
          type: "SUBSCRIPTION",
          subscriptionPeriod: "MONTH",
          subscriptionInterval: 1,
          subscriptionLength: 12,
          subscriptionTrialPeriod: 0,
          subscriptionSignUpFee: 10,
        },
        "var_1",
        79,
        1,
        "USD",
      ),
    ).toEqual(plan);
    expect(
      buildSubscriptionPlan(
        {
          id: "prod_2",
          type: "SIMPLE",
          subscriptionPeriod: null,
          subscriptionInterval: null,
          subscriptionLength: null,
          subscriptionTrialPeriod: null,
          subscriptionSignUpFee: null,
        },
        null,
        10,
        1,
        "USD",
      ),
    ).toBeNull();
  });

  it("clamps month periods to the last day of the target month", () => {
    expect(
      addSubscriptionPeriod(new Date("2026-01-31T00:00:00.000Z"), "month", 1).toISOString(),
    ).toBe("2026-02-28T00:00:00.000Z");
  });
});

describe("fulfillSubscriptionsForPaidOrder", () => {
  it("creates a manual-renewal subscription after payment", async () => {
    const result = await fulfillSubscriptionsForPaidOrder("order_1");

    expect(result).toBe("fulfilled");
    expect(subscriptionCreate).toHaveBeenCalledTimes(1);
    expect(subscriptionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-test",
        orderId: "order_1",
        planKey: "prod_1::var_1",
        customerId: "user_1",
        productId: "prod_1",
        variantId: "var_1",
        status: "active",
        interval: "month",
        intervalCount: 1,
        amount: 79,
        currency: "USD",
      }),
    });
    expect(subscriptionCreate.mock.calls[0][0].data.meta.renewal).toBe("manual");
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: expect.objectContaining({
        meta: expect.objectContaining({ subscriptionFulfillment: "fulfilled" }),
      }),
    });
  });

  it("is idempotent when every plan subscription already exists", async () => {
    subscriptionFindMany.mockResolvedValue([
      { id: "sub_existing", planKey: "prod_1::var_1" },
    ]);

    const result = await fulfillSubscriptionsForPaidOrder("order_1");

    expect(result).toBe("fulfilled");
    expect(subscriptionCreate).not.toHaveBeenCalled();
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: expect.objectContaining({
        meta: expect.objectContaining({ subscriptionFulfillment: "fulfilled" }),
      }),
    });
  });

  it("creates only missing plans on partial fulfillment", async () => {
    const plan2 = { ...plan, productId: "prod_2", variantId: null };
    orderFindFirst.mockResolvedValue(paidOrder({ meta: { subscriptionPlans: [plan, plan2] } }));
    subscriptionFindMany.mockResolvedValue([
      { id: "sub_existing", planKey: "prod_1::var_1" },
    ]);

    const result = await fulfillSubscriptionsForPaidOrder("order_1");

    expect(result).toBe("fulfilled");
    expect(subscriptionCreate).toHaveBeenCalledTimes(1);
    expect(subscriptionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ productId: "prod_2", planKey: "prod_2::", variantId: null }),
    });
  });

  it("leaves fulfillment retryable when the customer cannot be resolved", async () => {
    orderFindFirst.mockResolvedValue(paidOrder({ userId: null, guestEmail: "guest@example.com" }));
    userFindFirst.mockResolvedValue({ id: "user_guest" });

    const result = await fulfillSubscriptionsForPaidOrder("order_1");

    expect(result).toBe("pending");
    expect(userFindFirst).not.toHaveBeenCalled();
    expect(subscriptionCreate).not.toHaveBeenCalled();
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: expect.objectContaining({
        meta: expect.objectContaining({ subscriptionFulfillment: "requires-customer" }),
      }),
    });
  });

  it("retries requires-customer fulfillments for owned orders", async () => {
    orderFindMany.mockResolvedValue([{ id: "order_1" }]);

    const count = await retryPendingSubscriptionFulfillmentsForCustomer("user_1");

    expect(count).toBe(1);
    expect(orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { meta: { path: ["subscriptionFulfillment"], equals: "requires-customer" } },
              ]),
            }),
          ]),
        }),
      }),
    );
  });
});
