/**
 * Canopy V2 — Custom Fonts.
 *
 * Fonts uploaded under Theme Settings → Custom Fonts. Every uploaded file is
 * stored as a `CustomFont` row and surfaced three ways:
 *
 *   1. as an `@font-face` rule emitted into the site `<head>` (see
 *      `renderCustomFontFaces`), so public pages can actually load it;
 *   2. as a CSS font stack option appended to every font-family dropdown in the
 *      admin (see `useFontFamilyOptions`), so it can be picked per block;
 *   3. grouped by family, so a family uploaded with several weights still shows
 *      up as a single dropdown entry.
 *
 * This module is intentionally free of database imports so client components
 * can share the pure helpers. The loader lives in `custom-fonts.server.ts`.
 */

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                      */
/* ──────────────────────────────────────────────────────────────────────────── */

/** A dropdown entry. `value` is the raw CSS font stack persisted in settings. */
export interface FontFamilyOption {
  value: string;
  label: string;
  /** Marks an option that came from an upload, for grouping/preview styling. */
  custom?: boolean;
  /** Declared monospace for uploads; built-ins sniff their stack instead. */
  mono?: boolean;
}

/** A `CustomFont` row, flattened for transport to the client. */
export interface CustomFontFile {
  id: string;
  family: string;
  weight: string;
  style: string;
  mono: boolean;
  mimeType: string;
  size: number;
  filename: string | null;
  createdAt: string;
}

/** Weight sentinel for variable fonts — expands to the full 100–900 range. */
export const VARIABLE_WEIGHT = "variable";

export const FONT_WEIGHTS: Array<{ value: string; label: string }> = [
  { value: "variable", label: "Variable" },
  { value: "100", label: "100 · Thin" },
  { value: "200", label: "200 · Extra Light" },
  { value: "300", label: "300 · Light" },
  { value: "400", label: "400 · Regular" },
  { value: "500", label: "500 · Medium" },
  { value: "600", label: "600 · Semi Bold" },
  { value: "700", label: "700 · Bold" },
  { value: "800", label: "800 · Extra Bold" },
  { value: "900", label: "900 · Black" },
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Upload validation                                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export const MAX_FONT_BYTES = 5 * 1024 * 1024;

export const FONT_MIME_TYPES = [
  "font/woff2",
  "font/woff",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/font-sfnt",
  "application/vnd.ms-fontobject",
  "application/x-font-ttf",
  "application/x-font-opentype",
] as const;

/** The subset browsers actually understand in `@font-face src: format()`. */
function formatFor(mimeType: string): string {
  if (mimeType === "font/woff2") return "woff2";
  if (mimeType === "font/woff" || mimeType === "application/font-woff") return "woff";
  if (mimeType === "font/otf" || mimeType === "application/x-font-opentype") return "opentype";
  return "truetype";
}

/** Magic bytes per container, so a renamed `.exe` can't pose as a font. */
function sniffFontFormat(bytes: Buffer): "woff2" | "woff" | "ttf" | "otf" | null {
  if (bytes.length < 4) return null;
  if (bytes.toString("latin1", 0, 4) === "wOF2") return "woff2";
  if (bytes.toString("latin1", 0, 4) === "wOFF") return "woff";
  if (bytes.toString("latin1", 0, 4) === "OTTO") return "otf";
  // TrueType: 0x00010000, or "true"/"ttcf" for older/multi-collection files.
  const head = bytes.readUInt32BE(0);
  const tag = bytes.toString("latin1", 0, 4);
  if (head === 0x00010000 || tag === "true" || tag === "ttcf") return "ttf";
  return null;
}

/** Canonical MIME type for a container we recognised. */
const MIME_BY_FORMAT: Record<NonNullable<ReturnType<typeof sniffFontFormat>>, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  otf: "font/otf",
  ttf: "font/ttf",
};

/** Validate bytes + declared type, returning the canonical MIME or an error. */
export function validateFontBytes(
  bytes: Buffer,
  declaredMime: string,
): { ok: true; mimeType: string } | { ok: false; error: string } {
  if (bytes.length === 0) {
    return { ok: false, error: "The uploaded file is empty." };
  }
  if (bytes.length > MAX_FONT_BYTES) {
    return { ok: false, error: "Font files must be 5 MB or smaller." };
  }
  const sniffed = sniffFontFormat(bytes);
  if (!sniffed) {
    return { ok: false, error: "That file is not a valid WOFF2, WOFF, TTF, or OTF font." };
  }
  // A declared type that contradicts the actual bytes is a red flag; a generic
  // one (octet-stream) is just a browser quirk and is tolerated.
  if (
    declaredMime &&
    declaredMime !== "application/octet-stream" &&
    !(FONT_MIME_TYPES as readonly string[]).includes(declaredMime)
  ) {
    return { ok: false, error: `Unsupported file type: ${declaredMime}.` };
  }
  return { ok: true, mimeType: MIME_BY_FORMAT[sniffed] };
}

