export const REPORT_DATASETS = [
  "dealsByStage",
  "dealsByOwner",
  "leadsBySource",
  "revenueByMonth",
] as const;

export const REPORT_METRICS = ["count", "value", "weightedValue"] as const;
export const REPORT_VISUALIZATIONS = ["bar", "line", "pie"] as const;

export type ReportDataset = (typeof REPORT_DATASETS)[number];
export type ReportMetric = (typeof REPORT_METRICS)[number];
export type ReportVisualization = (typeof REPORT_VISUALIZATIONS)[number];

export interface ReportConfig {
  dataset: ReportDataset;
  metric: ReportMetric;
  dimension: string;
  visualization: ReportVisualization;
}

export const REPORT_DIMENSIONS: Record<ReportDataset, readonly string[]> = {
  dealsByStage: ["stage", "owner"],
  dealsByOwner: ["owner", "stage"],
  leadsBySource: ["source", "status"],
  revenueByMonth: ["month", "owner"],
};

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  dataset: "dealsByStage",
  metric: "count",
  dimension: "stage",
  visualization: "bar",
};

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

export function normalizeReportConfig(value: unknown): ReportConfig {
  if (!value || typeof value !== "object") return { ...DEFAULT_REPORT_CONFIG };
  const raw = value as Record<string, unknown>;
  const dataset = isOneOf(raw.dataset, REPORT_DATASETS) ? raw.dataset : DEFAULT_REPORT_CONFIG.dataset;
  const metric = isOneOf(raw.metric, REPORT_METRICS) ? raw.metric : DEFAULT_REPORT_CONFIG.metric;
  const visualization = isOneOf(raw.visualization, REPORT_VISUALIZATIONS)
    ? raw.visualization
    : DEFAULT_REPORT_CONFIG.visualization;
  const dimension = typeof raw.dimension === "string" && REPORT_DIMENSIONS[dataset].includes(raw.dimension)
    ? raw.dimension
    : REPORT_DIMENSIONS[dataset][0];

  return { dataset, metric, dimension, visualization };
}

export function validateReportConfig(
  value: unknown,
): { ok: true; config: ReportConfig } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Report configuration must be an object." };
  }
  const raw = value as Record<string, unknown>;
  if (raw.dataset !== undefined && !isOneOf(raw.dataset, REPORT_DATASETS)) {
    return { ok: false, error: "Unsupported report dataset." };
  }
  if (raw.metric !== undefined && !isOneOf(raw.metric, REPORT_METRICS)) {
    return { ok: false, error: "Unsupported report metric." };
  }
  if (raw.visualization !== undefined && !isOneOf(raw.visualization, REPORT_VISUALIZATIONS)) {
    return { ok: false, error: "Unsupported visualization." };
  }

  const config = normalizeReportConfig(raw);
  if (raw.dimension !== undefined && !REPORT_DIMENSIONS[config.dataset].includes(String(raw.dimension))) {
    return { ok: false, error: "Unsupported dimension for this dataset." };
  }

  return { ok: true, config };
}
