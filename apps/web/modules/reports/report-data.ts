export interface ReportPoint {
  label: string;
  value: number;
}

export function aggregateReportPoints(rows: ReportPoint[]): ReportPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = row.label.trim();
    if (!label || !Number.isFinite(row.value)) continue;
    totals.set(label, (totals.get(label) ?? 0) + row.value);
  }
  return Array.from(totals, ([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
