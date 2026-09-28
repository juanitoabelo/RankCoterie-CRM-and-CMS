/**
 * Unit-aware spacing primitives shared by every builder.
 *
 * Persisted shape: each side is either a bare number (legacy, always `px`) or a
 * CSS string carrying its own unit (`"10%"`, `"1.5em"`). This deliberately
 * matches the `SpacingValue` shape the page-builder renderer has always
 * accepted, so `spacingToCss` stays the single conversion point. Blocks are
 * stored as a raw JSON string column with no zod validation, so string units
 * survive a save/load round-trip without a schema change.
 *
 * A side is a number or a string — never a separate `unit` field — because the
 * `SpacingInput` "linked all sides" toggle rebuilds a fresh object on every
 * keystroke. Any sibling field would be silently dropped by that rebuild.
 */

/** Units the spacing dropdowns advertise. */
export const SPACING_UNITS = ["px", "%", "em"] as const;
export type SpacingUnit = (typeof SPACING_UNITS)[number];

export type SpacingSideValue = number | string;

export const SPACING_SIDES = ["top", "right", "bottom", "left"] as const;
export type SpacingSideName = (typeof SPACING_SIDES)[number];

export interface SpacingValues {
  top: SpacingSideValue;
  right: SpacingSideValue;
  bottom: SpacingSideValue;
  left: SpacingSideValue;
}

export const ZERO_SPACING: SpacingValues = { top: 0, right: 0, bottom: 0, left: 0 };

/** Loose shape for reading possibly-absent stored spacing. */
export type PartialSpacing = Partial<SpacingValues> | null | undefined;

export interface ParsedSpacingSide {
  value: number;
  unit: SpacingUnit;
}

const UNIT_SUFFIX = new RegExp(`^(${SPACING_UNITS.join("|")})$`, "i");

/**
 * One stored side to a CSS length. Bare numbers are legacy and always `px`;
 * `0` collapses to `undefined` so the key is omitted entirely rather than
 * emitting a declaration that fights a hard-coded Tailwind default.
 */
export function spacingSideToCss(v: SpacingSideValue | undefined | null): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return v === 0 ? undefined : `${v}px`;
  return v === "" ? undefined : v;
}

/**
 * One side, with a legacy flat-prop fallback (`paddingY`, `paddingTop`).
 *
 * The fallback keys off *presence*, not truthiness: a stored `0` is
 * authoritative and must not silently fall through to the legacy number, which
 * is what a plain `??` chain would do once `0` collapses to no declaration.
 */
export function spacingSideWithFallback(
  v: SpacingSideValue | undefined | null,
  legacy: SpacingSideValue | undefined | null,
): string | undefined {
  if (v === undefined || v === null) return spacingSideToCss(legacy);
  return spacingSideToCss(v);
}

/** The four sides of a spacing group to CSS, omitting collapsed/empty sides. */
export function spacingToCssParts(
  v: PartialSpacing,
): Record<SpacingSideName, string | undefined> {
  return {
    top: spacingSideToCss(v?.top),
    right: spacingSideToCss(v?.right),
    bottom: spacingSideToCss(v?.bottom),
    left: spacingSideToCss(v?.left),
  };
}

/**
 * Split a stored side into its number and unit. Unrecognised input falls back
 * to `fallback` rather than throwing, so hand-edited or legacy data still
 * renders instead of breaking the editor.
 */
export function parseSpacingSide(
  v: SpacingSideValue | undefined | null,
  fallback: SpacingUnit = "px",
): ParsedSpacingSide {
  if (typeof v === "number") {
    return Number.isFinite(v) ? { value: v, unit: "px" } : { value: 0, unit: fallback };
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    const match = trimmed.match(/^(-?[0-9]*\.?[0-9]+)\s*([a-z%]*)$/i);
    if (match) {
      const unit = match[2] && UNIT_SUFFIX.test(match[2]) ? (match[2].toLowerCase() as SpacingUnit) : fallback;
      return { value: parseFloat(match[1]), unit };
    }
    const bare = parseFloat(trimmed);
    if (Number.isFinite(bare)) return { value: bare, unit: fallback };
  }
  return { value: 0, unit: fallback };
}

/** The number to show in a numeric input for a stored side. */
export function spacingSideNumber(v: SpacingSideValue | undefined | null): number {
  return parseSpacingSide(v).value;
}

/**
 * Serialize a side. `px` is written as a bare number so existing rows keep
 * their legacy shape and `spacingSideToCss` keeps collapsing `0`. A non-px unit
 * is always written as a string, including `"0%"`, so that choosing a unit on
 * an all-zero group is detectable afterwards and the dropdown does not snap
 * back to `px`.
 */
export function formatSpacingSide(value: number, unit: SpacingUnit): SpacingSideValue {
  if (unit === "px") return value;
  return `${value}${unit}`;
}

/**
 * The unit a group is currently authored in: the first side carrying an
 * explicit non-`px` unit wins, otherwise `fallback`. This lets a single
 * dropdown drive a group that allows per-side mixed units.
 */
export function detectSpacingUnit(v: PartialSpacing, fallback: SpacingUnit = "px"): SpacingUnit {
  for (const side of SPACING_SIDES) {
    const raw = v?.[side];
    if (typeof raw === "string") {
      const { unit } = parseSpacingSide(raw, fallback);
      if (unit !== "px") return unit;
    }
  }
  return fallback;
}

/** Rewrite every side to `unit`, preserving each side's numeric part. */
export function retuneSpacing(v: PartialSpacing, unit: SpacingUnit): SpacingValues {
  const out = {} as SpacingValues;
  for (const side of SPACING_SIDES) {
    out[side] = formatSpacingSide(parseSpacingSide(v?.[side]).value, unit);
  }
  return out;
}

/**
 * Set one side, keeping the group's authored unit. When `linked`, the value is
 * applied to all four sides — and re-expressed in the current unit, which is
 * the step that would otherwise drop `"10%"` down to a bare `10` (px) the
 * moment the user types.
 */
export function setSpacingSide(
  v: PartialSpacing,
  side: SpacingSideName,
  raw: number,
  linked: boolean,
): SpacingValues {
  const unit = detectSpacingUnit(v);
  const next = {} as SpacingValues;
  for (const s of SPACING_SIDES) {
    next[s] = linked ? formatSpacingSide(raw, unit) : (v?.[s] ?? 0);
  }
  if (!linked) next[side] = formatSpacingSide(raw, unit);
  return next;
}
