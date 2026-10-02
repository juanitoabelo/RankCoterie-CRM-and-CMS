import Link from "next/link";
import { prisma, TENANT_ID } from "@/modules/shared";
import TaxRateForm from "@/components/admin/tax/TaxRateForm";
import DeleteTaxRateButton from "./DeleteTaxRateButton";

export const revalidate = 0;

export default async function TaxAdminPage() {
  const rates = await prisma.taxRate.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ priority: "desc" }, { country: "asc" }, { state: "asc" }],
  });

  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Tax Rates</h1>
        <Link
          href="/admin/tax/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add Tax Rate
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-left">State</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Priority</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No tax rates configured — checkout tax stays $0.00.
                </td>
              </tr>
            )}
            {rates.map((rate) => (
              <tr key={rate.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-zinc-900">{rate.name ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-zinc-700">{rate.country}</td>
                <td className="px-4 py-3 text-zinc-600">{rate.state ?? "*"}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{rate.rate}%</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-500">{rate.priority}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/tax/${rate.id}`}
                    className="text-zinc-600 hover:text-zinc-900 hover:underline"
                  >
                    Edit
                  </Link>
                  <span className="ml-2">
                    <DeleteTaxRateButton id={rate.id} label={`${rate.country} ${rate.rate}%`} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 max-w-xl">
        <TaxRateForm />
      </div>
    </div>
  );
}
