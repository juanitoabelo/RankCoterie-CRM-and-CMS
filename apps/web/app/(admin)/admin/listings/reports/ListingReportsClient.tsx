"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import type {
  TooltipContentProps,
} from "recharts";
import type { ListingReportsData } from "./types";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const STATUS_COLORS: Record<string, string> = {
  LIVE: "#10b981",
  PENDING_REVIEW: "#f59e0b",
  SUSPENDED: "#ef4444",
  EXPIRED: "#71717a",
  DRAFT: "#a1a1aa",
};

const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(n || 0);

const prettyMonth = (m: string) => {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};

const SummaryCard = ({
  label,
  value,
  sub,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  tone?: "default" | "positive" | "warning" | "danger";
}) => {
  const valueTone =
    tone === "positive"
      ? "text-green-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-red-600"
          : "text-zinc-900";
  const inner = (
    <>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueTone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:bg-zinc-50">
      {inner}
    </Link>
  ) : (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">{inner}</div>
  );
};

function revenueTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
      <p className="font-medium text-zinc-900">{prettyMonth(String(label))}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {money(Number(entry.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export default function ListingReportsClient({ initialData }: { initialData: ListingReportsData }) {
  const { summary, byTier, byStatus, monthly, subscriptions, renewals, amounts } = initialData;

  const tierData = byTier.filter((t) => t.count > 0).map((t) => ({ name: t.tier, value: t.count, mrr: t.mrr }));
  const monthlyData = monthly.map((m) => ({ ...m, label: prettyMonth(m.month) }));
  const recent = subscriptions.slice(0, 50);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Listing Revenue</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Subscription tracking for paid listings · generated {new Date(initialData.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/listings" className="text-blue-600 hover:underline">
            View Listings →
          </Link>
          <Link href="/admin/listings/payment" className="text-blue-600 hover:underline">
            Payment Configuration →
          </Link>
        </div>
      </div>

      {!initialData.stripeConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Stripe isn&apos;t configured, so collected/refunded totals are unavailable. Lifecycle metrics
          (subscribers, MRR estimate, renewals) come from your local database.
          <Link href="/admin/listings/payment" className="ml-1 font-medium underline">
            Configure Stripe
          </Link>
        </div>
      )}
      {initialData.stripeError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Couldn&apos;t reach Stripe: {initialData.stripeError}. Showing local lifecycle metrics only.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Active Subscribers" value={summary.active.toLocaleString()} sub={`${summary.total} total subscriptions`} />
        <SummaryCard label="Est. MRR" value={money(summary.mrr)} sub={`ARR ${money(summary.arr)}`} tone="positive" />
        <SummaryCard label="Collected (Stripe)" value={money(summary.collected, initialData.currency)} sub={`${summary.paidInvoices} paid invoices`} tone="positive" />
        <SummaryCard label="Refunded" value={money(summary.refunded, initialData.currency)} sub={`Net ${money(summary.net, initialData.currency)}`} tone={summary.refunded > 0 ? "danger" : "default"} />
        <SummaryCard label="In Dunning Grace" value={summary.inGrace.toLocaleString()} sub="payment failed, still visible" tone={summary.inGrace > 0 ? "warning" : "default"} />
        <SummaryCard label="Canceled / Expired" value={summary.expired.toLocaleString()} tone={summary.expired > 0 ? "danger" : "default"} />
        <SummaryCard label="New (30d)" value={summary.new30.toLocaleString()} sub={`Churn ${summary.churn30.toFixed(1)}%`} />
        <SummaryCard label="Renewals (30d)" value={summary.renewals30.toLocaleString()} sub={`${money(summary.renewals30Value)} expected`} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Revenue Flow — Collected vs Refunded (12 months)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="lrCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lrRefunded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="label" stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} />
              <YAxis stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={revenueTooltip} />
              <Legend />
              <Area type="monotone" name="Collected" dataKey="collected" stroke="#2563eb" fillOpacity={1} fill="url(#lrCollected)" />
              <Area type="monotone" name="Refunded" dataKey="refunded" stroke="#ef4444" fillOpacity={1} fill="url(#lrRefunded)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Subscribers by Tier
          </h2>
          {tierData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-zinc-400">
              No subscriptions yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name} ${value}`}
                  labelLine={false}
                >
                  {tierData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} listings`, "Count"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Subscriptions by Status
          </h2>
          {byStatus.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-zinc-400">
              No subscriptions yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="status" stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} />
                <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                <Tooltip formatter={(value) => [`${value} listings`, "Count"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byStatus.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.status] ?? "#8b5cf6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Estimated MRR by Tier
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="pb-2 text-zinc-500">Tier</th>
                  <th className="pb-2 text-right text-zinc-500">Listings</th>
                  <th className="pb-2 text-right text-zinc-500">Monthly Price</th>
                  <th className="pb-2 text-right text-zinc-500">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {byTier.map((t) => (
                  <tr key={t.tier} className="hover:bg-zinc-50">
                    <td className="py-3 font-medium text-zinc-900">{t.tier}</td>
                    <td className="py-3 text-right text-zinc-600">{t.count}</td>
                    <td className="py-3 text-right text-zinc-600">
                      {t.tier === "FREE" ? "—" : money(t.tier === "PREMIUM" ? amounts.premium : amounts.standard)}
                    </td>
                    <td className="py-3 text-right font-medium text-zinc-900">{money(t.mrr)}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-semibold">
                  <td className="py-3 text-zinc-900">Total</td>
                  <td className="py-3 text-right text-zinc-900">{summary.total}</td>
                  <td className="py-3 text-right text-zinc-500">—</td>
                  <td className="py-3 text-right text-zinc-900">{money(summary.mrr)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-zinc-400">
              Estimated from the configured tier prices in Payment Configuration — not actual Stripe charges.
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming renewals */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Upcoming Renewals (Next 30 Days)
        </h2>
        {renewals.length === 0 ? (
          <p className="text-sm text-zinc-400">No renewals in the next 30 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="pb-2 text-zinc-500">Listing</th>
                  <th className="pb-2 text-zinc-500">Tier</th>
                  <th className="pb-2 text-zinc-500">Renews</th>
                  <th className="pb-2 text-right text-zinc-500">In</th>
                  <th className="pb-2 text-right text-zinc-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {renewals.map((r, i) => (
                  <tr key={`${r.id ?? i}`} className="hover:bg-zinc-50">
                    <td className="py-3 font-medium text-zinc-900">
                      {r.listingId ? (
                        <Link href={`/admin/listings/${r.listingId}`} className="hover:underline">
                          {r.title}
                        </Link>
                      ) : (
                        r.title
                      )}
                    </td>
                    <td className="py-3 text-zinc-600">{r.tier}</td>
                    <td className="py-3 text-zinc-600">{new Date(r.currentPeriodEnd).toLocaleDateString()}</td>
                    <td className="py-3 text-right text-zinc-600">{r.daysUntil}d</td>
                    <td className="py-3 text-right font-medium text-zinc-900">{money(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All subscriptions */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Subscriptions {subscriptions.length > recent.length && `(latest ${recent.length} of ${subscriptions.length})`}
        </h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-zinc-400">No subscriptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="pb-2 text-zinc-500">Listing</th>
                  <th className="pb-2 text-zinc-500">Tier</th>
                  <th className="pb-2 text-zinc-500">Status</th>
                  <th className="pb-2 text-zinc-500">Period End</th>
                  <th className="pb-2 text-right text-zinc-500">Est. MRR</th>
                  <th className="pb-2 text-zinc-500">Stripe Sub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recent.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td className="py-3 font-medium text-zinc-900">
                      <Link href={`/admin/listings/${s.listingId}`} className="hover:underline">
                        {s.title}
                      </Link>
                    </td>
                    <td className="py-3 text-zinc-600">{s.tier}</td>
                    <td className="py-3">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#8b5cf6" }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-600">
                      {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}
                      {s.paymentGraceUntil && (
                        <span className="ml-2 text-xs text-amber-600">
                          grace to {new Date(s.paymentGraceUntil).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-medium text-zinc-900">
                      {s.mrr > 0 ? money(s.mrr) : "—"}
                    </td>
                    <td className="py-3 text-xs text-zinc-400">{s.stripeSubId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
