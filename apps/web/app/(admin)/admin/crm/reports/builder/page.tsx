import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { FlashBanner } from "@/components/admin/FlashBanner";
import ReportChart from "@/components/admin/reports/ReportChart";
import { reportDeleteForm, reportSaveForm } from "@/modules/reports/actions";
import { runReport } from "@/modules/reports/query";
import { getSavedReport, listSavedReports } from "@/modules/reports/saved";
import {
  DEFAULT_REPORT_CONFIG,
  REPORT_DATASETS,
  REPORT_DIMENSIONS,
  REPORT_METRICS,
  REPORT_VISUALIZATIONS,
  normalizeReportConfig,
  type ReportConfig,
} from "@/modules/reports/report-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Report Builder | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const selectCls = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm";

export default async function ReportBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    reportId?: string;
    dataset?: string;
    metric?: string;
    dimension?: string;
    visualization?: string;
  }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const viewer = { userId: user.id, isAdmin: access.isAdmin };
  const params = await searchParams;
  const saved = params.reportId ? await getSavedReport(params.reportId, viewer) : null;
  const config: ReportConfig = saved?.config ?? normalizeReportConfig({
    dataset: params.dataset ?? DEFAULT_REPORT_CONFIG.dataset,
    metric: params.metric ?? DEFAULT_REPORT_CONFIG.metric,
    dimension: params.dimension ?? DEFAULT_REPORT_CONFIG.dimension,
    visualization: params.visualization ?? DEFAULT_REPORT_CONFIG.visualization,
  });
  const [result, reports] = await Promise.all([runReport(config, access), listSavedReports(viewer)]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500"><Link href="/admin/crm/reports" className="hover:underline">Admin / CRM Reports</Link> / Builder</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Report builder</h1>
        <p className="mt-1 text-sm text-zinc-500">Choose a dataset and metric, preview the result, then save it for reuse.</p>
      </div>
      <FlashBanner error={params.error} ok={params.ok} />

      <form method="get" className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm text-zinc-600">
          Dataset
          <select name="dataset" defaultValue={config.dataset} className={selectCls}>
            {REPORT_DATASETS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm text-zinc-600">
          Metric
          <select name="metric" defaultValue={config.metric} className={selectCls}>
            {REPORT_METRICS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm text-zinc-600">
          Dimension
          <select name="dimension" defaultValue={config.dimension} className={selectCls}>
            {REPORT_DIMENSIONS[config.dataset].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm text-zinc-600">
          Visualization
          <select name="visualization" defaultValue={config.visualization} className={selectCls}>
            {REPORT_VISUALIZATIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Preview report</button>
        </div>
      </form>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Preview</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {config.dataset} · {config.metric} by {config.dimension} · total {result.total.toFixed(2)}
            </p>
          </div>
          <Link href="/admin/crm/reports/dashboards" className="text-sm text-zinc-600 underline">
            Dashboards
          </Link>
        </div>
        <ReportChart points={result.points} visualization={config.visualization} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Save report</h2>
          <form action={reportSaveForm} className="mt-3 grid gap-4">
            <input type="hidden" name="dataset" value={config.dataset} />
            <input type="hidden" name="metric" value={config.metric} />
            <input type="hidden" name="dimension" value={config.dimension} />
            <input type="hidden" name="visualization" value={config.visualization} />
            <label className="block text-sm text-zinc-600">
              Name
              <input name="name" required maxLength={120} className={inputCls} />
            </label>
            <label className="block text-sm text-zinc-600">
              Description
              <input name="description" maxLength={500} className={inputCls} />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" name="shared" />
              Share with other CRM users
            </label>
            <div>
              <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Save report</button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Saved reports</h2>
          <div className="mt-3 divide-y divide-zinc-100">
            {reports.length === 0 ? <p className="py-3 text-sm text-zinc-500">No saved reports yet.</p> : null}
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-zinc-900">{report.name}</p>
                  <p className="text-xs text-zinc-500">
                    {report.config.dataset} · {report.config.metric} by {report.config.dimension}
                    {report.shared ? " · shared with CRM users" : " · private"}
                    {access.isAdmin || report.ownerId === user.id ? "" : " · shared by another user"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/crm/reports/builder?reportId=${report.id}`} className="text-sm text-zinc-700 underline">
                    Open
                  </Link>
                  {access.isAdmin || report.ownerId === user.id ? (
                    <form action={reportDeleteForm}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <button className="text-sm text-red-700 underline">Delete</button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
