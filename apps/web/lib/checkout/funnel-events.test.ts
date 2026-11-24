import { beforeEach, describe, expect, it, vi } from "vitest";

const { logStructured } = vi.hoisted(() => ({ logStructured: vi.fn() }));

vi.mock("../observability", () => ({ logStructured }));

import {
  logCartAddFailure,
  logDownloadGrants,
  logOrderCreated,
  logPaymentStatus,
  logQuoteMismatch,
} from "./funnel-events";

describe("checkout funnel events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs add-to-cart failures without customer data", () => {
    logCartAddFailure({ productId: "p1", reason: "OUT_OF_STOCK" });
    expect(logStructured).toHaveBeenCalledWith({
      level: "warn",
      message: "cart_add_failed",
      context: { productId: "p1", reason: "OUT_OF_STOCK" },
    });
  });

  it("logs order, payment, quote and download milestones", () => {
    logOrderCreated({ orderId: "o1", gatewayType: "STRIPE", itemCount: 2, total: 99 });
    logPaymentStatus({ orderId: "o1", status: "PAID" });
    logQuoteMismatch({ orderId: "o1", expectedTotal: 99, receivedTotal: 98 });
    logDownloadGrants({ orderId: "o1", count: 2 });
    expect(logStructured).toHaveBeenCalledTimes(4);
    expect(logStructured.mock.calls[0][0].message).toBe("order_created");
    expect(logStructured.mock.calls[1][0].message).toBe("payment_status_changed");
    expect(logStructured.mock.calls[2][0].message).toBe("quote_amount_mismatch");
    expect(logStructured.mock.calls[3][0].message).toBe("download_grants_issued");
    const serialized = JSON.stringify(logStructured.mock.calls.map((call) => call[0]));
    expect(serialized).not.toContain("@");
  });
});
