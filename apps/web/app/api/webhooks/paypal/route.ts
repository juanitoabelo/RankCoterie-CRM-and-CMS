/**
 * PayPal webhook — authoritative paid signal for storefront orders.
 *
 * Configure in PayPal Developer Dashboard → Webhooks:
 *   Event types: PAYMENT.CAPTURE.COMPLETED (and PAYMENT.SALE.COMPLETED)
 *   URL:         {SITE_URL}/api/webhooks/paypal
 * Then paste the webhook ID into Admin → Configure Payment Gateway → PayPal.
 */
import { prisma, TENANT_ID } from "@/modules/shared";
import { readPaypalConfig, verifyPaypalWebhookSignature } from "@/lib/billing/paypal";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/billing/payment-events";
import { recordGatewayTransaction } from "@/lib/billing/gateway-transactions";
import { verifyPaypalCaptureAmount } from "@/lib/billing/webhook-amounts";
import { claimWebhookEvent, logWebhookMismatch } from "@/lib/billing/webhook-events";
import { logStructured } from "@/lib/observability";
import { logAudit } from "@/lib/audit";

type PaypalResource = Record<string, unknown>;

async function findOrderForResource(resource: PaypalResource) {
  const customId = typeof resource.custom_id === "string" ? resource.custom_id : null;
  if (customId) {
    const order = await prisma.order.findFirst({
      where: { id: customId, tenantId: TENANT_ID },
      select: {
        id: true,
        total: true,
        currency: true,
        paymentGatewayId: true,
        paymentStatus: true,
      },
    });
    if (order) return order;
  }

  const related = (resource.supplementary_data as { related_ids?: { order_id?: string } } | undefined)
    ?.related_ids;
  const paypalOrderId = related?.order_id;
  if (paypalOrderId) {
    const metaOrder = await prisma.order.findFirst({
      where: { tenantId: TENANT_ID, meta: { path: ["paypalOrderId"], equals: paypalOrderId } },
      select: {
        id: true,
        total: true,
        currency: true,
        paymentGatewayId: true,
        paymentStatus: true,
      },
    });
    return metaOrder;
  }
  return null;
}

async function handleCaptureCompleted(resource: PaypalResource, eventId: string): Promise<void> {
  const order = await findOrderForResource(resource);
  if (!order) return;

  const check = verifyPaypalCaptureAmount(resource, order);
  if (!check.ok) {
    await logWebhookMismatch({
      gateway: "paypal",
      eventId,
      orderId: order.id,
      reason: check.reason,
      expected: { amount: order.total.toFixed(2), currency: order.currency },
      received: {
        amount: (resource.amount as Record<string, unknown> | undefined)?.value ?? null,
        currency: (resource.amount as Record<string, unknown> | undefined)?.currency_code ?? null,
      },
    });
    return;
  }
  if (!(await claimWebhookEvent(order.id, eventId))) return;

  const captureId = typeof resource.id === "string" ? resource.id : null;
  await recordGatewayTransaction({
    orderId: order.id,
    gatewayId: order.paymentGatewayId,
    amount: order.total,
    currency: order.currency,
    status: "PAID",
    gatewayTransactionId: captureId,
    gatewayResponse: { captureId, amount: resource.amount ?? null },
    eventId,
  });
  await markOrderPaid(order.id, "paypal-webhook");
}

async function handleCaptureFailed(resource: PaypalResource, eventType: string): Promise<void> {
  const order = await findOrderForResource(resource);
  if (!order) return;
  logStructured({
    level: "info",
    message: "webhook_payment_failed",
    context: { gateway: "paypal", orderId: order.id, eventType },
  });
  await markOrderPaymentFailed(order.id, "paypal-webhook", eventType);
}

export async function POST(req: Request) {
  const gateway = await prisma.paymentGateway.findFirst({
    where: { tenantId: TENANT_ID, type: "PAYPAL", isEnabled: true },
  });
  const cfg = gateway ? readPaypalConfig(gateway.config) : null;
  const webhookId =
    gateway ? String((gateway.config as Record<string, unknown>)?.webhookId ?? "").trim() : "";

  if (!cfg || !webhookId) {
    return new Response("PayPal webhook not configured", { status: 400 });
  }

  const raw = await req.text();
  const verified = await verifyPaypalWebhookSignature(cfg, webhookId, req.headers, raw);
  if (!verified) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    id?: string;
    event_type?: string;
    data?: { resource?: PaypalResource };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  try {
    const resource = event.data?.resource ?? {};
    const eventId = event.id ?? "";
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
      case "PAYMENT.SALE.COMPLETED":
        await handleCaptureCompleted(resource, eventId);
        break;
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED":
      case "CHECKOUT.PAYMENT-APPROVAL.REVERSED":
        await handleCaptureFailed(resource, event.event_type ?? "payment-failed");
        break;
      default:
        break;
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    logStructured({
      level: "error",
      message: "webhook_processing_failed",
      context: { gateway: "paypal", eventId: event.id ?? null, eventType: event.event_type ?? null, error, retryable: true },
    });
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Webhook",
      entityId: event.id ?? "unknown",
      reason: `PayPal ${event.event_type ?? "unknown"} processing failed (retryable)`,
      meta: { error, eventType: event.event_type ?? null },
    }).catch(() => {});
    return new Response("retry", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
