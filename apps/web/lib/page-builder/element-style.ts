import { createElement } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cssDeclarations, styleScopeClass } from "./style";

/**
 * Block-specific element style system.
 *
 * Each builder block declares a schema of styleable elements (title, cover,
 * badges…). The Style tab writes per-element, per-breakpoint styles into
 * `props.elementStyles`; renderers tag inner elements with
 * `data-lp-el="<elementKey>"` and emit one scoped stylesheet per block whose
 * selectors read `.pb-<blockId> [data-lp-el="<elementKey>"]`.
 */

export interface ElementStyle {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontSizeUnit?: "px" | "em" | "rem" | "%";
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: string;
  textDecoration?: string;
  textAlign?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundPosition?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
  borderStyle?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  boxShadow?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  gap?: number;
  opacity?: number;
  width?: string;
  maxWidth?: string;
  minHeight?: number;
}

export type ElementBreakpointKey = "mobile" | "sm" | "md" | "lg";

export type ElementBreakpoints = Partial<Record<ElementBreakpointKey, ElementStyle>>;

/** `props.elementStyles` — element key → responsive styles. */
export type ElementStyles = Record<string, ElementBreakpoints | undefined>;

export const ELEMENT_DEVICES: Array<{ key: ElementBreakpointKey; label: string; minWidth: number }> = [
  { key: "mobile", label: "Mobile", minWidth: 0 },
  { key: "sm", label: "Tablet", minWidth: 640 },
  { key: "md", label: "Desktop", minWidth: 768 },
  { key: "lg", label: "Wide", minWidth: 1024 },
];

/** Selector that targets one styleable element inside one block. The
 * `container` element is the block's scope wrapper itself, so it selects the
 * scope class directly; every other element is a tagged descendant. */
export function elementSelector(blockId: string, elementKey: string): string {
  const scope = styleScopeClass(blockId);
  const safeKey = elementKey.replace(/[^a-zA-Z0-9_-]/g, "");
  if (safeKey === "container") return `.${scope}`;
  return `.${scope} [data-lp-el="${safeKey}"]`;
}

