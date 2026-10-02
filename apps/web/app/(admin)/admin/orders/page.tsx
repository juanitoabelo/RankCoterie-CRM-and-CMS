/**
 * Admin Orders Page
 *
 * Server component — lists orders with searchParams-driven filters,
 * following the same pattern as the products admin page.
 */
import Link from "next/link";
import { getOrders } from "@/modules/ecommerce/queries";

export const revalidate = 0;

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "FAILED", label: "Failed" },
];

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All payments" },
  { value: "PENDING", label: "Pending" },
  { value: "AUTHORIZED", label: "Authorized" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { value: "CANCELLED", label: "Cancelled" },
];

function pageHref(params: Record<string, string>, page: number): string {
  const qs = new URLSearchParams({ ...params, page: String(page) });
  return `/admin/orders?${qs.toString()}`;
}

/** Reject unknown enum values from the URL instead of letting Prisma throw. */
function pickOption(value: string | undefined, options: { value: string }[]): string {
  if (!value) return "ALL";
  return options.some((opt) => opt.value === value) ? value : "ALL";
}

function statusBadge(value: string, kind: "order" | "payment"): string {
  const paid = value === "PAID" || value === "COMPLETED";
  const bad = value === "FAILED" || value === "CANCELLED" || value === "REFUNDED";
  const waiting = value === "PENDING" || value === "ON_HOLD" || value === "AUTHORIZED";
  if (paid) return kind === "payment" ? "bg-emerald-100 text-emerald-700" : "bg-emerald-100 text-emerald-700";
  if (bad) return "bg-red-100 text-red-700";
  if (waiting) return "bg-amber-100 text-amber-700";
  return "bg-zinc-100 text-zinc-600";
}

export default async function OrdersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const status = pickOption(sp.status, STATUS_OPTIONS);
  const payment = pickOption(sp.payment, PAYMENT_OPTIONS);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { items, total, totalPages } = await getOrders({
    search: q || undefined,
    status: status as never,
    paymentStatus: payment as never,
    page,
    pageSize: PAGE_SIZE,
  });

  const filterParams = { q, status, payment };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Admin / <span className="text-zinc-700">Orders</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Orders</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} order{total === 1 ? "" : "s"} found
          </p>
        </div>
        <Link
          href="/admin/products"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Back to products
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <label htmlFor="q" className="block text-xs font-medium text-zinc-500">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Order number or email"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-zinc-500">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="payment" className="block text-xs font-medium text-zinc-500">
            Payment
          </label>
          <select
            id="payment"
            name="payment"
            defaultValue={payment}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Filter
        </button>
      </form>

      {/* Orders table */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((order) => (
              <tr key={order.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="max-w-48 truncate px-4 py-3 text-zinc-600">
                  {order.guestEmail ?? order.customer?.email ?? order.user?.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </td>
                <td className="px-4 py-3 text-zinc-600">{order.paymentMethodTitle ?? order.paymentMethod ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                  ${order.total.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadge(order.status, "order")}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadge(order.paymentStatus, "payment")}`}>
                    {order.paymentStatus.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-zinc-600 hover:text-zinc-900 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-zinc-700">No orders found</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Orders placed through the storefront will appear here.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(filterParams, page - 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(filterParams, page + 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
