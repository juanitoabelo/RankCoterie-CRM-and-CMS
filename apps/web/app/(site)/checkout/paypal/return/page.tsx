import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import { capturePaypalOrder, readPaypalConfig } from "@/lib/billing/paypal";
import { markOrderPaid } from "@/lib/billing/payment-events";

export const revalidate = 0;

/**
 * PayPal redirects the buyer here after approval:
 *   /checkout/paypal/return?token=EC-…&PayerID=…
 * We look up our order by the stored PayPal order id, capture the payment,
 * mark the order paid, then forward to the normal success page.
 */
export default async function PaypalReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; PayerID?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();

  const order = await prisma.order.findFirst({
    where: {
      tenantId: TENANT_ID,
      meta: { path: ["paypalOrderId"], equals: token },
    },
  });
  if (!order) notFound();

  if (order.paymentStatus !== "PAID") {
    const gateway = order.paymentGatewayId
      ? await prisma.paymentGateway.findUnique({ where: { id: order.paymentGatewayId } })
      : null;
    const config = gateway ? readPaypalConfig(gateway.config) : null;

    if (!config) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Payment could not be verified</h1>
          <p className="mt-3 text-zinc-600">
            PayPal is not configured for this store. Please contact support about order{" "}
            {order.orderNumber}.
          </p>
          <Link href="/cart" className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
            Back to cart
          </Link>
        </div>
      );
    }

    const capture = await capturePaypalOrder(config, token);
    if (!capture.ok) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Payment not completed</h1>
          <p className="mt-3 text-zinc-600">
            PayPal did not confirm the payment for order {order.orderNumber}
            {capture.error ? ` — ${capture.error}` : "."} No charge was made.
          </p>
          <Link href="/cart" className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
            Back to cart
          </Link>
        </div>
      );
    }

    await markOrderPaid(order.id, "paypal-return");
  }

  redirect(`/checkout/success?orderId=${order.id}`);
}