/**
 * Reduce a user-typed family name to something that is safe to embed in a CSS
 * string. Everything outside `[A-Za-z0-9 _-]` is dropped, which makes CSS
 * injection structurally impossible rather than merely unlikely.
 */
export function sanitizeFontFamily(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, " ").trim();
}

export const MAX_FAMILY_LENGTH = 60;

/** Validate a user-supplied family name, returning the clean value or an error. */
export function validateFontFamily(raw: string): { ok: true; family: string } | { ok: false; error: string } {
  const family = sanitizeFontFamily(raw ?? "");
  if (!family) {
    return { ok: false, error: "Enter a font family name (letters, numbers, spaces, hyphens)." };
  }
  if (family.length > MAX_FAMILY_LENGTH) {
    return { ok: false, error: `Font family names are limited to ${MAX_FAMILY_LENGTH} characters.` };
  }
  return { ok: true, family };
}

/** Validate a weight value from a form or API payload. */
export function validateFontWeight(raw: string): { ok: true; weight: string } | { ok: false; error: string } {
  const weight = (raw ?? "").trim();
  if (weight === VARIABLE_WEIGHT) return { ok: true, weight };
  if (/^[1-9]00$/.test(weight)) return { ok: true, weight };
  return { ok: false, error: "Font weight must be 100–900 or \"variable\"." };
}

/** Validate a style value from a form or API payload. */
export function validateFontStyle(raw: string): "normal" | "italic" {
  return (raw ?? "").trim().toLowerCase() === "italic" ? "italic" : "normal";
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  CSS generation                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */

/** The CSS stack stored as a font option's value, e.g. `'Canopy Display', system-ui, sans-serif`. */
export function fontStackFor(family: string, mono = false): string {
  const fallback = mono ? "ui-monospace, monospace" : "system-ui, sans-serif";
  return `'${sanitizeFontFamily(family)}', ${fallback}`;
}

/** Path the font bytes are served from. */
export function fontFileUrl(id: string): string {
  return `/api/custom-fonts/${id}`;
}

/**
 * Build one `@font-face` rule per uploaded file. Variable fonts get a
 * `font-weight` range so a single file covers every weight.
 */
export function renderFontFace(font: CustomFontFile): string {
  const family = sanitizeFontFamily(font.family);
  const weight = font.weight === VARIABLE_WEIGHT ? "100 900" : font.weight;
  return [
    "@font-face {",
    `  font-family: '${family}';`,
    `  src: url('${fontFileUrl(font.id)}') format('${formatFor(font.mimeType)}');`,
    `  font-weight: ${weight};`,
    `  font-style: ${font.style === "italic" ? "italic" : "normal"};`,
    "  font-display: swap;",
    "}",
  ].join("\n");
}

/** Build every `@font-face` rule for the tenant's uploaded fonts. */
export function renderCustomFontFaces(fonts: CustomFontFile[]): string {
  if (!fonts.length) return "";
  return fonts.map(renderFontFace).join("\n");
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Dropdown options                                                           */
/* ──────────────────────────────────────────────────────────────────────────── */

/** Unique family names, in first-upload order. */
export function customFontFamilies(fonts: CustomFontFile[]): string[] {
  const seen = new Set<string>();
  const families: string[] = [];
  for (const font of fonts) {
    const family = sanitizeFontFamily(font.family);
    if (!family || seen.has(family)) continue;
    seen.add(family);
    families.push(family);
  }
  return families;
}

/**
 * Turn uploaded fonts into dropdown options, appended after the built-ins.
 * A family uploaded at several weights yields a single entry; it is `mono` if
 * any of its files is.
 */
export function customFontOptions(fonts: CustomFontFile[]): FontFamilyOption[] {
  return customFontFamilies(fonts).map((family) => {
    const mono = fonts.some((f) => f.mono && sanitizeFontFamily(f.family) === family);
    return {
      value: fontStackFor(family, mono),
      label: family,
      custom: true,
      mono,
    };
  });
}
