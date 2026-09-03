import { describe, expect, it } from "vitest";
import {
  DEFAULT_STYLE_GUIDE,
  renderGlobalStyleGuide,
  styleGuideVars,
  type StyleGuide,
} from "./style-guide";

describe("styleGuideVars", () => {
  it("emits a CSS variable for every field", () => {
    const vars = styleGuideVars(DEFAULT_STYLE_GUIDE);
    expect(vars).toContain("--sg-background");
    expect(vars).toContain("--sg-text");
    expect(vars).toContain("--sg-accent");
    expect(vars).toContain("--sg-heading-color");
    expect(vars).toContain("--sg-link");
    expect(vars).toContain("--sg-link-hover");
    expect(vars).toContain("--sg-btn-bg");
    expect(vars).toContain("--sg-btn-text");
    expect(vars).toContain("--sg-heading-font");
    expect(vars).toContain("--sg-body-font");
  });

  it("quotes font stacks so they parse as one value", () => {
    const vars = styleGuideVars({
      ...DEFAULT_STYLE_GUIDE,
      fonts: { heading: "Georgia, serif", body: "Arial, sans-serif" },
    });
    expect(vars).toContain('--sg-heading-font: "Georgia, serif";');
  });

  it("maps background/text to the existing Tailwind theme vars", () => {
    const css = renderGlobalStyleGuide(DEFAULT_STYLE_GUIDE);
    expect(css).toContain("--background: var(--sg-background");
    expect(css).toContain("--foreground: var(--sg-text");
  });
});

describe("renderGlobalStyleGuide", () => {
  it("applies heading font to h1-h6 and body font to body", () => {
    const css = renderGlobalStyleGuide(DEFAULT_STYLE_GUIDE);
    expect(css).toContain("h1, h2, h3, h4, h5, h6");
    expect(css).toContain("font-family: var(--sg-heading-font");
    const bodyRule = css.match(/body\s*\{[^}]*\}/);
    expect(bodyRule).toBeTruthy();
    expect(bodyRule![0]).toContain("font-family: var(--sg-body-font");
  });

  it("styles links, buttons with guide colors", () => {
    const css = renderGlobalStyleGuide(DEFAULT_STYLE_GUIDE);
    expect(css).toContain("a:hover");
    expect(css).toContain("background-color: var(--sg-btn-bg");
    expect(css).toContain("color: var(--sg-btn-text");
  });

  it("reflects a fully customized guide", () => {
    const custom: StyleGuide = {
      ...DEFAULT_STYLE_GUIDE,
      accent: "#e11d48",
      background: "#0f172a",
      fonts: { heading: "Poppins, sans-serif", body: "Lato, sans-serif" },
    };
    const css = renderGlobalStyleGuide(custom);
    expect(css).toContain('--sg-accent: "#e11d48";');
    expect(css).toContain('--sg-background: "#0f172a";');
    expect(css).toContain("font-family: var(--sg-body-font, Arial, Helvetica, sans-serif)");
  });
});
