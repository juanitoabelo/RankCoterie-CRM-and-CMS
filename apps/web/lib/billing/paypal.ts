/**
 * PayPal Orders v2 REST integration — server-side only.
 *
 * Credentials come from the gateway configured in
 * Admin → Products → Configure Payment Gateway (config: clientId, clientSecret, sandbox).
 */

export type PaypalConfig = {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
};

export function readPaypalConfig(config: unknown): PaypalConfig | null {
  const c = (config ?? {}) as Record<string, unknown>;
  const clientId = typeof c.clientId === "string" ? c.clientId.trim() : "";
  const clientSecret = typeof c.clientSecret === "string" ? c.clientSecret.trim() : "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, sandbox: c.sandbox === true };
}

export function isPaypalConfigured(config: unknown): boolean {
  return readPaypalConfig(config) !== null;
}

function apiBase(sandbox: boolean): string {
  return sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

async function getAccessToken(cfg: PaypalConfig): Promise<string> {
  const res = await fetch(`${apiBase(cfg.sandbox)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PayPal authentication failed (${res.status}). Check your client ID and secret.`);
  }
  const json = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!json?.access_token) throw new Error("PayPal authentication failed.");
  return json.access_token;
}

/** Create a PayPal order and return its id + buyer approval link. */
export async function createPaypalOrder(params: {
  config: PaypalConfig;
  amount: string;
  currency?: string;
  description: string;
  referenceId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ paypalOrderId: string; approveUrl: string }> {
  const token = await getAccessToken(params.config);
  const res = await fetch(`${apiBase(params.config.sandbox)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.referenceId,
          custom_id: params.referenceId,
          description: params.description,
          amount: {
            currency_code: params.currency ?? "USD",
            value: params.amount,
          },
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | {
        id?: string;
        links?: { rel?: string; href?: string }[];
        details?: { message?: string }[];
      }
    | null;

  if (!res.ok || !json?.id) {
    throw new Error(
      json?.details?.[0]?.message ?? `PayPal order creation failed (${res.status}).`,
    );
  }
  const approveUrl = json.links?.find((l) => l.rel === "approve")?.href;
  if (!approveUrl) throw new Error("PayPal did not return an approval link.");
  return { paypalOrderId: json.id, approveUrl };
}

/** Capture a buyer-approved PayPal order. */
export async function capturePaypalOrder(
  config: PaypalConfig,
  paypalOrderId: string,
): Promise<{ ok: boolean; status: string; error?: string }> {
  try {
    const token = await getAccessToken(config);
    const res = await fetch(
      `${apiBase(config.sandbox)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
      },
    );
    const json = (await res.json().catch(() => null)) as
      | { status?: string; details?: { message?: string }[] }
      | null;
    const status = json?.status ?? "FAILED";
    if (res.ok && status === "COMPLETED") return { ok: true, status };
    return {
      ok: false,
      status,
      error:
        json?.details?.[0]?.message ??
        `PayPal capture failed (${res.status}, status: ${status}).`,
    };
  } catch (e) {
    return { ok: false, status: "FAILED", error: e instanceof Error ? e.message : "PayPal capture failed." };
  }
}

/**
 * Verify a PayPal webhook transmission using the Verify Webhook Signature API.
 * Headers are the `paypal-*` request headers; body is the raw request payload.
 * Requires `webhookId` from the PayPal developer dashboard (Webhooks section).
 */
export async function verifyPaypalWebhookSignature(
  cfg: PaypalConfig,
  webhookId: string,
  headers: { get(name: string): string | null },
  rawBody: string,
): Promise<boolean> {
  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }
  try {
    const token = await getAccessToken(cfg);
    const res = await fetch(`${apiBase(cfg.sandbox)}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { verification_status?: string } | null;
    return json?.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}

/** Full refund of the captured payment for a PayPal order. */
export async function refundPaypalOrder(
  cfg: PaypalConfig,
  paypalOrderId: string,
  amountCents?: number,
): Promise<{ ok: true; refundId: string } | { ok: false; error: string }> {
  try {
    const token = await getAccessToken(cfg);
    const getRes = await fetch(
      `${apiBase(cfg.sandbox)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    const order = (await getRes.json().catch(() => null)) as
      | {
          purchase_units?: {
            payments?: {
              captures?: { id?: string; status?: string }[];
            };
          }[];
          details?: { message?: string }[];
        }
      | null;
    if (!getRes.ok || !order) {
      throw new Error(order?.details?.[0]?.message ?? `PayPal order lookup failed (${getRes.status}).`);
    }
    const captures = order.purchase_units?.[0]?.payments?.captures ?? [];
    const capture = captures.find((c) => c.status === "COMPLETED") ?? captures[0];
    if (!capture?.id) return { ok: false, error: "No completed PayPal capture found for this order." };

    const refRes = await fetch(
      `${apiBase(cfg.sandbox)}/v2/payments/captures/${encodeURIComponent(capture.id)}/refund`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          amountCents !== undefined
            ? { amount: { value: (amountCents / 100).toFixed(2), currency_code: "USD" } }
            : {},
        ),
        cache: "no-store",
      },
    );
    const json = (await refRes.json().catch(() => null)) as
      | { id?: string; status?: string; details?: { message?: string }[] }
      | null;
    if (!refRes.ok || !json?.id) {
      return {
        ok: false,
        error: json?.details?.[0]?.message ?? `PayPal refund failed (${refRes.status}).`,
      };
    }
    return { ok: true, refundId: json.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "PayPal refund failed." };
  }
}
