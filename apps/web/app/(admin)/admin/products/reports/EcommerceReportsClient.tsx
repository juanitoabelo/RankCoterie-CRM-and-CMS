"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

interface SummaryData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  paidOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  conversionRate: string;
}

interface TopProduct {
  product: { name: string; slug: string };
  revenue: number;
  quantity: number;
  orderCount: number;
}

interface CategoryRevenue {
  category: string;
  revenue: number;
}

interface DailyData {
  date: string;
  revenue: number;
  orders: number;
}

interface FunnelData {
  total_created: number;
  paid: number;
  completed: number;
}

interface EcommerceReportData {
  summary: SummaryData;
  topProducts: TopProduct[];
  revenueByCategory: CategoryRevenue[];
  dailySales: DailyData[];
  dailyOrders: DailyData[];
  funnel: FunnelData;
}

interface EcommerceReportsClientProps {
  initialData: EcommerceReportData;
}

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];

const SummaryCard = ({ label, value, href, trend }: { label: string; value: string | number; href?: string; trend?: string }) => (
  <Link href={href ?? "#"} className="rounded-xl border border-zinc-200 bg-white p-5 hover:bg-zinc-50 transition-colors">
    <p className="text-sm text-zinc-500">{label}</p>
    <p className="mt-1 text-3xl font-semibold text-zinc-900 flex items-center gap-2">
      {value}
      {trend && <span className="text-green-600 text-lg">{trend}</span>}
    </p>
  </Link>
);

export default function EcommerceReportsClient({ initialData }: EcommerceReportsClientProps) {
  const { summary, topProducts, revenueByCategory, dailySales, dailyOrders, funnel } = initialData;

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-zinc-200 rounded-lg shadow-lg">
          <p className="font-medium text-zinc-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const toNum = (val: any) => Number(val);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Ecommerce Reports</h1>
        <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">
          View All Orders →
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Orders" value={summary.totalOrders.toLocaleString()} href="/admin/orders" />
        <SummaryCard label="Total Revenue" value={`$${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} href="/admin/orders" />
        <SummaryCard label="Avg Order Value" value={`$${summary.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <SummaryCard label="Conversion Rate" value={`${summary.conversionRate}%`} />
        <SummaryCard label="Paid Orders" value={summary.paidOrders.toLocaleString()} href="/admin/orders?status=PAID" />
        <SummaryCard label="Pending Orders" value={summary.pendingOrders.toLocaleString()} href="/admin/orders?status=PENDING" />
        <SummaryCard label="Completed" value={summary.completedOrders.toLocaleString()} />
        <SummaryCard label="Cancelled" value={summary.cancelledOrders.toLocaleString()} />
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-4">Conversion Funnel (Last 30 Days)</h2>
        <div className="flex items-end justify-around gap-8 h-64">
          <div className="flex flex-col items-center flex-1">
            <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(toNum(funnel.total_created) / Math.max(toNum(funnel.total_created), 1)) * 100}%` }} />
            <p className="mt-2 text-sm text-zinc-600">Created</p>
            <p className="text-2xl font-bold text-zinc-900">{toNum(funnel.total_created).toLocaleString()}</p>
          </div>
          <div className="flex flex-col items-center flex-1">
            <div className="w-full bg-green-500 rounded-t" style={{ height: `${toNum(funnel.total_created) > 0 ? (toNum(funnel.paid) / toNum(funnel.total_created)) * 100 : 0}%` }} />
            <p className="mt-2 text-sm text-zinc-600">Paid</p>
            <p className="text-2xl font-bold text-zinc-900">{toNum(funnel.paid).toLocaleString()}</p>
            <p className="text-xs text-zinc-500">{toNum(funnel.total_created) > 0 ? ((toNum(funnel.paid) / toNum(funnel.total_created)) * 100).toFixed(1) : 0}%</p>
          </div>
          <div className="flex flex-col items-center flex-1">
            <div className="w-full bg-purple-500 rounded-t" style={{ height: `${toNum(funnel.paid) > 0 ? (toNum(funnel.completed) / toNum(funnel.paid)) * 100 : 0}%` }} />
            <p className="mt-2 text-sm text-zinc-600">Completed</p>
            <p className="text-2xl font-bold text-zinc-900">{toNum(funnel.completed).toLocaleString()}</p>
            <p className="text-xs text-zinc-500">{toNum(funnel.paid) > 0 ? ((toNum(funnel.completed) / toNum(funnel.paid)) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Daily Sales & Revenue by Category */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-4">Daily Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailySales}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} />
              <YAxis stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={({ active, payload, label }: any) => customTooltip({ active, payload, label })} />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-4">Revenue by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueByCategory.slice(0, 8)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="revenue"
                nameKey="category"
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {revenueByCategory.slice(0, 8).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Daily Orders & Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-4">Daily Orders (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} />
              <YAxis stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} />
              <Tooltip content={({ active, payload, label }: any) => customTooltip({ active, payload, label })} />
              <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-4">Top Products by Revenue</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts.slice(0, 8).reverse()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis type="number" stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="product.name" width={150} stroke="#71717a" fontSize={12} tick={{ fill: "#71717a" }} />
              <Tooltip content={({ active, payload, label }: any) => customTooltip({ active, payload, label })} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-4">Top Products Detail</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-2 text-zinc-500">Product</th>
                <th className="pb-2 text-right text-zinc-500">Revenue</th>
                <th className="pb-2 text-right text-zinc-500">Units Sold</th>
                <th className="pb-2 text-right text-zinc-500">Orders</th>
                <th className="pb-2 text-right text-zinc-500">Avg/Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {topProducts.map((item) => (
                <tr key={item.product.slug} className="hover:bg-zinc-50">
                  <td className="py-3 font-medium text-zinc-900">
                    <Link href={`/admin/products/${item.product.slug}/edit`} className="hover:underline">
                      {item.product.name}
                    </Link>
                  </td>
                  <td className="py-3 text-right font-medium text-zinc-900">${item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 text-right text-zinc-600">{item.quantity}</td>
                  <td className="py-3 text-right text-zinc-600">{item.orderCount}</td>
                  <td className="py-3 text-right text-zinc-600">${(item.revenue / Math.max(item.quantity, 1)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function customTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-zinc-200 rounded-lg shadow-lg">
        <p className="font-medium text-zinc-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.dataKey === "revenue" ? `$${entry.value.toLocaleString()}` : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
}