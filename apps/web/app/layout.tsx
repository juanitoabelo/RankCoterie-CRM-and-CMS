import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { getThemeStyles, renderCustomFontFaces, renderGlobalStyleGuide, renderThemeSettingsCSS } from "@/lib/theme-styles.server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rank Coterie Directory",
  description: "Localized business directory with paid listings and SEO-ready region pages",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Tenant theme + fonts are TTL-cached server-side (see lib/theme-styles.server.ts)
  // so this layout — which wraps every route — stays a cache hit per request.
  const { guide, themeSettings, noindex, customFonts } = await getThemeStyles();
  const fontFaceCSS = renderCustomFontFaces(customFonts);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {fontFaceCSS && (
          <style dangerouslySetInnerHTML={{ __html: fontFaceCSS }} />
        )}
        <style dangerouslySetInnerHTML={{ __html: renderGlobalStyleGuide(guide) }} />
        <style dangerouslySetInnerHTML={{ __html: renderThemeSettingsCSS(themeSettings, customFonts) }} />
        {noindex && <meta name="robots" content="noindex, nofollow" />}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
