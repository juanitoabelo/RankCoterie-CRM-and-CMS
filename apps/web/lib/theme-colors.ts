import type { ColorPalette } from "./theme-settings";

/** A single selectable global (site theme) color. */
export interface PaletteColor {
  key: string;
  label: string;
  color: string;
}

/**
 * Fallback palette used when a builder has no theme settings in scope. Mirrors
 * `DEFAULT_THEME_SETTINGS.colors` so the "Global" swatches always render.
 */
export const DEFAULT_GLOBAL_COLORS: PaletteColor[] = [
  { key: "background", label: "Background", color: "#ffffff" },
  { key: "text", label: "Text", color: "#171717" },
  { key: "accent", label: "Accent", color: "#2563eb" },
  { key: "headingColor", label: "Heading", color: "#111827" },
  { key: "linkColor", label: "Link", color: "#2563eb" },
  { key: "buttonBg", label: "Button BG", color: "#2563eb" },
  { key: "buttonText", label: "Button Text", color: "#ffffff" },
  { key: "surface", label: "Surface", color: "#f9fafb" },
  { key: "border", label: "Border", color: "#e5e7eb" },
  { key: "muted", label: "Muted", color: "#6b7280" },
  { key: "success", label: "Success", color: "#16a34a" },
  { key: "warning", label: "Warning", color: "#d97706" },
  { key: "error", label: "Error", color: "#dc2626" },
];

/** Map a site theme palette into the `{ key, label, color }` shape the UI uses. */
export function paletteToThemeColors(colors: ColorPalette): PaletteColor[] {
  return [
    { key: "background", label: "Background", color: colors.background },
    { key: "text", label: "Text", color: colors.text },
    { key: "accent", label: "Accent", color: colors.accent },
    { key: "headingColor", label: "Heading", color: colors.headingColor },
    { key: "linkColor", label: "Link", color: colors.linkColor },
    { key: "linkHoverColor", label: "Link Hover", color: colors.linkHoverColor },
    { key: "buttonBg", label: "Button BG", color: colors.buttonBg },
    { key: "buttonText", label: "Button Text", color: colors.buttonText },
    { key: "buttonBgHover", label: "Button BG Hover", color: colors.buttonBgHover },
    { key: "buttonTextHover", label: "Button Text Hover", color: colors.buttonTextHover },
    { key: "surface", label: "Surface", color: colors.surface },
    { key: "border", label: "Border", color: colors.border },
    { key: "muted", label: "Muted", color: colors.muted },
    { key: "success", label: "Success", color: colors.success },
    { key: "warning", label: "Warning", color: colors.warning },
    { key: "error", label: "Error", color: colors.error },
  ];
}
