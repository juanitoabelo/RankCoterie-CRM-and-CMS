/**
 * Canopy V2 — Frontend Theme Settings.
 *
 * Global theme configuration stored in `Tenant.theme.themeSettings`.
 * Controls site-wide appearance: colors, fonts, layout, and responsive behavior.
 * Unlike the per-block style guide, these are global defaults that blocks inherit.
 */

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Color Palette                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface ColorPalette {
  background: string;
  text: string;
  accent: string;
  headingColor: string;
  linkColor: string;
  linkHoverColor: string;
  buttonBg: string;
  buttonText: string;
  surface: string;
  border: string;
  muted: string;
  success: string;
  warning: string;
  error: string;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Font Settings                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface FontSizeSet {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  body: number;
  small: number;
}

export interface FontSettings {
  heading: string;
  body: string;
  mono: string;
  sizes: {
    mobile: FontSizeSet;
    tablet: FontSizeSet;
    desktop: FontSizeSet;
  };
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Layout Settings                                                           */
/* ──────────────────────────────────────────────────────────────────────────── */

export type HeaderStyle = "default" | "centered" | "minimal" | "full-width";
export type FooterStyle = "default" | "centered" | "minimal" | "full-width";
export type SidebarPosition = "none" | "left" | "right";
export type ContentSpacing = "compact" | "default" | "relaxed";

export interface LayoutSettings {
  maxWidth: string;
  containerPadding: string;
  headerStyle: HeaderStyle;
  footerStyle: FooterStyle;
  sidebarPosition: SidebarPosition;
  contentSpacing: ContentSpacing;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Responsive Settings                                                       */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface ResponsiveSettings {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  containerPadding: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Combined Theme Settings                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface ThemeSettings {
  activePreset: string | null;
  colors: ColorPalette;
  fonts: FontSettings;
  layout: LayoutSettings;
  responsive: ResponsiveSettings;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Defaults                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export const DEFAULT_COLOR_PALETTE: ColorPalette = {
  background: "#ffffff",
  text: "#171717",
  accent: "#2563eb",
  headingColor: "#111827",
  linkColor: "#2563eb",
  linkHoverColor: "#1d4ed8",
  buttonBg: "#2563eb",
  buttonText: "#ffffff",
  surface: "#f9fafb",
  border: "#e5e7eb",
  muted: "#6b7280",
  success: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
};

export const DEFAULT_FONT_SIZES: Record<"mobile" | "tablet" | "desktop", FontSizeSet> = {
  mobile: { h1: 28, h2: 24, h3: 20, h4: 18, body: 16, small: 14 },
  tablet: { h1: 36, h2: 30, h3: 24, h4: 20, body: 16, small: 14 },
  desktop: { h1: 48, h2: 36, h3: 28, h4: 22, body: 16, small: 14 },
};

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  heading: "var(--font-inter), system-ui, sans-serif",
  body: "var(--font-inter), system-ui, sans-serif",
  mono: "var(--font-geist-mono), ui-monospace, monospace",
  sizes: DEFAULT_FONT_SIZES,
};

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  maxWidth: "1200px",
  containerPadding: "24px",
  headerStyle: "default",
  footerStyle: "default",
  sidebarPosition: "none",
  contentSpacing: "default",
};

export const DEFAULT_RESPONSIVE_SETTINGS: ResponsiveSettings = {
  breakpoints: {
    mobile: 640,
    tablet: 1024,
    desktop: 1280,
  },
  containerPadding: {
    mobile: "16px",
    tablet: "24px",
    desktop: "32px",
  },
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  activePreset: "default",
  colors: DEFAULT_COLOR_PALETTE,
  fonts: DEFAULT_FONT_SETTINGS,
  layout: DEFAULT_LAYOUT_SETTINGS,
  responsive: DEFAULT_RESPONSIVE_SETTINGS,
};

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Theme Presets                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ColorPalette;
  fonts: Pick<FontSettings, "heading" | "body" | "mono">;
  layout: LayoutSettings;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean, professional look with Inter font",
    colors: DEFAULT_COLOR_PALETTE,
    fonts: {
      heading: "var(--font-inter), system-ui, sans-serif",
      body: "var(--font-inter), system-ui, sans-serif",
      mono: "var(--font-geist-mono), ui-monospace, monospace",
    },
    layout: DEFAULT_LAYOUT_SETTINGS,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Light, airy design with Inter and neutral tones",
    colors: {
      ...DEFAULT_COLOR_PALETTE,
      accent: "#111827",
      buttonBg: "#111827",
      linkColor: "#111827",
      linkHoverColor: "#374151",
      surface: "#ffffff",
      border: "#f3f4f6",
    },
    fonts: {
      heading: "var(--font-inter), system-ui, sans-serif",
      body: "var(--font-inter), system-ui, sans-serif",
      mono: "var(--font-geist-mono), ui-monospace, monospace",
    },
    layout: { ...DEFAULT_LAYOUT_SETTINGS, maxWidth: "1024px" },
  },
  {
    id: "bold",
    name: "Bold",
    description: "High contrast with Montserrat and Open Sans",
    colors: {
      ...DEFAULT_COLOR_PALETTE,
      accent: "#dc2626",
      buttonBg: "#dc2626",
      linkColor: "#dc2626",
      linkHoverColor: "#b91c1c",
      headingColor: "#000000",
      surface: "#fef2f2",
    },
    fonts: {
      heading: "'Montserrat', system-ui, sans-serif",
      body: "'Open Sans', system-ui, sans-serif",
      mono: "'Fira Code', ui-monospace, monospace",
    },
    layout: { ...DEFAULT_LAYOUT_SETTINGS, maxWidth: "1400px" },
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Business formal with Poppins and Lato",
    colors: {
      ...DEFAULT_COLOR_PALETTE,
      accent: "#1e40af",
      buttonBg: "#1e40af",
      linkColor: "#1e40af",
      linkHoverColor: "#1e3a8a",
      surface: "#eff6ff",
      border: "#dbeafe",
    },
    fonts: {
      heading: "'Poppins', system-ui, sans-serif",
      body: "'Lato', system-ui, sans-serif",
      mono: "'Fira Code', ui-monospace, monospace",
    },
    layout: DEFAULT_LAYOUT_SETTINGS,
  },
  {
    id: "warm",
    name: "Warm",
    description: "Friendly, inviting design with Playfair Display and Lato",
    colors: {
      ...DEFAULT_COLOR_PALETTE,
      accent: "#d97706",
      buttonBg: "#d97706",
      buttonText: "#ffffff",
      linkColor: "#d97706",
      linkHoverColor: "#b45309",
      headingColor: "#78350f",
      surface: "#fffbeb",
      border: "#fef3c7",
    },
    fonts: {
      heading: "'Playfair Display', Georgia, serif",
      body: "'Lato', system-ui, sans-serif",
      mono: "'Fira Code', ui-monospace, monospace",
    },
    layout: { ...DEFAULT_LAYOUT_SETTINGS, contentSpacing: "relaxed" },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Tech-forward with Geist fonts and purple accents",
    colors: {
      ...DEFAULT_COLOR_PALETTE,
      accent: "#7c3aed",
      buttonBg: "#7c3aed",
      linkColor: "#7c3aed",
      linkHoverColor: "#6d28d9",
      surface: "#f5f3ff",
      border: "#ede9fe",
    },
    fonts: {
      heading: "var(--font-geist-sans), system-ui, sans-serif",
      body: "var(--font-geist-sans), system-ui, sans-serif",
      mono: "var(--font-geist-mono), ui-monospace, monospace",
    },
    layout: { ...DEFAULT_LAYOUT_SETTINGS, maxWidth: "1200px", headerStyle: "minimal" },
  },
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Font Family Options                                                       */
/* ──────────────────────────────────────────────────────────────────────────── */

export const FONT_FAMILY_OPTIONS = [
  // Modern Sans-Serif (Professional)
  { label: "Inter", value: "'Inter', system-ui, sans-serif" },
  { label: "DM Sans", value: "'DM Sans', system-ui, sans-serif" },
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { label: "Manrope", value: "'Manrope', system-ui, sans-serif" },
  { label: "Outfit", value: "'Outfit', system-ui, sans-serif" },
  
  // Classic Sans-Serif
  { label: "Roboto", value: "'Roboto', system-ui, sans-serif" },
  { label: "Open Sans", value: "'Open Sans', system-ui, sans-serif" },
  { label: "Lato", value: "'Lato', system-ui, sans-serif" },
  { label: "Montserrat", value: "'Montserrat', system-ui, sans-serif" },
  { label: "Poppins", value: "'Poppins', system-ui, sans-serif" },
  { label: "Raleway", value: "'Raleway', system-ui, sans-serif" },
  { label: "Nunito", value: "'Nunito', system-ui, sans-serif" },
  
  // Geist & System
  { label: "Geist Sans", value: "var(--font-geist-sans), system-ui, sans-serif" },
  { label: "System Sans", value: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { label: "Helvetica", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  
  // Elegant Serif (For headings/editorial)
  { label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
  { label: "Lora", value: "'Lora', Georgia, serif" },
  { label: "Merriweather", value: "'Merriweather', Georgia, serif" },
  { label: "Libre Baskerville", value: "'Libre Baskerville', Georgia, serif" },
  { label: "Source Serif 4", value: "'Source Serif 4', Georgia, serif" },
  { label: "Crimson Pro", value: "'Crimson Pro', Georgia, serif" },
  
  // Monospace
  { label: "JetBrains Mono", value: "'JetBrains Mono', ui-monospace, monospace" },
  { label: "Fira Code", value: "'Fira Code', ui-monospace, monospace" },
  { label: "Geist Mono", value: "var(--font-geist-mono), ui-monospace, monospace" },
  
  // Custom
  { label: "Custom...", value: "" },
] as const;

/* ──────────────────────────────────────────────────────────────────────────── */
/*  CSS Generation                                                            */
/* ──────────────────────────────────────────────────────────────────────────── */

function esc(s: string): string {
  return s.replace(/[^a-zA-Z0-9#(),.'\s_-]/g, "");
}

/**
 * Generate CSS variables and rules from theme settings.
 * Injected into the site layout <style> tag.
 */
export function renderThemeSettingsCSS(settings: ThemeSettings): string {
  const { colors, fonts, layout, responsive } = settings;
  const { breakpoints, containerPadding } = responsive;

  const spacingClass =
    layout.contentSpacing === "compact"
      ? "gap-4"
      : layout.contentSpacing === "relaxed"
        ? "gap-8"
        : "gap-6";

  const googleFonts = collectGoogleFonts(fonts);
  const fontLink = googleFonts.length
    ? `@import url('https://fonts.googleapis.com/css2?${googleFonts.map((f) => `family=${encodeURIComponent(f)}`).join("&")}&display=swap');\n`
    : "";

  return `${fontLink}:root {
  --theme-bg: "${esc(colors.background)}";
  --theme-text: "${esc(colors.text)}";
  --theme-accent: "${esc(colors.accent)}";
  --theme-heading: "${esc(colors.headingColor)}";
  --theme-link: "${esc(colors.linkColor)}";
  --theme-link-hover: "${esc(colors.linkHoverColor)}";
  --theme-btn-bg: "${esc(colors.buttonBg)}";
  --theme-btn-text: "${esc(colors.buttonText)}";
  --theme-surface: "${esc(colors.surface)}";
  --theme-border: "${esc(colors.border)}";
  --theme-muted: "${esc(colors.muted)}";
  --theme-success: "${esc(colors.success)}";
  --theme-warning: "${esc(colors.warning)}";
  --theme-error: "${esc(colors.error)}";
  --theme-heading-font: ${esc(fonts.heading)};
  --theme-body-font: ${esc(fonts.body)};
  --theme-mono-font: ${esc(fonts.mono)};
  --theme-max-width: ${layout.maxWidth};
  --theme-container-padding: ${layout.containerPadding};
  --theme-bp-mobile: ${breakpoints.mobile}px;
  --theme-bp-tablet: ${breakpoints.tablet}px;
  --theme-bp-desktop: ${breakpoints.desktop}px;
  --theme-cp-mobile: ${containerPadding.mobile};
  --theme-cp-tablet: ${containerPadding.tablet};
  --theme-cp-desktop: ${containerPadding.desktop};
  --theme-spacing: ${spacingClass};
}
body {
  background-color: var(--theme-bg, #ffffff);
  color: var(--theme-text, #171717);
  font-family: var(--theme-body-font, Arial, Helvetica, sans-serif);
}
h1, h2, h3, h4, h5, h6 {
  font-family: var(--theme-heading-font, ui-sans-serif, system-ui, sans-serif);
  color: var(--theme-heading, #111827);
}
a { color: var(--theme-link, #2563eb); }
a:hover { color: var(--theme-link-hover, #1d4ed8); }
.btn, .sg-btn {
  display: inline-block;
  background-color: var(--theme-btn-bg, #2563eb);
  color: var(--theme-btn-text, #ffffff);
}
.theme-container {
  max-width: var(--theme-max-width, 1200px);
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--theme-container-padding, 24px);
  padding-right: var(--theme-container-padding, 24px);
}
@media (max-width: ${breakpoints.mobile}px) {
  .theme-container {
    padding-left: var(--theme-cp-mobile, 16px);
    padding-right: var(--theme-cp-mobile, 16px);
  }
  h1 { font-size: ${fonts.sizes.mobile.h1}px; }
  h2 { font-size: ${fonts.sizes.mobile.h2}px; }
  h3 { font-size: ${fonts.sizes.mobile.h3}px; }
  h4 { font-size: ${fonts.sizes.mobile.h4}px; }
  body { font-size: ${fonts.sizes.mobile.body}px; }
  small { font-size: ${fonts.sizes.mobile.small}px; }
}
@media (min-width: ${breakpoints.mobile + 1}px) and (max-width: ${breakpoints.tablet}px) {
  .theme-container {
    padding-left: var(--theme-cp-tablet, 24px);
    padding-right: var(--theme-cp-tablet, 24px);
  }
  h1 { font-size: ${fonts.sizes.tablet.h1}px; }
  h2 { font-size: ${fonts.sizes.tablet.h2}px; }
  h3 { font-size: ${fonts.sizes.tablet.h3}px; }
  h4 { font-size: ${fonts.sizes.tablet.h4}px; }
  body { font-size: ${fonts.sizes.tablet.body}px; }
  small { font-size: ${fonts.sizes.tablet.small}px; }
}
@media (min-width: ${breakpoints.tablet + 1}px) {
  .theme-container {
    padding-left: var(--theme-cp-desktop, 32px);
    padding-right: var(--theme-cp-desktop, 32px);
  }
  h1 { font-size: ${fonts.sizes.desktop.h1}px; }
  h2 { font-size: ${fonts.sizes.desktop.h2}px; }
  h3 { font-size: ${fonts.sizes.desktop.h3}px; }
  h4 { font-size: ${fonts.sizes.desktop.h4}px; }
  body { font-size: ${fonts.sizes.desktop.body}px; }
  small { font-size: ${fonts.sizes.desktop.small}px; }
}
/* Override existing --sg-* variables for backward compatibility */
:root {
  --sg-background: var(--theme-bg);
  --sg-text: var(--theme-text);
  --sg-accent: var(--theme-accent);
  --sg-heading-color: var(--theme-heading);
  --sg-link: var(--theme-link);
  --sg-link-hover: var(--theme-link-hover);
  --sg-btn-bg: var(--theme-btn-bg);
  --sg-btn-text: var(--theme-btn-text);
  --sg-heading-font: var(--theme-heading-font);
  --sg-body-font: var(--theme-body-font);
  --background: var(--theme-bg);
  --foreground: var(--theme-text);
}
`;
}

/** Extract unique Google Font family names from font settings. */
function collectGoogleFonts(fonts: FontSettings): string[] {
  const families = new Set<string>();
  const googleKeywords: Record<string, string> = {
    Inter: "Inter",
    "DM Sans": "DM+Sans",
    "Plus Jakarta Sans": "Plus+Jakarta+Sans",
    Manrope: "Manrope",
    Outfit: "Outfit",
    Roboto: "Roboto",
    "Open Sans": "Open+Sans",
    Lato: "Lato",
    Montserrat: "Montserrat",
    Poppins: "Poppins",
    Raleway: "Raleway",
    Nunito: "Nunito",
    "Playfair Display": "Playfair+Display",
    Lora: "Lora",
    Merriweather: "Merriweather",
    "Libre Baskerville": "Libre+Baskerville",
    "Source Serif 4": "Source+Serif+4",
    "Crimson Pro": "Crimson+Pro",
    "Fira Code": "Fira+Code",
    "JetBrains Mono": "JetBrains+Mono",
    Caveat: "Caveat",
    Pacifico: "Pacifico",
  };

  for (const stack of [fonts.heading, fonts.body, fonts.mono]) {
    for (const [name, param] of Object.entries(googleKeywords)) {
      if (stack.includes(name)) families.add(param);
    }
  }

  return [...families];
}
