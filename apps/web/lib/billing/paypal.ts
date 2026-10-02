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
