"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AttributionRow,
  HistoricalTrendPoint,
  LifecycleFunnelRow,
  StageFunnelRow,
  StageTransition,
  WinRateSummary,
} from "@/modules/crm/forecasting";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#71717a"];

type ForecastMonth = {
  key: string;
  label: string;
  openCount: number;
  openValue: number;
  wonCount: number;
  wonValue: number;
  weighted: number;
};

type ForecastChartsData = {
  currency: string;
  forecast: {
    months: ForecastMonth[];
    totals: { openValue: number; wonValue: number; weighted: number };
    bestCase: number;
    worstCase: number;
  };
  attribution: {
    bySource: AttributionRow[];
    byOwner: AttributionRow[];
    byCampaign: AttributionRow[];
    byPublisher: AttributionRow[];
    byLandingPage: AttributionRow[];
    totalValue: number;
  };
  winRate: WinRateSummary;
  trend: HistoricalTrendPoint[];
  stageFunnel: StageFunnelRow[];
  lifecycleFunnel: LifecycleFunnelRow[];
  stageTransitions: (StageTransition & { fromLabel: string; toLabel: string })[];
};

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AttributionTable({ title, rows, money }: { title: string; rows: AttributionRow[]; money: (value: number) => string }) {
  return (
    <Panel title={title}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
            <tr>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Deals</th>
              <th className="py-2 pr-3">Value</th>
              <th className="py-2 pr-3">Won</th>
              <th className="py-2 pr-3">Lost</th>
              <th className="py-2 pr-3">Open</th>
              <th className="py-2 pr-3">Win rate</th>
              <th className="py-2">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-sm text-zinc-400">No deals yet.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-3 font-medium text-zinc-800">{row.label}</td>
                  <td className="py-2 pr-3 text-zinc-600">{row.count}</td>
                  <td className="py-2 pr-3 text-zinc-600">{money(row.value)}</td>
                  <td className="py-2 pr-3 text-zinc-600">{row.wonCount}</td>
                  <td className="py-2 pr-3 text-zinc-600">{row.lostCount}</td>
                  <td className="py-2 pr-3 text-zinc-600">{row.openCount}</td>
                  <td className="py-2 pr-3 text-zinc-600">{row.winRate.toFixed(1)}%</td>
                  <td className="py-2 text-zinc-600">{row.share.toFixed(1)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-400">Win rate uses decided deals only (won / (won + lost)).</p>
    </Panel>
  );
}

export default function ForecastChartsClient({
  currency,
  forecast,
  attribution,
  winRate,
  trend,
  stageFunnel,
  lifecycleFunnel,
  stageTransitions,
}: ForecastChartsData) {
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  const winRateSeries = trend.map((point) => ({
    label: point.label,
    winRate: point.closedCount ? (point.wonCount / point.closedCount) * 100 : 0,
  }));
  const maxStageCount = Math.max(1, ...stageFunnel.map((stage) => stage.count));
  const maxLifecycleCount = Math.max(
    1,
    ...lifecycleFunnel.map((stage) => stage.count),
  );

  return (
    <div className="space-y-6">
      <Link href="/admin/crm/reports" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to CRM reports
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Forecast &amp; attribution</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Weighted pipeline, historical outcomes, and decided-only win rates by source and owner.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Open pipeline" value={money(forecast.totals.openValue)} />
        <Card label="Weighted forecast" value={money(forecast.totals.weighted)} />
        <Card label="Won revenue" value={money(forecast.totals.wonValue)} />
        <Card label="Best case" value={money(forecast.bestCase)} />
        <Card label="Win rate" value={`${winRate.winRate.toFixed(1)}%`} sub={`${winRate.decidedCount} decided deal(s)`} />
        <Card label="Avg. sales cycle" value={`${winRate.avgSalesCycleDays} days`} />
        <Card label="Won / lost" value={`${winRate.wonCount} / ${winRate.lostCount}`} sub={`${winRate.openCount} still open`} />
        <Card label="Worst case" value={money(forecast.worstCase)} />
      </div>

      <Panel title="Historical created vs. won (12 months)">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wonFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 12 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Legend />
            <Area type="monotone" dataKey="createdValue" name="Created" stroke="#2563eb" fill="url(#createdFill)" />
            <Area type="monotone" dataKey="wonValue" name="Won" stroke="#10b981" fill="url(#wonFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Monthly win rate (decided deals)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={winRateSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
              <Line type="monotone" dataKey="winRate" name="Win rate" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Pipeline value by source">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={attribution.bySource.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Bar dataKey="value" name="Pipeline" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Pipeline by publisher">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={attribution.byPublisher.slice(0, 8)}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {attribution.byPublisher.slice(0, 8).map((row, index) => (
                  <Cell key={row.key} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => money(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Lifecycle funnel">
          <div className="flex h-64 items-end justify-around gap-4">
            {lifecycleFunnel.map((stage, index) => (
              <div key={stage.key} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t bg-zinc-800"
                  style={{ height: `${(stage.count / maxLifecycleCount) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }}
                />
                <p className="mt-2 text-sm text-zinc-600">{stage.label}</p>
                <p className="text-lg font-semibold text-zinc-900">{stage.count}</p>
                <p className="text-xs text-zinc-400">{money(stage.value)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Stage funnel">
        <div className="space-y-3">
          {stageFunnel.map((stage) => (
            <div key={stage.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-zinc-700">{stage.label}</span>
                <span className="text-xs text-zinc-500">
                  {stage.count} deal(s) · {money(stage.value)}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${
                    stage.isWon ? "bg-emerald-400" : stage.isLost ? "bg-zinc-400" : "bg-zinc-800"
                  }`}
                  style={{ width: `${Math.max(2, (stage.count / maxStageCount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Monthly forecast">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
              <tr>
                <th className="py-2 pr-3">Month</th>
                <th className="py-2 pr-3">Open deals</th>
                <th className="py-2 pr-3">Open value</th>
                <th className="py-2 pr-3">Won value</th>
                <th className="py-2">Weighted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {forecast.months.map((month) => (
                <tr key={month.key}>
                  <td className="py-2 pr-3 font-medium text-zinc-800">{month.label}</td>
                  <td className="py-2 pr-3 text-zinc-600">{month.openCount}</td>
                  <td className="py-2 pr-3 text-zinc-600">{money(month.openValue)}</td>
                  <td className="py-2 pr-3 text-zinc-600">{money(month.wonValue)}</td>
                  <td className="py-2 text-zinc-600">{money(month.weighted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AttributionTable title="By source" rows={attribution.bySource} money={money} />
        <AttributionTable title="By owner" rows={attribution.byOwner} money={money} />
      </div>

      <Panel title="Stage transitions">
        {stageTransitions.length === 0 ? (
          <p className="text-sm text-zinc-400">No stage changes recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
                <tr>
                  <th className="py-2 pr-3">From</th>
                  <th className="py-2 pr-3">To</th>
                  <th className="py-2">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stageTransitions.map((transition) => (
                  <tr key={`${transition.from}-${transition.to}`}>
                    <td className="py-2 pr-3 text-zinc-600">{transition.fromLabel}</td>
                    <td className="py-2 pr-3 text-zinc-600">{transition.toLabel}</td>
                    <td className="py-2 text-zinc-800">{transition.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
