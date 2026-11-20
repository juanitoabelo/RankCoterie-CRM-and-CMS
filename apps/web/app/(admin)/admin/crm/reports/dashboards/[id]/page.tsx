import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import ReportChart from "@/components/admin/reports/ReportChart";
import { dashboardDeleteForm } from "@/modules/reports/actions";
import { runReport } from "@/modules/reports/query";
import { getSavedDashboard } from "@/modules/reports/saved";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Dashboard | Admin" };

export default async function DashboardViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const viewer = { userId: user.id, isAdmin: access.isAdmin };
  const { id } = await params;
  const dashboard = await getSavedDashboard(id, viewer);
  if (!dashboard) notFound();

  const widgets = await Promise.all(
    dashboard.widgets.map(async (widget) => ({
      widget,
      result: widget.report ? await runReport(widget.report.config, access) : null,
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/crm/reports/dashboards" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Back to dashboards
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{dashboard.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {dashboard.description ?? "Saved CRM dashboard"}
              {dashboard.shared ? " · shared with CRM users" : " · private"}
            </p>
          </div>
          {access.isAdmin || dashboard.ownerId === user.id ? (
            <form action={dashboardDeleteForm}>
              <input type="hidden" name="dashboardId" value={dashboard.id} />
              <button className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
                Delete dashboard
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {widgets.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">This dashboard has no report widgets yet.</p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {widgets.map(({ widget, result }) => (
          <section key={widget.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{widget.title}</h2>
            {!widget.report || !result ? (
              <p className="mt-3 text-sm text-zinc-500">The linked report is no longer available.</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-zinc-500">
                  {widget.report.config.dataset} · {widget.report.config.metric} by {widget.report.config.dimension}
                  {" · total "}
                  {result.total.toFixed(2)}
                </p>
                <ReportChart points={result.points} visualization={widget.report.config.visualization} />
                <Link
                  href={`/admin/crm/reports/builder?reportId=${widget.report.id}`}
                  className="mt-3 inline-block text-sm text-zinc-700 underline"
                >
                  Open report
                </Link>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
