import type { StyleBreakpoints, TypographyStyle } from "./types";

/**
 * Font family presets shown in the style guide editor. The stored value is the
 * raw CSS font stack; `FONT_FAMILY_PRESETS` maps a friendly key to a real stack.
 */
export const FONT_FAMILY_PRESETS: Array<{ key: string; label: string; value: string }> = [
  { key: "sans", label: "System Sans", value: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { key: "arial", label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { key: "helvetica", label: "Helvetica", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { key: "geist", label: "Geist Sans", value: "var(--font-geist-sans), system-ui, sans-serif" },
  { key: "inter", label: "Inter", value: "'Inter', system-ui, sans-serif" },
  { key: "roboto", label: "Roboto", value: "'Roboto', system-ui, sans-serif" },
  { key: "open-sans", label: "Open Sans", value: "'Open Sans', system-ui, sans-serif" },
  { key: "lato", label: "Lato", value: "'Lato', system-ui, sans-serif" },
  { key: "montserrat", label: "Montserrat", value: "'Montserrat', system-ui, sans-serif" },
  { key: "poppins", label: "Poppins", value: "'Poppins', system-ui, sans-serif" },
  { key: "raleway", label: "Raleway", value: "'Raleway', system-ui, sans-serif" },
  { key: "nunito", label: "Nunito", value: "'Nunito', system-ui, sans-serif" },
  { key: "serif", label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { key: "playfair", label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
  { key: "lora", label: "Lora", value: "'Lora', Georgia, serif" },
  { key: "merriweather", label: "Merriweather", value: "'Merriweather', Georgia, serif" },
  { key: "libre-baskerville", label: "Libre Baskerville", value: "'Libre Baskerville', Georgia, serif" },
  { key: "mono", label: "Monospace", value: "var(--font-geist-mono), ui-monospace, monospace" },
  { key: "fira", label: "Fira Code", value: "'Fira Code', ui-monospace, monospace" },
  { key: "jetbrains", label: "JetBrains Mono", value: "'JetBrains Mono', ui-monospace, monospace" },
  { key: "caveat", label: "Caveat (handwriting)", value: "'Caveat', cursive" },
  { key: "pacifico", label: "Pacifico (handwriting)", value: "'Pacifico', cursive" },
  { key: "custom", label: "Custom…", value: "" },
];

/** Breakpoint order + the Tailwind min-width media query for each. */
export const STYLE_BREAKPOINTS: Array<{
  key: keyof StyleBreakpoints;
  label: string;
  minWidth: number;
}> = [
  { key: "mobile", label: "Mobile", minWidth: 0 },
  { key: "sm", label: "Tablet (sm)", minWidth: 640 },
  { key: "md", label: "Desktop (md)", minWidth: 768 },
  { key: "lg", label: "Wide (lg)", minWidth: 1024 },
];

/**
 * Map a `StyleBreakpoints` value to the CSS declarations that apply per
 * breakpoint. Missing per-breakpoint values fall through to the next larger
 * breakpoint; `mobile` applies to all sizes unless overridden.
 */
export function cssForBreakpoint(style: TypographyStyle | undefined): string {
  if (!style) return "";
  const parts: string[] = [];
  if (style.color) parts.push(`color: ${style.color} !important;`);
  if (style.fontFamily) parts.push(`font-family: ${style.fontFamily};`);
  if (style.fontSize) parts.push(`font-size: ${style.fontSize}${style.fontSizeUnit ?? "px"};`);
  return parts.join(" ");
}

/**
 * Build a `<style>` block body scoped to `pb-<blockId>` that applies the style
 * guide across breakpoints. Returns empty when no style is configured, so the
 * renderers can skip emitting a style tag entirely.
 *
 * Semantics: `mobile` is the base (applies at every size unless a larger
 * breakpoint overrides it). `sm`/`md`/`lg` emit min-width media queries, so
 * their values persist at every larger size automatically. Each configured
 * breakpoint only sets the values a user provided for that exact width.
 */
export function renderStyleGuide(blockId: string, style?: StyleBreakpoints): string {
  if (!style) return "";
  const scope = styleScopeClass(blockId);
  const selector = `.${scope}, .${scope} *`;
  const rules: string[] = [];

  STYLE_BREAKPOINTS.forEach(({ key, minWidth }) => {
    const css = cssForBreakpoint(style[key]);
    if (!css.trim()) return;
    if (minWidth === 0) {
      rules.push(`${selector} { ${css} }`);
    } else {
      rules.push(`@media (min-width: ${minWidth}px) { ${selector} { ${css} } }`);
    }
  });
  return rules.join("\n");
}

/** Stable class-name wrapper used to scope generated style-guide CSS to one block. */
export function styleScopeClass(blockId: string): string {
  return `pb-${blockId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}