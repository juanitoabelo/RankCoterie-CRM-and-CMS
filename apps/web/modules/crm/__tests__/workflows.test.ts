import { describe, expect, it } from "vitest";
import { normalizeWorkflowRules, workflowMatches, type CrmWorkflowRule } from "../workflows";

const rule: CrmWorkflowRule = {
  id: "workflow-1",
  name: "Big negotiation",
  event: "deal.stage_changed",
  enabled: true,
  conditions: [
    { field: "stage.label", operator: "equals", value: "Negotiation" },
    { field: "deal.value", operator: "gte", value: 20000 },
    { field: "source", operator: "contains", value: "website" },
  ],
  actions: [{ type: "create_task", text: "Prepare proposal", assigneeId: "user-1" }],
};

describe("CRM workflow rules", () => {
  it("matches all conditions against nested event payload fields", () => {
    expect(
      workflowMatches(rule, {
        event: "deal.stage_changed",
        stage: { label: "Negotiation" },
        deal: { value: 25000 },
        source: "company website",
      }),
    ).toBe(true);
  });

  it("does not match a different event or failed condition", () => {
    expect(
      workflowMatches(rule, {
        event: "deal.created",
        stage: { label: "Negotiation" },
        deal: { value: 25000 },
        source: "company website",
      }),
    ).toBe(false);
    expect(
      workflowMatches(rule, {
        event: "deal.stage_changed",
        stage: { label: "Discovery" },
        deal: { value: 25000 },
        source: "company website",
      }),
    ).toBe(false);
  });

  it("normalizes JSON rules and drops disabled or malformed entries", () => {
    const rules = normalizeWorkflowRules(
      JSON.stringify([
        rule,
        { ...rule, id: "workflow-2", enabled: false },
        { id: "workflow-3" },
      ]),
    );
    expect(rules.map((item) => item.id)).toEqual(["workflow-1"]);
    expect(rules[0].conditions).toHaveLength(3);
  });
});
