import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { getCrmDashboard } from "@/modules/crm/queries";
import { FlashBanner } from "@/components/admin/FlashBanner";
import CrmTaskList from "@/components/admin/crm/CrmTaskList";
import CrmTimeline from "@/components/admin/crm/CrmTimeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Dashboard | Admin" };

function money(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function Metric({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function CrmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("crm");
  const { error, ok } = await searchParams;
  const dashboard = await getCrmDashboard();
  const currency = dashboard.settings.defaultCurrency;

  return (
    <div>
      <FlashBanner error={error} ok={ok} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">CRM</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pipeline, activity, tasks, and lead health in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/crm/pipeline"
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
          >
            Open pipeline
          </Link>
          <Link
            href="/admin/crm/deals/new"
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            New deal
          </Link>
          <Link
            href="/admin/crm/settings"
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Settings
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Open pipeline"
          value={money(dashboard.pipelineValue, currency)}
          hint={`${dashboard.openDeals} open deal(s)`}
          href="/admin/crm/pipeline"
        />
        <Metric
          label="Weighted forecast"
          value={money(dashboard.weightedForecast, currency)}
          hint="Stage-probability weighted"
        />
        <Metric
          label="Won this month"
          value={money(dashboard.wonValueThisMonth, currency)}
          hint={`${dashboard.wonThisMonth} won · ${dashboard.lostThisMonth} lost · ${dashboard.winRate.toFixed(0)}% win rate`}
        />
        <Metric
          label="Average lead score"
          value={dashboard.averageLeadScore.toFixed(0)}
          hint={`${dashboard.newLeadsThisMonth} new leads · ${dashboard.convertedThisMonth} converted this month`}
          href="/admin/leads"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Pipeline by stage
            </h2>
            <Link href="/admin/crm/pipeline" className="text-xs text-zinc-500 underline">
              view board
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.dealsByStage.map((stage) => {
              const max = Math.max(
                1,
                ...dashboard.dealsByStage.map((row) => row.value),
              );
              return (
                <div key={stage.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-700">{stage.label}</span>
                    <span className="text-xs text-zinc-500">
                      {stage.count} deal(s) · {money(stage.value, currency)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full ${
                        stage.isWon
                          ? "bg-emerald-400"
                          : stage.isLost
                            ? "bg-zinc-400"
                            : "bg-zinc-800"
                      }`}
                      style={{ width: `${Math.max(2, (stage.value / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Needs attention
          </h2>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-zinc-500">
                Overdue tasks ({dashboard.tasksDue.length})
              </p>
              <div className="mt-2">
                <CrmTaskList
                  tasks={dashboard.tasksDue.slice(0, 6)}
                  returnTo="/admin/crm"
                  emptyText="No overdue tasks."
                  showContext
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">
                Stale deals ({dashboard.staleDeals.length})
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {dashboard.staleDeals.slice(0, 6).map((deal) => (
                  <li key={deal.id}>
                    <Link
                      href={`/admin/crm/deals/${deal.id}`}
                      className="text-zinc-700 hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-400">
                      {money(deal.value, deal.currency)}
                    </span>
                  </li>
                ))}
                {dashboard.staleDeals.length === 0 && (
                  <li className="text-sm text-zinc-400">No stale deals.</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Recent activity
            </h2>
            <Link href="/admin/crm/activities" className="text-xs text-zinc-500 underline">
              view all
            </Link>
          </div>
          <div className="mt-4">
            <CrmTimeline
              items={dashboard.recentActivities}
              emptyText="No CRM activity yet. Log a call or note from a deal, lead, or client."
              compact
            />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Upcoming tasks
          </h2>
          <div className="mt-3">
            <CrmTaskList
              tasks={dashboard.tasksUpcoming.slice(0, 8)}
              returnTo="/admin/crm"
              emptyText="No tasks due in the next 7 days."
              showContext
            />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {Object.entries(dashboard.leadCounts).map(([status, count]) => (
          <div key={status} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">{status}</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
