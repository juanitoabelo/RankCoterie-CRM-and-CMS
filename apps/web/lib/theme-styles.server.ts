/**
 * Root-layout theme styles (style guide + theme settings + robots flag).
 *
 * The root layout renders these on every request for both the storefront and
 * the admin, which used to mean a tenant round-trip per navigation. The result
 * is cached for a short TTL; theme-writing admin actions call
 * `invalidateThemeStylesCache()` so editors still see their changes at once.
 */
import { prisma, TENANT_ID, MemoryCache } from "@/modules/shared";
import { safeDb } from "@/lib/db-resilient";
import {
  DEFAULT_STYLE_GUIDE,
  renderGlobalStyleGuide,
  type StyleGuide,
} from "@/lib/style-guide";
import {
  DEFAULT_THEME_SETTINGS,
  renderThemeSettingsCSS,
  type ThemeSettings,
} from "@/lib/theme-settings";
import { renderCustomFontFaces } from "@/lib/custom-fonts";
import { loadCustomFontsSafe } from "@/lib/custom-fonts.server";

type TenantTheme = {
  styleGuide?: Partial<StyleGuide>;
  themeSettings?: Partial<ThemeSettings>;
  readingSettings?: { searchEngineVisibility?: string };
};

type CachedTheme = {
  guide: StyleGuide;
  themeSettings: ThemeSettings;
  noindex: boolean;
};

const themeCache = new MemoryCache<CachedTheme>(30_000);
const THEME_CACHE_KEY = `theme:${TENANT_ID}`;

async function loadTenantTheme(): Promise<CachedTheme> {
  const cached = themeCache.get(THEME_CACHE_KEY);
  if (cached) return cached;

  const tenant = await safeDb(
    () => prisma.tenant.findUnique({ where: { id: TENANT_ID } }),
    null,
  );
  const theme = (tenant?.theme ?? {}) as TenantTheme;

  const guide: StyleGuide = { ...DEFAULT_STYLE_GUIDE, ...theme.styleGuide };
  const themeSettings: ThemeSettings = {
    ...DEFAULT_THEME_SETTINGS,
    ...theme.themeSettings,
    colors: { ...DEFAULT_THEME_SETTINGS.colors, ...theme.themeSettings?.colors },
    fonts: {
      ...DEFAULT_THEME_SETTINGS.fonts,
      ...theme.themeSettings?.fonts,
      sizes: {
        mobile: { ...DEFAULT_THEME_SETTINGS.fonts.sizes.mobile, ...theme.themeSettings?.fonts?.sizes?.mobile },
        tablet: { ...DEFAULT_THEME_SETTINGS.fonts.sizes.tablet, ...theme.themeSettings?.fonts?.sizes?.tablet },
        desktop: { ...DEFAULT_THEME_SETTINGS.fonts.sizes.desktop, ...theme.themeSettings?.fonts?.sizes?.desktop },
      },
    },
    layout: { ...DEFAULT_THEME_SETTINGS.layout, ...theme.themeSettings?.layout },
    responsive: {
      breakpoints: { ...DEFAULT_THEME_SETTINGS.responsive.breakpoints, ...theme.themeSettings?.responsive?.breakpoints },
      containerPadding: { ...DEFAULT_THEME_SETTINGS.responsive.containerPadding, ...theme.themeSettings?.responsive?.containerPadding },
    },
  };

  const result: CachedTheme = {
    guide,
    themeSettings,
    noindex: theme.readingSettings?.searchEngineVisibility === "hidden",
  };
  themeCache.set(THEME_CACHE_KEY, result);
  return result;
}

/** Theme styles + custom-font faces for the `<head>` of every page. */
export async function getThemeStyles() {
  const [{ guide, themeSettings, noindex }, customFonts] = await Promise.all([
    loadTenantTheme(),
    loadCustomFontsSafe(),
  ]);
  return { guide, themeSettings, noindex, customFonts };
}

/** Drop the cached theme — call after saving theme/style/reading settings. */
export function invalidateThemeStylesCache(): void {
  themeCache.delete(THEME_CACHE_KEY);
}

export { renderGlobalStyleGuide, renderThemeSettingsCSS, renderCustomFontFaces };
