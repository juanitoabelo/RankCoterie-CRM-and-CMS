import Link from "next/link";
import { prisma } from "@/modules/shared";
import { clearCart, getCartBySession } from "@/modules/ecommerce/queries";
import { readExistingCartSession } from "@/lib/cart-session";

export const revalidate = 0;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; orderId?: string; awaiting?: string }>;
}) {
  const { listingId, orderId, awaiting } = await searchParams;

  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })
    : null;

  if (order) {
    // The order is placed — empty the browser's cart so the badge resets.
    const sessionId = await readExistingCartSession();
    if (sessionId) {
      const cart = await getCartBySession(sessionId);
      if (cart) await clearCart(cart.id).catch(() => {});
    }

    // awaiting=1 is set only by gateways that have not captured payment yet
    // (e.g. Square). Stripe returns here after a successful charge, PayPal
    // returns here after capture — both are confirmed.
    const awaitingPayment = awaiting === "1";
    const offlinePayment = order.paymentMethod === "MANUAL";
    const total = `$${order.total.toFixed(2)}`;

    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {awaitingPayment ? "Order received" : offlinePayment ? "Order placed" : "Payment confirmed"}
        </h1>
        <p className="mt-3 text-zinc-600">
          {awaitingPayment
            ? `Your order ${order.orderNumber} has been placed via ${order.paymentMethodTitle}. We'll be in touch to complete payment.`
            : offlinePayment
              ? `Your order ${order.orderNumber} has been placed. You'll pay via ${order.paymentMethodTitle} on delivery.`
              : `Payment confirmed for order ${order.orderNumber}.`}
        </p>

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
            <span className="text-zinc-500">Total</span>
            <span className="font-medium text-zinc-900">{total}</span>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-1">
                <span className="text-zinc-700">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-zinc-900">${item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const listing = listingId
    ? await prisma.listing.findUnique({ where: { id: listingId } })
    : null;

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
