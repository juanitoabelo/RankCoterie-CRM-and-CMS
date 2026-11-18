import { describe, expect, it } from "vitest";
import { calculateLeadScore } from "../scoring";

describe("calculateLeadScore", () => {
  it("scores a complete, recent lead highly", () => {
    const result = calculateLeadScore({
      email: "lead@example.com",
      phones: [{ number: "+1 555 0100", kind: "mobile" }],
      assignedToId: "user-1",
      status: "OPEN",
      disposition: "QUALIFICATION_CALL",
      campaignId: "campaign-1",
      publisherId: "publisher-1",
      landingPageId: "page-1",
      intake: { goal: "MBA", country: "US" },
      createdAt: new Date(),
      notesCount: 2,
      openTodosCount: 1,
    });
    expect(result.score).toBe(75);
    expect(result.reasons).toContain("+10 email present");
    expect(result.reasons).toContain("+10 phone present");
  });

  it("penalizes archived and lost leads without going below zero", () => {
    const result = calculateLeadScore({
      status: "ARCHIVED",
      disposition: "DUPLICATE",
      createdAt: new Date(Date.now() - 120 * 86_400_000),
    });
    expect(result.score).toBe(0);
    expect(result.reasons).toContain("-10 archived lead");
    expect(result.reasons).toContain("-20 disposition duplicate");
    expect(result.reasons).toContain("-5 stale lead");
  });

  it("caps intake points at 15", () => {
    const result = calculateLeadScore({
      intake: Object.fromEntries(
        Array.from({ length: 20 }, (_, index) => [`field-${index}`, "filled"]),
      ),
    });
    expect(result.score).toBe(15);
    expect(result.reasons).toContain("+15 20 intake field(s)");
  });

  it("clamps the final score at 100", () => {
    const result = calculateLeadScore({
      email: "lead@example.com",
      phones: [{ number: "555" }],
      assignedToId: "user-1",
      status: "OPEN",
      disposition: "CONVERTED",
      campaignId: "campaign-1",
      publisherId: "publisher-1",
      landingPageId: "page-1",
      intake: Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [`field-${index}`, "filled"]),
      ),
      createdAt: new Date(),
      notesCount: 1,
      openTodosCount: 1,
    });
    expect(result.score).toBe(100);
  });

  it("ignores blank contact fields and empty phones", () => {
    const result = calculateLeadScore({
      email: "   ",
      phones: [{ number: "  " }, { number: "" }, null],
      intake: { blank: " ", empty: [], value: "ok" },
    });
    expect(result.reasons).not.toContain("+10 email present");
    expect(result.reasons).not.toContain("+10 phone present");
    expect(result.score).toBe(2);
  });
});
