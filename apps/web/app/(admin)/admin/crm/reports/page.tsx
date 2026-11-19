import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { getCrmReports } from "@/modules/crm/queries";
import { getCrmSettings } from "@/modules/crm/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Reports | Admin" };

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${((part / whole) * 100).toFixed(0)}%`;
}

export default async function CrmReportsPage() {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const [reports, settings] = await Promise.all([getCrmReports(access), getCrmSettings()]);
  const currency = settings.defaultCurrency;
  const openStages = reports.stages.filter((stage) => !stage.isWon && !stage.isLost);
  const maxStage = Math.max(1, ...openStages.map((stage) => stage.count));

  return (
    <div>
      <Link href="/admin/crm" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to CRM
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">CRM reports</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {reports.totalDeals} deal(s) · {money(reports.totalValue, currency)} pipeline ·{" "}
            {money(reports.wonValue, currency)} won
          </p>
        </div>
        <Link
          href="/admin/crm/reports/forecasting"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Forecasting &amp; attribution →
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Pipeline funnel
        </h2>
        <div className="mt-4 space-y-3">
          {reports.stages.map((stage) => (
            <div key={stage.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-zinc-700">{stage.label}</span>
                <span className="text-xs text-zinc-500">
                  {stage.count} deal(s) · {money(stage.value, currency)} · {stage.probability}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${
                    stage.isWon ? "bg-emerald-400" : stage.isLost ? "bg-zinc-400" : "bg-zinc-800"
                  }`}
                  style={{ width: `${Math.max(2, (stage.count / maxStage) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Source performance
          </h2>
          <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
              <tr>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Deals</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Won</th>
                <th className="py-2 pr-3">Win rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reports.sources.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-3 font-medium text-zinc-800">{row.label}</td>
                  <td className="py-2 pr-3 text-zinc-600">{row.count}</td>
                  <td className="py-2 pr-3 text-zinc-600">{money(row.value, currency)}</td>
                  <td className="py-2 pr-3 text-zinc-600">
                    {row.wonCount} · {money(row.wonValue, currency)}
                  </td>
                  <td className="py-2 pr-3 text-zinc-600">{percent(row.wonCount, row.count)}</td>
                </tr>
              ))}
              {reports.sources.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-zinc-400">
                    No deals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Owner leaderboard
          </h2>
          <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
              <tr>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Deals</th>
                <th className="py-2 pr-3">Pipeline</th>
                <th className="py-2 pr-3">Won</th>
                <th className="py-2 pr-3">Win rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reports.owners.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-3 font-medium text-zinc-800">{row.label}</td>
                  <td className="py-2 pr-3 text-zinc-600">{row.count}</td>
                  <td className="py-2 pr-3 text-zinc-600">{money(row.value, currency)}</td>
                  <td className="py-2 pr-3 text-zinc-600">
                    {row.wonCount} · {money(row.wonValue, currency)}
                  </td>
                  <td className="py-2 pr-3 text-zinc-600">{percent(row.wonCount, row.count)}</td>
                </tr>
              ))}
              {reports.owners.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-zinc-400">
                    No deals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </section>
      </div>
    </div>
  );
}
