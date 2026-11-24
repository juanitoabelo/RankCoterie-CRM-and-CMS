import { logStructured } from "../observability";

function clean(value: string | null | undefined, max = 64): string | undefined {
  const trimmed = String(value ?? "").trim().slice(0, max);
  return trimmed || undefined;
}

export function logCartAddFailure(input: {
  productId?: string | null;
  reason?: string | null;
}): void {
  logStructured({
    level: "warn",
    message: "cart_add_failed",
    context: {
      productId: clean(input.productId),
      reason: clean(input.reason),
    },
  });
}

export function logOrderCreated(input: {
  orderId: string;
  gatewayType?: string | null;
  itemCount?: number;
  total?: number;
}): void {
  logStructured({
    level: "info",
    message: "order_created",
    context: {
      orderId: clean(input.orderId),
      gatewayType: clean(input.gatewayType),
      itemCount: input.itemCount,
      total: input.total,
    },
  });
}

export function logPaymentStatus(input: {
  orderId: string;
  status: string;
  gatewayType?: string | null;
}): void {
  logStructured({
    level: "info",
    message: "payment_status_changed",
    context: {
      orderId: clean(input.orderId),
      status: clean(input.status),
      gatewayType: clean(input.gatewayType),
    },
  });
}

export function logQuoteMismatch(input: {
  orderId?: string | null;
  expectedTotal?: number | null;
  receivedTotal?: number | null;
  gatewayType?: string | null;
}): void {
  logStructured({
    level: "warn",
    message: "quote_amount_mismatch",
    context: {
      orderId: clean(input.orderId),
      expectedTotal: input.expectedTotal,
      receivedTotal: input.receivedTotal,
      gatewayType: clean(input.gatewayType),
      difference:
        input.expectedTotal != null && input.receivedTotal != null
          ? Math.abs(input.expectedTotal - input.receivedTotal)
          : undefined,
    },
  });
}

export function logDownloadGrants(input: {
  orderId: string;
  count: number;
}): void {
  logStructured({
    level: "info",
    message: "download_grants_issued",
    context: { orderId: clean(input.orderId), count: input.count },
  });
}
