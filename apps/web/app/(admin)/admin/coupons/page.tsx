import Link from "next/link";
import { prisma, TENANT_ID } from "@/modules/shared";
import CouponForm from "@/components/admin/coupon/CouponForm";
import DeleteCouponButton from "./DeleteCouponButton";

export const revalidate = 0;

const TYPE_LABELS: Record<string, string> = {
  PERCENT: "% off",
  FIXED_CART: "$ off cart",
  FIXED_PRODUCT: "$ off product",
  FREE_SHIPPING: "Free shipping",
};

export default async function CouponsAdminPage() {
  const coupons = await prisma.coupon.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Coupons</h1>
        <Link
          href="/admin/coupons/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add Coupon
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Used</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No coupons yet — create one below or hit “Add Coupon”.
                </td>
              </tr>
            )}
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-mono font-medium text-zinc-900">{coupon.code}</td>
                <td className="px-4 py-3 text-zinc-600">{TYPE_LABELS[coupon.type] ?? coupon.type}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {coupon.type === "PERCENT" ? `${coupon.amount}%` : `$${coupon.amount.toFixed(2)}`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {coupon.usedCount}
                  {coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` : ""}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {coupon.endDate ? coupon.endDate.toLocaleDateString() : "Never"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      coupon.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/coupons/${coupon.id}`}
                    className="text-zinc-600 hover:text-zinc-900 hover:underline"
                  >
                    Edit
                  </Link>
                  <span className="ml-2">
                    <DeleteCouponButton id={coupon.id} code={coupon.code} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 max-w-xl">
        <CouponForm />
      </div>
    </div>
  );
}
