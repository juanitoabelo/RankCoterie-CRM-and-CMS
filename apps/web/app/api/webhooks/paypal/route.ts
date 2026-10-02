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
import { findOrderByGatewayRef, markOrderPaid } from "@/lib/billing/payment-events";

async function handleCaptureCompleted(resource: Record<string, unknown>): Promise<void> {
  // Preferred: custom_id carries our order id (set at order creation).
  const customId = typeof resource.custom_id === "string" ? resource.custom_id : null;
  if (customId) {
    const order = await prisma.order.findFirst({
      where: { id: customId, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (order) {
      await markOrderPaid(order.id, "paypal-webhook");
      return;
    }
  }

  // Fallback: supplementary_data.related_ids.order_id is the PayPal order id,
  // which we store in order.meta.paypalOrderId.
  const related = (resource.supplementary_data as { related_ids?: { order_id?: string } } | undefined)
    ?.related_ids;
  const paypalOrderId = related?.order_id;
  if (paypalOrderId) {
    const order = await findOrderByGatewayRef("paypalOrderId", paypalOrderId);
    if (order) await markOrderPaid(order.id, "paypal-webhook");
  }
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

  let event: { event_type?: string; data?: { resource?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  try {
    const resource = event.data?.resource ?? {};
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
      case "PAYMENT.SALE.COMPLETED":
        await handleCaptureCompleted(resource);
        break;
      default:
        break; // acknowledged, no-op
    }
  } catch (e) {
    console.error(`[paypal-webhook] ${event.event_type} failed:`, e);
    // Non-2xx → PayPal retries: right for transient DB/network failures.
    return new Response("retry", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
