import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { prisma, TENANT_ID } from "@/modules/shared";
import { DEFAULT_STYLE_GUIDE, renderGlobalStyleGuide, type StyleGuide } from "@/lib/style-guide";
import { DEFAULT_THEME_SETTINGS, renderThemeSettingsCSS, type ThemeSettings } from "@/lib/theme-settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Canopy Directory",
  description: "Localized business directory with paid listings and SEO-ready region pages",
};

async function getThemeStyles() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as {
    styleGuide?: Partial<StyleGuide>;
    themeSettings?: Partial<ThemeSettings>;
    readingSettings?: { searchEngineVisibility?: string };
  };
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
  const noindex = theme.readingSettings?.searchEngineVisibility === "hidden";
  return { guide, themeSettings, noindex };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { guide, themeSettings, noindex } = await getThemeStyles();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: renderGlobalStyleGuide(guide) }} />
        <style dangerouslySetInnerHTML={{ __html: renderThemeSettingsCSS(themeSettings) }} />
        {noindex && <meta name="robots" content="noindex, nofollow" />}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
