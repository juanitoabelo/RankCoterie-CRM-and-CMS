import { describe, expect, it } from "vitest";
import { normalizeReportConfig, validateReportConfig } from "../report-config";

describe("normalizeReportConfig", () => {
  it("uses safe defaults for unknown values", () => {
    expect(
      normalizeReportConfig({
        dataset: "dropAllTables",
        metric: "secretMetric",
        visualization: "iframe",
      }),
    ).toEqual({
      dataset: "dealsByStage",
      metric: "count",
      dimension: "stage",
      visualization: "bar",
    });
  });

  it("keeps valid registered values", () => {
    expect(
      normalizeReportConfig({
        dataset: "leadsBySource",
        metric: "count",
        dimension: "source",
        visualization: "pie",
      }),
    ).toEqual({
      dataset: "leadsBySource",
      metric: "count",
      dimension: "source",
      visualization: "pie",
    });
  });
});

describe("validateReportConfig", () => {
  it("accepts a registered report config", () => {
    const result = validateReportConfig({
      dataset: "revenueByMonth",
      metric: "value",
      dimension: "month",
      visualization: "line",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a config with an invalid visualization", () => {
    const result = validateReportConfig({
      dataset: "dealsByOwner",
      metric: "count",
      visualization: "html",
    });

    expect(result.ok).toBe(false);
  });
});
