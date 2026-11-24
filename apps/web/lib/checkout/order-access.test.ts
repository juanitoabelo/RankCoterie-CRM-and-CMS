import { beforeEach, describe, expect, it } from "vitest";
import {
  createOrderAccessToken,
  orderAccessTokenMatchesOrder,
  verifyOrderAccessToken,
} from "./order-access";

const input = {
  orderId: "ord_1",
  tenantId: "tenant-test",
  email: "Buyer@Example.com",
  sessionId: "cart_session_123",
  checkoutToken: "checkout-token-1",
};

beforeEach(() => {
  process.env.ORDER_ACCESS_SECRET = "order-access-test-secret";
});

describe("order access tokens", () => {
  it("round-trips a token with its bindings", async () => {
    const token = await createOrderAccessToken(input);
    const payload = await verifyOrderAccessToken(token, {
      orderId: input.orderId,
      tenantId: input.tenantId,
    });
    expect(payload).toMatchObject({
      v: 1,
      oid: input.orderId,
      tid: input.tenantId,
      email: "buyer@example.com",
      sid: input.sessionId,
      ckt: input.checkoutToken,
    });
  });

  it("rejects tampered, malformed and wrong-order tokens", async () => {
    const token = await createOrderAccessToken(input);
    const dot = token.lastIndexOf(".");
    const sig = token.slice(dot + 1);
    const tampered = `${token.slice(0, dot + 1)}${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}`;
    expect(await verifyOrderAccessToken(tampered, { orderId: input.orderId, tenantId: input.tenantId })).toBeNull();
    expect(await verifyOrderAccessToken("garbage", { orderId: input.orderId, tenantId: input.tenantId })).toBeNull();
    expect(await verifyOrderAccessToken(token, { orderId: "ord_2", tenantId: input.tenantId })).toBeNull();
    expect(await verifyOrderAccessToken(token, { orderId: input.orderId, tenantId: "tenant-other" })).toBeNull();
  });

  it("expires tokens", async () => {
    const token = await createOrderAccessToken(input, { now: 1_000, ttlSeconds: 10 });
    expect(await verifyOrderAccessToken(token, { orderId: input.orderId, tenantId: input.tenantId }, 1_005)).not.toBeNull();
    expect(await verifyOrderAccessToken(token, { orderId: input.orderId, tenantId: input.tenantId }, 11_000)).toBeNull();
  });

  it("authorizes by email, cart session, or checkout token only when values match the order", async () => {
    const token = await createOrderAccessToken(input);
    const payload = await verifyOrderAccessToken(token, { orderId: input.orderId, tenantId: input.tenantId });
    const order = {
      tenantId: input.tenantId,
      guestEmail: "Buyer@example.com",
      billingEmail: null,
      userId: null,
      meta: { cartSessionId: input.sessionId, checkoutToken: input.checkoutToken },
    };
    expect(payload && orderAccessTokenMatchesOrder(payload, order, null)).toBeTruthy();
    expect(payload && orderAccessTokenMatchesOrder(payload, order, "other-session")).toBeTruthy();
    expect(
      payload &&
        orderAccessTokenMatchesOrder(
          payload,
          { ...order, guestEmail: "other@example.com", meta: {} },
          "other-session",
        ),
    ).toBeFalsy();
    expect(
      payload &&
        orderAccessTokenMatchesOrder(
          payload,
          { ...order, guestEmail: null, meta: { cartSessionId: input.sessionId } },
          input.sessionId,
        ),
    ).toBeTruthy();
    expect(
      payload &&
        orderAccessTokenMatchesOrder(
          payload,
          { ...order, guestEmail: null, meta: { cartSessionId: input.sessionId } },
          null,
        ),
    ).toBeFalsy();
  });

  it("does not authorize a token without any binding", async () => {
    const token = await createOrderAccessToken({ orderId: "ord_1", tenantId: "tenant-test" });
    const payload = await verifyOrderAccessToken(token, { orderId: "ord_1", tenantId: "tenant-test" });
    expect(payload && orderAccessTokenMatchesOrder(payload, { tenantId: "tenant-test", meta: {} }, null)).toBeFalsy();
  });
});
