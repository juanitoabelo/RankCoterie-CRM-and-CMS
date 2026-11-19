import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { dashboardSaveForm } from "@/modules/reports/actions";
import { listSavedDashboards, listSavedReports } from "@/modules/reports/saved";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Dashboards | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("reports");
  const { error, ok } = await searchParams;
  const [dashboards, reports] = await Promise.all([listSavedDashboards(), listSavedReports()]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500"><Link href="/admin/crm/reports" className="hover:underline">Admin / CRM Reports</Link> / Dashboards</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Dashboards</h1>
        <p className="mt-1 text-sm text-zinc-500">Group saved reports into a single CRM overview.</p>
      </div>
      <FlashBanner error={error} ok={ok} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Saved dashboards</h2>
        <div className="mt-3 divide-y divide-zinc-100">
          {dashboards.length === 0 ? <p className="py-3 text-sm text-zinc-500">No dashboards yet.</p> : null}
          {dashboards.map((dashboard) => (
            <div key={dashboard.id} className="py-3">
              <p className="font-medium text-zinc-900">
                {dashboard.name}
                {dashboard.shared ? <span className="ml-2 text-xs text-emerald-700">shared</span> : null}
              </p>
              <p className="text-xs text-zinc-500">
                {dashboard.widgets.length > 0
                  ? dashboard.widgets.map((widget) => widget.title).join(" · ")
                  : "No widgets"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">New dashboard</h2>
        <form action={dashboardSaveForm} className="mt-3 grid gap-4">
          <label className="block text-sm text-zinc-600">
            Name
            <input name="name" required maxLength={120} className={inputCls} />
          </label>
          <label className="block text-sm text-zinc-600">
            Description
            <input name="description" maxLength={500} className={inputCls} />
          </label>
          <fieldset className="rounded-lg border border-zinc-200 p-3">
            <legend className="px-1 text-sm text-zinc-600">Widgets</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {reports.length === 0 ? <p className="text-sm text-zinc-500">Save a report first.</p> : null}
              {reports.map((report) => (
                <label key={report.id} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" name="reportIds" value={report.id} />
                  {report.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" name="shared" />
            Share with other CRM users
          </label>
          <div>
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Create dashboard</button>
          </div>
        </form>
      </section>
    </div>
  );
}
