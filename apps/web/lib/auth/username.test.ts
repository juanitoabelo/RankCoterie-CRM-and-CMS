import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameFromEmail, validateUsername } from "./username";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Logan.Marketing ")).toBe("logan.marketing");
  });
});

describe("validateUsername", () => {
  it("accepts letters, numbers, dots, underscores, and hyphens", () => {
    expect(validateUsername("logan.marketing")).toBeNull();
    expect(validateUsername("acme_roofing-1")).toBeNull();
  });

  it("rejects empty, too short, too long, and invalid handles", () => {
    expect(validateUsername("   ")).not.toBeNull();
    expect(validateUsername("ab")).not.toBeNull();
    expect(validateUsername("a".repeat(31))).not.toBeNull();
    expect(validateUsername("logan marketing")).not.toBeNull();
    expect(validateUsername("logan@marketing")).not.toBeNull();
    expect(validateUsername(".logan")).not.toBeNull();
    expect(validateUsername("logan.")).not.toBeNull();
  });
});

describe("usernameFromEmail", () => {
  it("derives a safe login handle from the email local part", () => {
    expect(usernameFromEmail("loganmazzettia.marketing@gmail.com")).toBe(
      "loganmazzettia.marketing",
    );
    expect(usernameFromEmail("First+Last@example.com")).toBe("first-last");
  });
});
