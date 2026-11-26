import { describe, expect, it } from "vitest";
import {
  countWordsFromHtml,
  generateAlternateIntro,
  MIN_ALT_INTRO_WORDS,
} from "./geo-category-alt-intro";

const longParentContent = Array.from(
  { length: 24 },
  (_, index) =>
    `<p>Our ${index + 1} local resource explains how {{catName}} support works across {{region}}.</p>`,
).join("");

describe("generateAlternateIntro", () => {
  it("uses the selected geographic area and preserves tokens", () => {
    const result = generateAlternateIntro({
      areaPart: "NORTHERN",
      stateName: "New South Wales",
      cityIntroHtml: "<p>Find help {{in region}} with {{catName}}.</p>",
      parentContentHtml: "<p>Parent guidance for {{catName}}.</p>",
    });

    expect(result.html).toContain("Serving the northern area of {{region}} in New South Wales");
    expect(result.html).toContain("Find help {{in region}} with {{catName}}.");
    expect(result.html).toContain("Parent guidance for {{catName}}.");
    expect(result.html).toContain("{{near region}}");
    expect(result.html).not.toContain("main GeoCategory page");
    expect(result.html).not.toContain("Use this page alongside the parent");
  });

  it("builds from parent/state/city content and removes duplicate paragraphs", () => {
    const shared = "<p>Shared guidance for {{catName}}.</p>";
    const result = generateAlternateIntro({
      areaPart: "SOUTHERN",
      cityIntroHtml: shared,
      parentContentHtml: `${shared}<p>Parent-only guidance.</p>`,
      stateIntroHtml: "<p>State-only guidance.</p>",
    });

    expect(result.html.match(/Shared guidance/g)).toHaveLength(1);
    expect(result.html).toContain("Parent-only guidance.");
    expect(result.html).toContain("State-only guidance.");
    expect(result.html).toContain("Serving the southern area of {{region}}");
  });

  it("meets the internal word target when source content is substantial", () => {
    const result = generateAlternateIntro({
      areaPart: "EASTERN",
      cityIntroHtml: "<p>City intro for {{in region}}.</p>",
      parentContentHtml: longParentContent,
    });

    expect(result.wordCount).toBeGreaterThanOrEqual(MIN_ALT_INTRO_WORDS);
    expect(result.meetsMinimum).toBe(true);
    expect(countWordsFromHtml(result.html)).toBe(result.wordCount);
  });

  it("reports when source content is too thin to meet the target", () => {
    const result = generateAlternateIntro({
      areaPart: "WESTERN",
      cityIntroHtml: "<p>Short intro.</p>",
    });

    expect(result.wordCount).toBeLessThan(MIN_ALT_INTRO_WORDS);
    expect(result.meetsMinimum).toBe(false);
  });

  it("returns empty output when every source field is empty", () => {
    expect(
      generateAlternateIntro({ areaPart: "CENTRAL", cityIntroHtml: "   ", parentContentHtml: "" }),
    ).toEqual({ html: "", wordCount: 0, meetsMinimum: false });
  });

  it("omits the area preamble when no area is selected", () => {
    const result = generateAlternateIntro({
      areaPart: "",
      cityIntroHtml: "<p>Find help {{in region}}.</p>",
    });

    expect(result.html).toContain("Find help {{in region}}.");
    expect(result.html).not.toContain("Serving the");
  });
});
