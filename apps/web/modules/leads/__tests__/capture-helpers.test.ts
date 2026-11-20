import { describe, expect, it } from "vitest";
import {
  leadDedupeWhere,
  mergeCapturedLeadData,
  normalizeLeadCapture,
} from "../capture-helpers";

describe("normalizeLeadCapture", () => {
  it("normalizes names, email, phone, and source", () => {
    const result = normalizeLeadCapture({
      tenantId: "tenant-1",
      name: "  Ada Lovelace  ",
      email: "  ADA@Example.COM ",
      phone: "(555) 123-9876",
      message: "  Interested in a demo  ",
      source: "  live-chat  ",
    });

    expect(result.firstName).toBe("Ada");
    expect(result.lastName).toBe("Lovelace");
    expect(result.email).toBe("ada@example.com");
    expect(result.phone).toBe("(555) 123-9876");
    expect(result.phoneDigits).toBe("5551239876");
    expect(result.message).toBe("Interested in a demo");
    expect(result.source).toBe("live-chat");
  });

  it("uses email-only dedupe by default", () => {
    const result = normalizeLeadCapture({
      tenantId: "tenant-1",
      email: "ada@example.com",
      phone: "5551239876",
    });

    expect(result.dedupeMode).toBe("email");
    expect(result.dedupeKeys).toEqual(["ada@example.com"]);
  });
});

describe("leadDedupeWhere", () => {
  it("builds a tenant-scoped insensitive email match", () => {
    const input = normalizeLeadCapture({
      tenantId: "tenant-1",
      email: "ada@example.com",
    });

    expect(leadDedupeWhere(input)).toEqual({
      tenantId: "tenant-1",
      OR: [
        { email: { equals: "ada@example.com", mode: "insensitive" } },
        { intake: { path: ["dedupeEmails"], array_contains: "ada@example.com" } },
      ],
    });
  });

  it("builds an email-or-phone match when requested", () => {
    const input = normalizeLeadCapture({
      tenantId: "tenant-1",
      email: "ada@example.com",
      phone: "(555) 123-9876",
      dedupeMode: "emailOrPhone",
    });

    expect(leadDedupeWhere(input)).toEqual({
      tenantId: "tenant-1",
      OR: [
        { email: { equals: "ada@example.com", mode: "insensitive" } },
        { intake: { path: ["dedupeEmails"], array_contains: "ada@example.com" } },
        { phones: { string_contains: "(555) 123-9876" } },
        { phones: { string_contains: "5551239876" } },
        { intake: { path: ["dedupePhones"], array_contains: "5551239876" } },
      ],
    });
  });

  it("returns null when dedupe is disabled", () => {
    const input = normalizeLeadCapture({
      tenantId: "tenant-1",
      email: "ada@example.com",
      dedupeMode: "none",
    });

    expect(leadDedupeWhere(input)).toBeNull();
  });
});

describe("mergeCapturedLeadData", () => {
  it("keeps existing values and appends distinct contact details", () => {
    const existing = {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phones: [{ number: "555-000-0000", kind: "mobile", digits: "5550000000" }],
    };
    const input = normalizeLeadCapture({
      tenantId: "tenant-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "5551239876",
      message: "Follow up next week",
    });

    expect(mergeCapturedLeadData(existing, input)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phones: [
        { number: "555-000-0000", kind: "mobile", digits: "5550000000" },
        { number: "5551239876", kind: "unknown", digits: "5551239876" },
      ],
    });
  });

  it("fills a blank phone on an existing lead", () => {
    const existing = {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phones: [],
    };
    const input = normalizeLeadCapture({
      tenantId: "tenant-1",
      email: "ada@example.com",
      phone: "5551239876",
      message: "New inquiry",
    });

    expect(mergeCapturedLeadData(existing, input)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phones: [{ number: "5551239876", kind: "unknown", digits: "5551239876" }],
    });
  });
});
