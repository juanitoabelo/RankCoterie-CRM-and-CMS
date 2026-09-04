/**
 * Canopy V2 — Global Style Guide.
 *
 * Site-wide look-and-feel backed by the per-tenant `Tenant.theme` JSON field.
 * Unlike the per-block style guide (`lib/page-builder/style.ts`), this guide is
 * global: it sets colors, fonts for headings/body/buttons/links, and a default
 * font family. It emits CSS at `:root`/site scope so every public page inherits
 * it, and per-block styles override it where they are set.
 */

export interface StyleGuideFonts {
  /** Font family for heading tags (h1–h6). */
  heading: string;
  /** Font family for body text / descriptions. */
  body: string;
}

export const FONT_STACKS = [
  { label: "System (Georgia)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans (Arial/Helvetica)", value: "Arial, Helvetica, sans-serif" },
  { label: "ui-sans-serif (Tailwind default)", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Inter", value: "'Inter', 'Helvetica Neue', Arial, sans-serif" },
  { label: "Lato", value: "'Lato', Arial, sans-serif" },
  { label: "Poppins", value: "'Poppins', Arial, sans-serif" },
  { label: "Merriweather", value: "'Merriweather', Georgia, serif" },
] as const;

export interface StyleGuide {
  /** Page / site background color. */
  background: string;
  /** Default text (foreground) color. */
  text: string;
  /** Brand / accent color (buttons, highlights, active nav). */
  accent: string;
  /** Heading color (falls back to `text` when empty). */
  headingColor: string;
  fonts: StyleGuideFonts;
  /** Link color. */
  linkColor: string;
  /** Link hover color. */
  linkHoverColor: string;
  /** Button background color (falls back to `accent` when empty). */
  buttonBg: string;
  /** Button text color. */
  buttonText: string;
}

export const DEFAULT_STYLE_GUIDE: StyleGuide = {
  background: "#ffffff",
  text: "#171717",
  accent: "#2563eb",
  headingColor: "#111827",
  fonts: {
    heading: "ui-sans-serif, system-ui, sans-serif",
    body: "Arial, Helvetica, sans-serif",
  },
  linkColor: "#2563eb",
  linkHoverColor: "#1d4ed8",
  buttonBg: "#2563eb",
  buttonText: "#ffffff",
};

function esc(s: string): string {
  return s.replace(/[^a-zA-Z0-9#(),.'\s_-]/g, "");
}

const SAFE_TAGS = new Set([
  "a", "abbr", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3",
  "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "span", "strong",
  "table", "tbody", "td", "th", "thead", "tr", "ul",
]);
const SAFE_ATTRS = new Set(["href", "src", "alt", "title", "class", "id", "colspan", "rowspan"]);
const UNSAFE_PROTOCOLS = /javascript:|data:|vbscript:/i;

function stripTags(html: string): string {
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    if (!SAFE_TAGS.has(tag.toLowerCase())) return "";
    return match;
  });
}

function stripUnsafeAttrs(html: string): string {
  return html.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tag, attrs) => {
    if (!attrs) return match;
    const cleaned = attrs.replace(/\s+([a-zA-Z-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g, (m: string, attr: string) => {
      if (!SAFE_ATTRS.has(attr.toLowerCase())) return "";
      if (UNSAFE_PROTOCOLS.test(m)) return "";
      return m;
    });
    return `<${tag}${cleaned}>`;
  });
}

export function sanitizeHtml(html: string): string {
  let result = html;
  result = result.replace(/<script[\s\S]*?<\/script>/gi, "");
  result = result.replace(/<style[\s\S]*?<\/style>/gi, "");
  result = result.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  result = result.replace(/<object[\s\S]*?<\/object>/gi, "");
  result = result.replace(/<embed[\s\S]*?\/?>/gi, "");
  result = result.replace(/<!--[\s\S]*?-->/g, "");
  result = stripTags(result);
  result = stripUnsafeAttrs(result);
  return result;
}

/**
 * Flatten a `StyleGuide` into CSS variable declarations for `:root`. Fonts are
 * quoted so multi-family stacks parse as a single value.
 */
export function styleGuideVars(guide: StyleGuide): string {
  const lines: string[] = [];
  const push = (varName: string, value: string) => {
    if (value) lines.push(`  ${varName}: "${esc(value)}";`);
  };
  push("--sg-background", guide.background);
  push("--sg-text", guide.text);
  push("--sg-accent", guide.accent);
  push("--sg-heading-color", guide.headingColor);
  push("--sg-link", guide.linkColor);
  push("--sg-link-hover", guide.linkHoverColor);
  push("--sg-btn-bg", guide.buttonBg);
  push("--sg-btn-text", guide.buttonText);
  push("--sg-heading-font", guide.fonts.heading);
  push("--sg-body-font", guide.fonts.body);
  return lines.join("\n");
}

/**
 * Generate the full global CSS block for a style guide. Sprinkles reusable
 * rules so Tailwind utilities and the hard-coded block renderers pick the
 * guide up, while the `--sg-*` variables let components reference values.
 */
export function renderGlobalStyleGuide(guide: StyleGuide): string {
  const vars = styleGuideVars(guide);
  const headingFont = `var(--sg-heading-font, ui-sans-serif, system-ui, sans-serif)`;
  const bodyFont = `var(--sg-body-font, Arial, Helvetica, sans-serif)`;
  const link = `var(--sg-link)`;
  const linkHover = `var(--sg-link-hover)`;
  const btnBg = `var(--sg-btn-bg, var(--sg-accent))`;
  const btnText = `var(--sg-btn-text, #ffffff)`;

  return `:root {
${vars}
  --background: var(--sg-background, #ffffff);
  --foreground: var(--sg-text, #171717);
}
body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: ${bodyFont};
}
h1, h2, h3, h4, h5, h6 {
  font-family: ${headingFont};
  color: var(--sg-heading-color, var(--foreground));
}
a {
  color: ${link};
}
a:hover {
  color: ${linkHover};
}
.btn, .sg-btn {
  display: inline-block;
  background-color: ${btnBg};
  color: ${btnText};
}
`;
}