/** Fold unit-carrying fields into plain CSS before serializing. */
function toCss(style: ElementStyle | undefined): CSSProperties | undefined {
  if (!style) return undefined;
  const out: Record<string, unknown> = { ...style };
  const unit = style.fontSizeUnit;
  delete out.fontSizeUnit;
  if (style.fontSize !== undefined && style.fontSize !== null) {
    out.fontSize = `${style.fontSize}${unit ?? "px"}`;
  }
  if (
    typeof style.backgroundImage === "string" &&
    style.backgroundImage &&
    !/^(url\(|gradient\(|var\(|linear-|radial-|conic-)/.test(style.backgroundImage)
  ) {
    out.backgroundImage = `url(${style.backgroundImage})`;
  }
  for (const key of Object.keys(out)) {
    if (out[key] === undefined || out[key] === null || out[key] === "") delete out[key];
  }
  if (Object.keys(out).length === 0) return undefined;
  return out as CSSProperties;
}

/**
 * Typography properties that should cascade to the tagged element's
 * descendants. Element groups like "Fact row" / "Form fields" wrap inner
 * nodes (`<dt>`, `<label>`, `<span>`) that carry their own Tailwind
 * `text-*`/`font-*` utilities; a rule scoped to the wrapper alone loses to
 * those utilities because every declaration is direct, so the style appears
 * to do nothing. Emitting these properties against the wrapper AND its
 * descendants (`<selector>, <selector> *`) makes the configured value win.
 *
 * Box/background/border properties deliberately stay on the tagged node only —
 * cascading `padding`/`background`/`width` to `*` would wreck every child.
 */
const CASCADING_TEXT_PROPERTIES = new Set([
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textDecoration",
  "textAlign",
]);

function splitTextAndBox(style: CSSProperties): { text: CSSProperties; box: CSSProperties } {
  const text: Record<string, unknown> = {};
  const box: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(style)) {
    if (CASCADING_TEXT_PROPERTIES.has(key)) text[key] = value;
    else box[key] = value;
  }
  return { text: text as CSSProperties, box: box as CSSProperties };
}

/**
 * Build the scoped stylesheet for a block's element styles. `mobile` is the
 * base rule; larger breakpoints emit min-width media queries so their values
 * persist upward. Returns "" when nothing is configured.
 *
 * Typography declarations also target the element's descendants so inner text
 * nodes with their own utilities still pick up the configured value.
 */
export function renderElementStyles(blockId: string, styles?: ElementStyles): string {
  if (!styles) return "";
  const rules: string[] = [];
  for (const [elementKey, breakpoints] of Object.entries(styles)) {
    if (!breakpoints) continue;
    for (const { key, minWidth } of ELEMENT_DEVICES) {
      const props = toCss(breakpoints[key]);
      if (!props) continue;
      const selector = elementSelector(blockId, elementKey);
      const { text, box } = splitTextAndBox(props);
      const parts: string[] = [];
      const boxCss = cssDeclarations(box);
      if (boxCss) parts.push(`${selector} { ${boxCss} }`);
      const textCss = cssDeclarations(text);
      if (textCss) parts.push(`${selector}, ${selector} * { ${textCss} }`);
      if (parts.length === 0) continue;
      const body = parts.join(" ");
      rules.push(minWidth === 0 ? body : `@media (min-width: ${minWidth}px) { ${body} }`);
    }
  }
  return rules.join("\n");
}

/** Content hash → short suffix, so an edited stylesheet gets a fresh `href`. */
function cssHash(css: string): string {
  let hash = 5381;
  for (let i = 0; i < css.length; i += 1) {
    hash = ((hash << 5) + hash + css.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).slice(0, 6);
}

/**
 * Hoisted `<style>` node for a block's element styles (React 19
 * `href precedence` dedup).
 *
 * The `href` MUST be content-addressed: React dedupes hoisted styles by
 * `href` and does not update the content of a stylesheet whose `href` it has
 * already seen. A stable href would therefore freeze the first value written
 * for an element — later edits (color now, background next) would silently
 * never apply. Hashing the CSS keeps each revision a distinct stylesheet.
 */
export function elementStylesNode(blockId: string, styles?: ElementStyles): ReactNode {
  const css = renderElementStyles(blockId, styles);
  if (!css) return null;
  const safeId = blockId.replace(/[^a-zA-Z0-9_-]/g, "");
  const href = `pb-el-${safeId}-${cssHash(css)}`;
  return createElement(
    "style",
    { href, precedence: "pb-elements", "data-pb-elements": blockId },
    css,
  );
}

/* ── Schema definitions ───────────────────────────────────────────────────── */

export type StyleFieldKind =
  | "color"
  | "number"
  | "select"
  | "font"
  | "align"
  | "weight"
  | "text"
  | "background";

export interface StyleField {
  key: keyof ElementStyle;
  label: string;
  kind: StyleFieldKind;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface StyleElementSchema {
  key: string;
  label: string;
  description?: string;
  fields: StyleField[];
}

export interface BlockStyleSchema {
  blockType: string;
  blockLabel: string;
  elements: StyleElementSchema[];
}

/* ── Reusable field groups ────────────────────────────────────────────────── */

export const TYPOGRAPHY_FIELDS: StyleField[] = [
  { key: "color", label: "Color", kind: "color" },
  { key: "fontFamily", label: "Font", kind: "font" },
  { key: "fontSize", label: "Size", kind: "number", min: 1, max: 999 },
  { key: "fontWeight", label: "Weight", kind: "weight" },
  { key: "lineHeight", label: "Line height", kind: "number", min: 0, max: 4, step: 0.1 },
  { key: "letterSpacing", label: "Letter spacing", kind: "number", min: -5, max: 20, step: 0.5 },
  { key: "textTransform", label: "Transform", kind: "select", options: ["none", "uppercase", "lowercase", "capitalize"].map((v) => ({ value: v, label: v })) },
  { key: "textDecoration", label: "Decoration", kind: "select", options: ["none", "underline", "overline", "line-through"].map((v) => ({ value: v, label: v })) },
  { key: "textAlign", label: "Align", kind: "align" },
];

export const BACKGROUND_FIELDS: StyleField[] = [
  { key: "backgroundColor", label: "Color", kind: "color" },
  { key: "backgroundImage", label: "Image URL", kind: "text", placeholder: "https://… or leave empty" },
  { key: "backgroundPosition", label: "Position", kind: "text", placeholder: "center" },
  { key: "backgroundSize", label: "Size", kind: "select", options: ["auto", "cover", "contain"].map((v) => ({ value: v, label: v })) },
  { key: "backgroundRepeat", label: "Repeat", kind: "select", options: ["repeat", "no-repeat", "repeat-x", "repeat-y"].map((v) => ({ value: v, label: v })) },
];

export const BORDER_FIELDS: StyleField[] = [
  { key: "borderStyle", label: "Style", kind: "select", options: ["none", "solid", "dashed", "dotted", "double"].map((v) => ({ value: v, label: v })) },
  { key: "borderWidth", label: "Width", kind: "number", min: 0, max: 40 },
  { key: "borderColor", label: "Color", kind: "color" },
  { key: "borderRadius", label: "Radius", kind: "number", min: 0, max: 200 },
  { key: "boxShadow", label: "Box shadow", kind: "text", placeholder: "0 4px 12px rgba(0,0,0,.15)" },
];

export const PADDING_FIELDS: StyleField[] = [
  { key: "paddingTop", label: "Top", kind: "number", min: 0, max: 400 },
  { key: "paddingRight", label: "Right", kind: "number", min: 0, max: 400 },
  { key: "paddingBottom", label: "Bottom", kind: "number", min: 0, max: 400 },
  { key: "paddingLeft", label: "Left", kind: "number", min: 0, max: 400 },
];

export const MARGIN_FIELDS: StyleField[] = [
  { key: "marginTop", label: "Top", kind: "number", min: -400, max: 400 },
  { key: "marginRight", label: "Right", kind: "number", min: -400, max: 400 },
  { key: "marginBottom", label: "Bottom", kind: "number", min: -400, max: 400 },
  { key: "marginLeft", label: "Left", kind: "number", min: -400, max: 400 },
];

export const CONTAINER_FIELDS: StyleField[] = [
  ...BACKGROUND_FIELDS,
  ...BORDER_FIELDS,
  ...PADDING_FIELDS,
  ...MARGIN_FIELDS,
  { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 },
  { key: "maxWidth", label: "Max width", kind: "text", placeholder: "e.g. 960px" },
  { key: "minHeight", label: "Min height", kind: "number", min: 0, max: 2000 },
];
