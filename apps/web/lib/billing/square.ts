/**
 * Square Online Checkout (payment links).
 *
 * Creates a hosted checkout for a fixed amount and verifies the result
 * via the linked Square Order state when the buyer returns.
 */

export type SquareConfig = {
  applicationId: string;
  accessToken: string;
  locationId: string;
};

const SQUARE_API = "https://connect.squareup.com";
const SQUARE_VERSION = "2024-12-18";

export function readSquareConfig(config: unknown): SquareConfig | null {
  const c = (config ?? {}) as Record<string, unknown>;
  const str = (key: string) =>
    typeof c[key] === "string" && (c[key] as string).trim().length > 0
      ? (c[key] as string).trim()
      : "";
  const applicationId = str("applicationId");
  const accessToken = str("accessToken");
  const locationId = str("locationId");
  if (!applicationId || !accessToken || !locationId) return null;
  return { applicationId, accessToken, locationId };
}

export function isSquareConfigured(config: unknown): boolean {
  return readSquareConfig(config) !== null;
}

async function squareFetch<T>(
  path: string,
  cfg: SquareConfig,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${SQUARE_API}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
        Authorization: `Bearer ${cfg.accessToken}`,
        ...(init?.headers ?? {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as {
      errors?: { detail?: string; code?: string; category?: string }[];
    };
    if (!res.ok) {
      const first = json.errors?.[0];
      const detail = first?.detail ?? first?.code ?? `Square error (HTTP ${res.status})`;
      return { ok: false, error: detail };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Square request failed." };
  }
}

export type SquarePaymentLinkResult = {
  ok: true;
  url: string;
  paymentLinkId: string;
  squareOrderId: string | null;
};

/** Create a hosted Square checkout for the order total. */
export async function createSquarePaymentLink(opts: {
  config: SquareConfig;
  amount: number;
  orderNumber: string;
  reference: string;
  redirectUrl: string;
}): Promise<SquarePaymentLinkResult | { ok: false; error: string }> {
  const res = await squareFetch<{
    payment_link?: { id?: string; url?: string; order_id?: string };
  }>("/v2/online-checkout/payment-links", opts.config, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${opts.reference}-${Date.now()}`,
      quick_pay: {
        name: `Order ${opts.orderNumber}`,
        priceMoney: {
          amount: Math.round(opts.amount * 100),
          currency: "USD",
        },
        locationId: opts.config.locationId,
      },
      checkout_options: {
        redirectURL: opts.redirectUrl,
      },
      payment_note: `Order ${opts.orderNumber}`,
    }),
  });

  if (!res.ok) return { ok: false, error: res.error };
  const link = res.data.payment_link;
  if (!link?.url) return { ok: false, error: "Square did not return a checkout URL." };

  return {
    ok: true,
    url: link.url,
    paymentLinkId: link.id ?? "",
    squareOrderId: link.order_id ?? null,
  };
}

/**
 * Check the state of the Square order backing the payment link.
 * A paid checkout moves the order to COMPLETED.
 */
export async function getSquareOrderState(
  config: SquareConfig,
  squareOrderId: string,
): Promise<{ ok: true; state: string; paid: boolean } | { ok: false; error: string }> {
  const res = await squareFetch<{ order?: { state?: string } }>(
    `/v2/orders/${squareOrderId}`,
    config,
    { method: "GET" },
  );
  if (!res.ok) return { ok: false, error: res.error };
  const state = res.data.order?.state ?? "OPEN";
  return { ok: true, state, paid: state === "COMPLETED" };
}

/**
 * Full refund of the completed payment attached to a Square order.
 * Returns the Square refund id on success.
 */
export async function refundSquareOrder(
  config: SquareConfig,
  squareOrderId: string,
  amountCents: number,
): Promise<{ ok: true; refundId: string } | { ok: false; error: string }> {
  const payments = await squareFetch<{
    payments?: { id?: string; status?: string }[];
  }>(`/v2/payments?order_id=${encodeURIComponent(squareOrderId)}`, config, { method: "GET" });
  if (!payments.ok) return { ok: false, error: payments.error };
  const payment =
    payments.data.payments?.find((p) => p.status === "COMPLETED") ?? payments.data.payments?.[0];
  if (!payment?.id) return { ok: false, error: "No Square payment found for this order." };

  const refund = await squareFetch<{ refund?: { id?: string } }>("/v2/refunds", config, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `refund-${payment.id}-${Date.now()}`,
      payment_id: payment.id,
      amount_money: { amount: amountCents, currency: "USD" },
    }),
  });
  if (!refund.ok) return { ok: false, error: refund.error };
  return { ok: true, refundId: refund.data.refund?.id ?? "" };
}
