/**
 * Admin Reports Page
 * 
 * Uses the Dashboard module for report data.
 */
import Link from "next/link";
import { getReportData } from "@/modules/dashboard";
import { INVOICE_STATUS_BADGE } from "@/modules/billing";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Reports | Admin" };

export default async function AdminReportsPage() {
  const report = await getReportData();

  const exportsList = [
    { kind: "leads", label: "Leads" },
    { kind: "clients", label: "Clients" },
    { kind: "invoices", label: "Invoices" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Reports & exports</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Approved revenue</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">${report.approvedRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Clients</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">{report.clientCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Live listings</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">{report.liveListings}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Open to-dos</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">{report.openTodos}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Leads by status</h2>
          <table className="mt-3 w-full text-left text-sm">
            <tbody className="divide-y divide-zinc-100">
              {report.leadCounts.map((row) => (
                <tr key={row.status}>
                  <td className="py-2 text-zinc-600">{row.status}</td>
                  <td className="py-2 text-right font-medium text-zinc-900">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Invoices by status</h2>
          <table className="mt-3 w-full text-left text-sm">
            <tbody className="divide-y divide-zinc-100">
              {report.invoiceCounts.map((row) => (
                <tr key={row.status}>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_BADGE[row.status as keyof typeof INVOICE_STATUS_BADGE] ?? "bg-zinc-100 text-zinc-500"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2 text-right font-medium text-zinc-900">{row.count}</td>
                  <td className="py-2 text-right text-zinc-500">
                    ${row.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Exports</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {exportsList.map((e) => (
            <Link
              key={e.kind}
              href={`/api/admin/exports?kind=${e.kind}`}
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
            >
              Export {e.label} (CSV)
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
