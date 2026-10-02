/**
 * Configure Payment Gateway — list, create and delete payment gateways.
 */
import Link from "next/link";
import { getPaymentGateways } from "@/modules/ecommerce/queries";
import { deletePaymentGateway } from "@/app/(admin)/admin/payment-gateways/actions";
import { EntityDeleteButton } from "@/components/admin/product/TaxonomyForms";
import GatewayCreateForm from "@/components/admin/product/GatewayCreateForm";

export const revalidate = 0;

export default async function PaymentGatewayConfigPage() {
  const gateways = await getPaymentGateways();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          Admin /{" "}
          <Link href="/admin/products" className="text-zinc-700 hover:underline">
            Products
          </Link>{" "}
          / <span className="text-zinc-700">Payment Gateway</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Payment Gateway</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {gateways.length} gateway{gateways.length === 1 ? "" : "s"} configured
        </p>
        <nav className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href="/admin/products" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Products
          </Link>
          <Link href="/admin/products/categories" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Categories
          </Link>
          <Link href="/admin/products/tags" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Tags
          </Link>
          <Link href="/admin/products/attributes" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Attributes
          </Link>
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {gateways.map((gw) => (
                <tr key={gw.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{gw.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
                      {gw.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        gw.isEnabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {gw.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/payment-gateways/${gw.id}`}
                      className="mr-3 text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
                    >
                      Edit
                    </Link>
                    <EntityDeleteButton
                      id={gw.id}
                      name={gw.name}
                      action={deletePaymentGateway}
                    />
                  </td>
                </tr>
              ))}
              {gateways.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No payment gateways yet — add your first one on the right.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <GatewayCreateForm />
      </div>
    </div>
  );
}