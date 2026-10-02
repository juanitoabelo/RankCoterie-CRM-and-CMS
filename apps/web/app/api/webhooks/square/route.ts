/**
 * Square webhook — authoritative paid signal for storefront orders.
 *
 * Configure in Square Developer Dashboard → Webhooks:
 *   URL:         {SITE_URL}/api/webhooks/square
 *   Event types: payment.updated, payment.created, order.updated
 * Then paste the signature key into Admin → Configure Payment Gateway → Square.
 *
 * Signature: base64(HMAC-SHA256(notification_url + raw_body, signature_key))
 * compared against the x-square-hmacsha256-signature header.
 */
import crypto from "crypto";
import { prisma, TENANT_ID } from "@/modules/shared";
import { getSquareOrderState, readSquareConfig } from "@/lib/billing/square";
import { findOrderByGatewayRef, markOrderPaid } from "@/lib/billing/payment-events";

function webhookUrl(): string {
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/api/webhooks/square`;
}

function signatureValid(signatureKey: string, header: string | null, rawBody: string): boolean {
  if (!header) return false;
  const expected = crypto
    .createHmac("sha256", signatureKey)
    .update(webhookUrl() + rawBody)
    .digest("base64");
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const gateway = await prisma.paymentGateway.findFirst({
    where: { tenantId: TENANT_ID, type: "SQUARE", isEnabled: true },
  });
  const cfg = gateway ? readSquareConfig(gateway.config) : null;
  const signatureKey = gateway
    ? String((gateway.config as Record<string, unknown>)?.signatureKey ?? "").trim()
    : "";

  if (!cfg || !signatureKey) {
    return new Response("Square webhook not configured", { status: 400 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature");
  if (!signatureValid(signatureKey, signature, raw)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    type?: string;
    data?: { object?: { payment?: Record<string, unknown>; order?: Record<string, unknown> } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  try {
    const type = event.type ?? "";
    if (!type.startsWith("payment.") && !type.startsWith("order.")) {
      return new Response("ok", { status: 200 }); // acknowledged, no-op
    }

    const payment = event.data?.object?.payment;
    const orderObj = event.data?.object?.order;
    const squareOrderId =
      (typeof payment?.order_id === "string" ? payment.order_id : null) ??
      (typeof orderObj?.id === "string" ? orderObj.id : null);
    if (!squareOrderId) return new Response("ok", { status: 200 });

    const local = await findOrderByGatewayRef("squareOrderId", squareOrderId);
    if (!local || local.paymentStatus === "PAID") return new Response("ok", { status: 200 });

    // The event tells us something changed — confirm the real state with Square.
    const state = await getSquareOrderState(cfg, squareOrderId);
    if (state.ok && state.paid) {
      await markOrderPaid(local.id, "square-webhook");
    }
  } catch (e) {
    console.error(`[square-webhook] ${event.type} failed:`, e);
    return new Response("retry", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
