import { describe, expect, it } from "vitest";
import {
  buildAiAlternateIntroPrompt,
  normalizeAiAlternateIntro,
  validateAiAlternateIntro,
  validateAiAlternateIntroInput,
} from "./geo-category-alt-intro-ai";
import { MIN_ALT_INTRO_WORDS } from "./geo-category-alt-intro";

const longValidCopy = `${"Practical {{catName}} information for people in {{region}}. ".repeat(30)}`;

describe("AI alternate intro helpers", () => {
  it("builds a prompt from state, area, tokens, and source fields", () => {
    const prompt = buildAiAlternateIntroPrompt({
      areaPart: "NORTHERN",
      stateName: "New South Wales",
      cityIntroHtml: "<p>Local {{catName}} support.</p>",
      parentContentHtml: "<p>Parent topic detail.</p>",
    });

    expect(prompt.user).toContain("New South Wales");
    expect(prompt.user).toContain("Northern");
    expect(prompt.user).toContain("Local {{catName}} support.");
    expect(prompt.user).toContain("Parent topic detail.");
    expect(prompt.system).toContain("{{region}}");
    expect(prompt.system).toContain(`${MIN_ALT_INTRO_WORDS} words`);
    expect(prompt.system).not.toContain("Generate from parent content");
  });

  it("converts plain AI paragraphs into escaped HTML", () => {
    const output = normalizeAiAlternateIntro("First paragraph.\n\nSecond & final paragraph.");

    expect(output.html).toBe("<p>First paragraph.</p><p>Second &amp; final paragraph.</p>");
    expect(output.wordCount).toBe(6);
  });

  it("rejects admin/parent-page language", () => {
    const result = validateAiAlternateIntro(
      `This follows the main GeoCategory page. ${longValidCopy}`,
    );

    expect(result.ok).toBe(false);
  });

  it("rejects copy missing required tokens", () => {
    const result = validateAiAlternateIntro("Plain local copy without any required tokens. ".repeat(10));

    expect(result.ok).toBe(false);
  });

  it("rejects copy under the word target", () => {
    const result = validateAiAlternateIntro("Short {{catName}} copy for {{region}}.");

    expect(result.ok).toBe(false);
  });

  it("accepts valid token-preserving copy over the word target", () => {
    const result = validateAiAlternateIntro(longValidCopy);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.wordCount).toBeGreaterThanOrEqual(MIN_ALT_INTRO_WORDS);
      expect(result.output.html).toContain("{{catName}}");
    }
  });

  it("validates and normalizes server action input", () => {
    const result = validateAiAlternateIntroInput({
      areaPart: "NORTHERN",
      stateName: " New South Wales ",
      parentContentHtml: "Parent details.",
      cityIntroHtml: 42,
    });

    expect(result.ok).toBe(false);
  });

  it("accepts valid server action input with normalized strings", () => {
    const result = validateAiAlternateIntroInput({
      areaPart: "SOUTHERN",
      stateName: " Victoria ",
      cityIntroHtml: "Local {{catName}} details.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.stateName).toBe("Victoria");
      expect(result.input.cityIntroHtml).toBe("Local {{catName}} details.");
    }
  });

  it("rejects invalid area parts", () => {
    const result = validateAiAlternateIntroInput({
      areaPart: "OUTER_SPACE",
      cityIntroHtml: "Local details.",
    });

    expect(result.ok).toBe(false);
  });
});
