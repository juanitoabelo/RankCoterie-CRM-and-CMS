import { describe, expect, it } from "vitest";
import {
  isCustomFieldCssValid,
  normalizeCustomFormSettings,
  parseCustomFieldCss,
  reorderCustomFormFields,
  validateCustomFormFields,
  validateSubmission,
} from "./types";

describe("custom form definitions", () => {
  it("requires unique stable keys and valid select options", () => {
    expect(validateCustomFormFields([
      { key: "email", label: "Email", type: "email", required: true },
      { key: "email", label: "Alternate", type: "text", required: false },
    ]).error).toMatch(/unique/i);
    expect(validateCustomFormFields([
      { key: "topic", label: "Topic", type: "select", required: true, options: [] },
    ]).error).toMatch(/options/i);
  });

  it("validates required, email and select input while retaining checkbox values", () => {
    const fields = validateCustomFormFields([
      { key: "email", label: "Email", type: "email", required: true },
      { key: "topic", label: "Topic", type: "select", required: true, options: ["Support", "Sales"] },
      { key: "consent", label: "Consent", type: "checkbox", required: true },
    ]).fields!;
    expect(validateSubmission(fields, { email: "bad", topic: "Sales", consent: true }).error).toMatch(/valid email/i);
    expect(validateSubmission(fields, { email: "a@example.com", topic: "Other", consent: true }).error).toMatch(/invalid selection/i);
    expect(validateSubmission(fields, { email: "a@example.com", topic: "Sales", consent: "on" }).data).toEqual({
      email: "a@example.com",
      topic: "Sales",
      consent: true,
    });
  });

  it("normalizes settings without enabling lead creation by default", () => {
    expect(normalizeCustomFormSettings({ notifyTo: ["admin@example.com"], createLead: "true" })).toMatchObject({
      notifyTo: ["admin@example.com"],
      createLead: false,
      confirmationEnabled: false,
    });
  });

  it("supports half-width fields and keeps older field definitions full width", () => {
    const result = validateCustomFormFields([
      { key: "first_name", label: "First name", type: "text", required: true, width: "half" },
      { key: "message", label: "Message", type: "textarea", required: false },
    ]);
    expect(result.fields?.map((field) => field.width)).toEqual(["half", "full"]);
  });

  it("reorders fields without mutating the original array", () => {
    const fields = validateCustomFormFields([
      { key: "first", label: "First", type: "text", required: false },
      { key: "second", label: "Second", type: "text", required: false },
      { key: "third", label: "Third", type: "text", required: false },
    ]).fields!;
    expect(reorderCustomFormFields(fields, 0, 2).map((field) => field.key)).toEqual(["second", "third", "first"]);
    expect(fields.map((field) => field.key)).toEqual(["first", "second", "third"]);
  });

  it("accepts supported field style declarations and rejects unsafe CSS", () => {
    expect(isCustomFieldCssValid("color: #222; background-color: #f8fafc; border-radius: 8px; padding: 12px;")).toBe(true);
    expect(parseCustomFieldCss("color: #222; background-color: #f8fafc;")).toEqual({
      color: "#222",
      backgroundColor: "#f8fafc",
    });
    expect(isCustomFieldCssValid("background-image: url(https://example.com/pixel);")).toBe(false);
    expect(isCustomFieldCssValid("color: red; } body { display: none")).toBe(false);
  });
});
