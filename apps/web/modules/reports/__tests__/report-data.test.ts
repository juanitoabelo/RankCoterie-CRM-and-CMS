import { describe, expect, it } from "vitest";
import { aggregateReportPoints } from "../report-data";

describe("aggregateReportPoints", () => {
  it("sums duplicate labels and sorts results by label", () => {
    const result = aggregateReportPoints([
      { label: "Won", value: 2 },
      { label: "New", value: 1 },
      { label: "Won", value: 3 },
    ]);

    expect(result).toEqual([
      { label: "New", value: 1 },
      { label: "Won", value: 5 },
    ]);
  });

  it("ignores blank labels and non-finite values", () => {
    const result = aggregateReportPoints([
      { label: "", value: 10 },
      { label: "Qualified", value: Number.NaN },
      { label: "Qualified", value: 4 },
    ]);

    expect(result).toEqual([{ label: "Qualified", value: 4 }]);
  });
});
