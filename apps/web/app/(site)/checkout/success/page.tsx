import Link from "next/link";
import ConversionTracker from "@/components/analytics/ConversionTracker";
import DownloadGrants from "@/components/storefront/DownloadGrants";
import { toDownloadGrantView } from "@/lib/checkout/customer-access";
import { prisma, TENANT_ID } from "@/modules/shared";
import { clearCart, getCartBySession } from "@/modules/ecommerce/queries";
import { readExistingCartSession } from "@/lib/cart-session";
import {
  orderAccessTokenMatchesOrder,
  verifyOrderAccessToken,
} from "@/lib/checkout/order-access";

export const revalidate = 0;

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function paymentCopy(order: {
  paymentStatus: string;
  paymentMethod: string | null;
  paymentMethodTitle: string | null;
  orderNumber: string;
}): { title: string; body: string } {
  if (order.paymentStatus === "PAID") {
    return {
      title: "Payment confirmed",
      body: `Payment confirmed for order ${order.orderNumber}.`,
    };
  }
  if (order.paymentStatus === "AUTHORIZED" || order.paymentMethod === "MANUAL") {
    return {
      title: "Awaiting manual payment",
      body: `Your order ${order.orderNumber} is on hold, awaiting manual payment via ${order.paymentMethodTitle ?? "your selected payment method"}. We'll confirm once payment is received.`,
    };
  }
  if (order.paymentStatus === "PENDING") {
    return {
      title: "Payment pending",
      body: `Your order ${order.orderNumber} has been placed. We're waiting for ${order.paymentMethodTitle ?? "your payment provider"} to confirm payment.`,
    };
  }
  if (order.paymentStatus === "REFUNDED" || order.paymentStatus === "PARTIALLY_REFUNDED") {
    return {
      title: "Payment refunded",
      body: `Order ${order.orderNumber} has been refunded. Contact us if you expected a different status.`,
    };
  }
  return {
    title: "Payment not completed",
    body: `Order ${order.orderNumber} was not paid. Contact us if you believe this is a mistake.`,
  };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; orderId?: string; access?: string }>;
}) {
  const { listingId, orderId, access } = await searchParams;

  const payload = orderId
    ? await verifyOrderAccessToken(access, { orderId, tenantId: TENANT_ID })
    : null;
  const order =
    payload && orderId
      ? await prisma.order.findFirst({
          where: { id: orderId, tenantId: TENANT_ID },
          include: { items: true },
        })
      : null;
  const sessionId = await readExistingCartSession().catch(() => null);
  const authorized =
    order && payload && orderAccessTokenMatchesOrder(payload, order, sessionId);

  if (order && authorized) {
    const cart = sessionId ? await getCartBySession(sessionId).catch(() => null) : null;
    if (cart) await clearCart(cart.id).catch(() => {});

    const copy = paymentCopy(order);
    const grants = order.paymentStatus === "PAID"
      ? await prisma.digitalDownloadGrant.findMany({
          where: { tenantId: TENANT_ID, orderId: order.id },
          orderBy: { createdAt: "asc" },
        })
      : [];
    return (
      <div className="mx-auto max-w-lg text-center">
        <ConversionTracker
          eventType="checkout_success"
          metadata={{
            orderId: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            paymentStatus: order.paymentStatus,
          }}
        />
        <h1 className="text-2xl font-semibold text-zinc-900">{copy.title}</h1>
        <p className="mt-3 text-zinc-600">{copy.body}</p>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Order number</span>
            <span className="font-medium text-zinc-900">{order.orderNumber}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-zinc-500">Payment method</span>
            <span className="font-medium text-zinc-900">{order.paymentMethodTitle}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-zinc-500">Payment status</span>
            <span className="font-medium text-zinc-900">{order.paymentStatus.toLowerCase()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-zinc-500">Total</span>
            <span className="font-medium text-zinc-900">{money(order.total, order.currency)}</span>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-1">
                <span className="text-zinc-700">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-zinc-900">{money(item.lineTotal, order.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        {grants.length > 0 ? (
          <DownloadGrants
            orderId={order.id}
            access={access ?? ""}
            grants={grants.map((grant) => toDownloadGrantView(grant))}
          />
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Back to home
          </Link>
          {access && orderId ? (
            <Link
              href={`/orders/access?orderId=${encodeURIComponent(orderId)}&access=${encodeURIComponent(access)}`}
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              View order later
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (listingId) {
    const listing = orderId
      ? null
      : await prisma.listing.findUnique({ where: { id: listingId } }).catch(() => null);
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Application received</h1>
        <p className="mt-3 text-zinc-600">
          {listing
            ? `Payment confirmed for “${listing.title}”. Our team will review your listing and publish it once approved.`
            : "Payment confirmed. Our team will review your listing and publish it once approved."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Checkout link unavailable</h1>
      <p className="mt-3 text-zinc-600">
        We could not verify this checkout link. If you completed an order, use the confirmation link
        from your email or contact support. Your cart was left unchanged.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Back to home
      </Link>
    </div>
  );
}
