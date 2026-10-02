import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import { getSquareOrderState, readSquareConfig } from "@/lib/billing/square";
import { markOrderPaid } from "@/lib/billing/payment-events";

export const revalidate = 0;

/**
 * Square redirects the buyer here after hosted checkout:
 *   /checkout/square/return?reference={orderId}
 * We verify the linked Square order state and mark ours paid when completed.
 */
export default async function SquareReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  if (!reference) notFound();

  const order = await prisma.order.findFirst({
    where: { id: reference, tenantId: TENANT_ID },
  });
  if (!order) notFound();

  if (order.paymentStatus !== "PAID") {
    const meta = (order.meta ?? {}) as { squareOrderId?: string | null };
    const gateway = order.paymentGatewayId
      ? await prisma.paymentGateway.findUnique({ where: { id: order.paymentGatewayId } })
      : null;
    const config = gateway ? readSquareConfig(gateway.config) : null;

    const failedUi = (title: string, body: string) => (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-3 text-zinc-600">{body}</p>
        <Link
          href="/cart"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Back to cart
        </Link>
      </div>
    );

    if (!config || !meta.squareOrderId) {
      return failedUi(
        "Payment could not be verified",
        `Square is not configured for this store. Please contact support about order ${order.orderNumber}.`,
      );
    }

    const state = await getSquareOrderState(config, meta.squareOrderId);
    if (!state.ok || !state.paid) {
      return failedUi(
        "Payment not completed",
        state.ok
          ? `Square has not confirmed the payment for order ${order.orderNumber} (status: ${state.state}). No charge was recorded — you can retry from your cart.`
          : `Square could not verify order ${order.orderNumber} — ${state.error}.`,
      );
    }

    await markOrderPaid(order.id, "square-return");
  }

  redirect(`/checkout/success?orderId=${order.id}`);
}
