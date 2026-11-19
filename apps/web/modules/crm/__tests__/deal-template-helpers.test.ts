import { describe, expect, it } from "vitest";
import {
  isValidPipelineKey,
  mergeDealTemplateDefaults,
  normalizeDealTemplateDefaults,
} from "../deal-template-helpers";

describe("normalizeDealTemplateDefaults", () => {
  it("normalizes and clamps template defaults", () => {
    const result = normalizeDealTemplateDefaults({
      title: "  Website redesign  ",
      value: 12500.5,
      currency: "usd",
      stageKey: " Qualified ",
      probability: 140,
      lineItems: [
        { name: "Discovery", quantity: 2, unitPrice: 500 },
        { name: "", quantity: -1, unitPrice: -5 },
      ],
      unexpected: "ignored",
    });

    expect(result.title).toBe("Website redesign");
    expect(result.value).toBe(12500.5);
    expect(result.currency).toBe("USD");
    expect(result.stageKey).toBe("qualified");
    expect(result.probability).toBe(100);
    expect(result.lineItems).toEqual([{ name: "Discovery", quantity: 2, unitPrice: 500 }]);
    expect(result).not.toHaveProperty("unexpected");
  });

  it("returns safe defaults for empty input", () => {
    expect(normalizeDealTemplateDefaults(null)).toEqual({
      title: "",
      value: 0,
      currency: "USD",
      stageKey: "",
      probability: null,
      expectedCloseDate: "",
      source: "",
      companyName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      notes: "",
      lineItems: [],
    });
  });
});

describe("mergeDealTemplateDefaults", () => {
  it("prefers overrides while keeping template defaults", () => {
    const defaults = normalizeDealTemplateDefaults({
      title: "Template deal",
      value: 1000,
      currency: "USD",
      stageKey: "new",
      probability: 20,
      notes: "Template notes",
    });

    expect(
      mergeDealTemplateDefaults(defaults, {
        title: "Custom deal",
        probability: undefined,
        notes: "",
      }),
    ).toMatchObject({
      title: "Custom deal",
      value: 1000,
      stageKey: "new",
      probability: 20,
      notes: "Template notes",
    });
  });
});

describe("isValidPipelineKey", () => {
  it("accepts lowercase slugs and rejects unsafe keys", () => {
    expect(isValidPipelineKey("sales-pipeline_2")).toBe(true);
    expect(isValidPipelineKey("Sales Pipeline")).toBe(false);
    expect(isValidPipelineKey("../pipeline")).toBe(false);
    expect(isValidPipelineKey("")).toBe(false);
  });
});
