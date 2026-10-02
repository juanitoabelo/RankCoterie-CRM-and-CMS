import Link from "next/link";
import { prisma, TENANT_ID } from "@/modules/shared";
import type { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { restoreStockForOrder } from "@/lib/billing/stock";

export const revalidate = 0;

/**
 * Payment abandoned / cancelled at the gateway.
 *
 * With ?orderId=… the pending order is cancelled and its reserved stock
 * released, then the buyer is offered a way back to the cart.
 */
export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  let cancelledOrderNumber: string | null = null;
  let backHref = "/cart";
  let backLabel = "Back to cart";

  if (orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId: TENANT_ID,
        status: "PENDING",
        paymentStatus: "PENDING",
      },
    });
    if (order) {
      cancelledOrderNumber = order.orderNumber;
      const meta = (order.meta ?? {}) as Record<string, unknown>;
      await restoreStockForOrder(order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
          cancelledAt: new Date(),
          meta: { ...meta, cancelledReason: "payment-abandoned" } as Prisma.InputJsonValue,
        },
      });
      await logAudit({
        action: "ORDER_UPDATE",
        entity: "Order",
        entityId: order.id,
        reason: "Payment abandoned — order cancelled and stock released",
        meta: { orderNumber: order.orderNumber, source: "checkout-cancel" },
      });
    }
  } else {
    backHref = "/apply";
    backLabel = "Back to apply";
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Payment cancelled</h1>
      <p className="mt-3 text-zinc-600">
        {cancelledOrderNumber
          ? `No charge was made for order ${cancelledOrderNumber}. It has been cancelled and any reserved stock released.`
          : "No charge was made. You can come back any time to finish your application."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href={backHref}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {backLabel}
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-400"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
