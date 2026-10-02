import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/modules/ecommerce/queries";
import OrderStatusForm from "@/components/admin/order/OrderStatusForm";

export const revalidate = 0;

export default async function OrderDetailAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const customerEmail = order.guestEmail ?? order.customer?.email ?? order.user?.email ?? "—";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            <Link href="/admin/orders" className="hover:text-zinc-900 hover:underline">
              Orders
            </Link>{" "}
            / <span className="text-zinc-700">{order.orderNumber}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Placed {new Date(order.createdAt).toLocaleString()} · {itemCount} item
            {itemCount === 1 ? "" : "s"} · ${order.total.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
            {order.status.replace(/_/g, " ")}
          </span>
          <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
            Payment: {order.paymentStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Items */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.product.images[0] ? (
                          <img
                            src={`/api/assets/${item.product.images[0].assetId}`}
                            alt=""
                            className="h-8 w-8 rounded border border-zinc-200 bg-zinc-100 object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded border border-dashed border-zinc-300 bg-zinc-50" />
                        )}
                        <div>
                          <p className="font-medium text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500">{item.product.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{item.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-zinc-900">
                      ${item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-zinc-500">
                    Subtotal
                  </td>
                  <td colSpan={2} className="px-4 py-2 text-right tabular-nums text-zinc-700">
                    ${order.subtotal.toFixed(2)}
                  </td>
                </tr>
                {order.taxTotal > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-zinc-500">
                      Tax
                    </td>
                    <td colSpan={2} className="px-4 py-2 text-right tabular-nums text-zinc-700">
                      ${order.taxTotal.toFixed(2)}
                    </td>
                  </tr>
                )}
                {order.shippingTotal > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-zinc-500">
                      Shipping
                    </td>
                    <td colSpan={2} className="px-4 py-2 text-right tabular-nums text-zinc-700">
                      ${order.shippingTotal.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr className="font-semibold text-zinc-900">
                  <td colSpan={3} className="px-4 py-2">
                    Total
                  </td>
                  <td colSpan={2} className="px-4 py-2 text-right tabular-nums">
                    ${order.total.toFixed(2)} {order.currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Status controls */}
          <OrderStatusForm
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
          />
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Customer
            </h2>
            <p className="mt-3 break-all text-sm text-zinc-900">{customerEmail}</p>
            {order.customer && (
              <p className="mt-1 text-sm text-zinc-500">
                {[order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || "—"}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Payment
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Method</dt>
                <dd className="text-right text-zinc-900">
                  {order.paymentMethodTitle ?? order.paymentMethod ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Status</dt>
                <dd className="text-right text-zinc-900">
                  {order.paymentStatus.replace(/_/g, " ")}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Paid at</dt>
                <dd className="text-right text-zinc-900">
                  {order.paidAt ? new Date(order.paidAt).toLocaleString() : "—"}
                </dd>
              </div>
              {order.transactionId && (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Transaction</dt>
                  <dd className="break-all text-right text-zinc-900">{order.transactionId}</dd>
                </div>
              )}
            </dl>
          </div>

          {order.notes && order.notes.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Notes
              </h2>
              <ul className="mt-3 space-y-3">
                {order.notes.map((note) => (
                  <li key={note.id} className="text-sm text-zinc-700">
                    {note.content}
                    <span className="block text-xs text-zinc-400">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
