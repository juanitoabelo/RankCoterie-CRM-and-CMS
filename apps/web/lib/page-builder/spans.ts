const BASE_SPAN_CLASS: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};

const MD_SPAN_CLASS: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

const LG_SPAN_CLASS: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

export interface ColumnWidths {
  mobile: number;
  tablet: number;
  desktop: number;
}

const DEFAULT_SPAN = 6;

/** Clamp a span value to the 1–12 grid (falls back to a default for invalid input). */
function clampSpan(value: number | undefined, fallback = DEFAULT_SPAN): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(12, Math.max(1, Math.round(n)));
}

/**
 * Resolve the effective width for every breakpoint of a column.
 *
 * - desktop → the column's `span`
 * - tablet  → the column's `spanMd`, falling back to the desktop `span`
 * - mobile  → the column's `spanSm`; when unset, uses the row's `stackOnMobile`
 *   rule (12/12 when stacking, otherwise the desktop span).
 */
export function resolveColumnWidths(
  column: { span?: number; spanMd?: number; spanSm?: number },
  stackOnMobile: boolean,
): ColumnWidths {
  const desktop = clampSpan(column.span);
  const tablet = clampSpan(column.spanMd, desktop);
  const mobile = clampSpan(
    column.spanSm,
    stackOnMobile ? 12 : desktop,
  );
  return { mobile, tablet, desktop };
}

/**
 * Tailwind classes for a rendered (public) page column.
 *
 * Mobile is the base class, tablet uses the `md:` breakpoint (≥768px) and
 * desktop uses `lg:` (≥1024px).
 */
export function renderColumnSpanClass(widths: ColumnWidths): string {
  return [
    BASE_SPAN_CLASS[widths.mobile] ?? "col-span-12",
    MD_SPAN_CLASS[widths.tablet] ?? "md:col-span-12",
    LG_SPAN_CLASS[widths.desktop] ?? "lg:col-span-12",
  ].join(" ");
}

/**
 * Fixed (non-responsive) class for a column inside the builder canvas, resolved
 * to the width of the active viewport toggle. This makes the canvas preview
 * accurate to the selected device regardless of the real browser width.
 */
export function canvasColumnSpanClass(
  widths: ColumnWidths,
  viewport: "desktop" | "tablet" | "mobile",
): string {
  const width = widths[viewport];
  return BASE_SPAN_CLASS[width] ?? "col-span-12";
}