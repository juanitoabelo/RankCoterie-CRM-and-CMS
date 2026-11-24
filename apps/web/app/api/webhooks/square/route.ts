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
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/billing/payment-events";
import { recordGatewayTransaction } from "@/lib/billing/gateway-transactions";
import { verifySquarePaymentAmount } from "@/lib/billing/webhook-amounts";
import { claimWebhookEvent, logWebhookMismatch } from "@/lib/billing/webhook-events";
import { logStructured } from "@/lib/observability";
import { logAudit } from "@/lib/audit";

type SquareObject = Record<string, unknown>;

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

function moneyFromEvent(payment: SquareObject | undefined, orderObj: SquareObject | undefined) {
  if (payment?.amount_money || payment?.total_money) return payment;
  if (orderObj?.total_money) return orderObj;
  return null;
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

  let event: { id?: string; type?: string; data?: { object?: { payment?: SquareObject; order?: SquareObject } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  try {
    const type = event.type ?? "";
    if (!type.startsWith("payment.") && !type.startsWith("order.")) {
      return new Response("ok", { status: 200 });
    }

    const payment = event.data?.object?.payment;
    const orderObj = event.data?.object?.order;
    const squareOrderId =
      (typeof payment?.order_id === "string" ? payment.order_id : null) ??
      (typeof orderObj?.id === "string" ? orderObj.id : null);
    if (!squareOrderId) return new Response("ok", { status: 200 });

    const local = await prisma.order.findFirst({
      where: { tenantId: TENANT_ID, meta: { path: ["squareOrderId"], equals: squareOrderId } },
      select: {
        id: true,
        total: true,
        currency: true,
        paymentGatewayId: true,
        paymentStatus: true,
      },
    });
    if (!local || local.paymentStatus === "PAID") return new Response("ok", { status: 200 });

    const state = await getSquareOrderState(cfg, squareOrderId);
    if (!state.ok) {
      logStructured({
        level: "error",
        message: "webhook_gateway_lookup_failed",
        context: { gateway: "square", orderId: local.id, error: state.error },
      });
      return new Response("retry", { status: 500 });
    }
    if (state.state === "CANCELED") {
      logStructured({
        level: "info",
        message: "webhook_payment_failed",
        context: { gateway: "square", orderId: local.id, eventType: type },
      });
      await markOrderPaymentFailed(local.id, "square-webhook", type);
      return new Response("ok", { status: 200 });
    }
    if (!state.paid) return new Response("ok", { status: 200 });

    const eventMoney = moneyFromEvent(payment, orderObj);
    const check = verifySquarePaymentAmount(
      eventMoney ?? { total_money: { amount: state.amount, currency: state.currency } },
      local,
    );
    if (!check.ok) {
      await logWebhookMismatch({
        gateway: "square",
        eventId: event.id ?? type,
        orderId: local.id,
        reason: check.reason,
        expected: { amount: Math.round(local.total * 100), currency: local.currency },
        received: {
          amount: eventMoney ? (eventMoney.amount_money ?? eventMoney.total_money) : state.amount ?? null,
          currency:
            eventMoney && typeof (eventMoney.amount_money ?? eventMoney.total_money) === "object"
              ? ((eventMoney.amount_money ?? eventMoney.total_money) as Record<string, unknown>).currency ?? null
              : state.currency ?? null,
        },
      });
      return new Response("ok", { status: 200 });
    }

    const eventId = event.id ?? `${type}:${squareOrderId}`;
    if (!(await claimWebhookEvent(local.id, eventId))) return new Response("ok", { status: 200 });
    await recordGatewayTransaction({
      orderId: local.id,
      gatewayId: local.paymentGatewayId,
      amount: local.total,
      currency: local.currency,
      status: "PAID",
      gatewayTransactionId: squareOrderId,
      gatewayResponse: { state: state.state, amount: state.amount, currency: state.currency },
      eventId,
    });
    await markOrderPaid(local.id, "square-webhook");
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    logStructured({
      level: "error",
      message: "webhook_processing_failed",
      context: { gateway: "square", eventId: event.id ?? null, eventType: event.type ?? null, error, retryable: true },
    });
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Webhook",
      entityId: event.id ?? "unknown",
      reason: `Square ${event.type ?? "unknown"} processing failed (retryable)`,
      meta: { error, eventType: event.type ?? null },
    }).catch(() => {});
    return new Response("retry", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
