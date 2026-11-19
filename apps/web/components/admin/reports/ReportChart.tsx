"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportPoint } from "@/modules/reports/report-data";
import type { ReportVisualization } from "@/modules/reports/report-config";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#71717a"];

export default function ReportChart({
  points,
  visualization,
}: {
  points: ReportPoint[];
  visualization: ReportVisualization;
}) {
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-500">No data for this report yet.</p>;
  }

  if (visualization === "pie") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={points} dataKey="value" nameKey="label" outerRadius={110} fill="#2563eb" label>
              {points.map((point, index) => (
                <Cell key={point.label} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const Chart = visualization === "line" ? LineChart : BarChart;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {visualization === "line" ? (
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
          ) : (
            <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
