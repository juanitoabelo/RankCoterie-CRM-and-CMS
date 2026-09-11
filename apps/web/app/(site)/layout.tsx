import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/modules/shared";
import { DEFAULT_STYLE_GUIDE, renderGlobalStyleGuide, type StyleGuide } from "@/lib/style-guide";
import { DEFAULT_THEME_SETTINGS, renderThemeSettingsCSS, type ThemeSettings } from "@/lib/theme-settings";
import { DEFAULT_HEADER_BLOCKS, DEFAULT_FOOTER_BLOCKS, type HeaderFooterBlock } from "@/lib/header-footer/types";
import { resolveHeaderFooter } from "@/modules/header-footer";
import HeaderFooterRenderer from "@/components/admin/header-footer-builder/HeaderFooterRenderer";
import { TENANT_ID } from "@/modules/shared";

// Cache for layout data (tenant, menu, company) - avoids repeated DB hits
interface LayoutCache {
  tenant: { theme: unknown; companyId: string | null } | null;
  headerMenu: { items: { id: string; label: string; href: string; target: string | null; order: number }[] } | null;
  footerMenu: { items: { id: string; label: string; href: string; target: string | null; order: number }[] } | null;
  sidebarMenu: { items: { id: string; label: string; href: string; target: string | null; order: number }[] } | null;
  company: { ga4: string | null; gtm: string | null; fbPixel: string | null; gscVerificationTag: string | null } | null;
  headerBlocks: HeaderFooterBlock[];
  footerBlocks: HeaderFooterBlock[];
  expiresAt: number;
}

const LAYOUT_CACHE_TTL_MS = 60_000; // 1 minute
let layoutCache: LayoutCache | null = null;

async function getLayoutData() {
  if (layoutCache && Date.now() < layoutCache.expiresAt) {
    return layoutCache;
  }

  const [tenant, headerMenu, footerMenu, sidebarMenu] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: TENANT_ID } }),
    prisma.menu.findFirst({
      where: { tenantId: TENANT_ID, location: "HEADER" },
      include: { items: { orderBy: { order: "asc" } } },
    }),
    prisma.menu.findFirst({
      where: { tenantId: TENANT_ID, location: "FOOTER" },
      include: { items: { orderBy: { order: "asc" } } },
    }),
    prisma.menu.findFirst({
      where: { tenantId: TENANT_ID, location: "SIDEBAR" },
      include: { items: { orderBy: { order: "asc" } } },
    }),
  ]);

  const company = tenant?.companyId
    ? await prisma.company.findUnique({ where: { id: tenant.companyId } })
    : await prisma.company.findUnique({ where: { tenantId: TENANT_ID } });

  // Resolve header and footer blocks from builder or fallback to defaults
  let headerBlocks: HeaderFooterBlock[] = DEFAULT_HEADER_BLOCKS;
  let footerBlocks: HeaderFooterBlock[] = DEFAULT_FOOTER_BLOCKS;

  try {
    const resolvedHeader = await resolveHeaderFooter("HEADER");
    if (resolvedHeader) {
      headerBlocks = JSON.parse(resolvedHeader.data || "[]") as HeaderFooterBlock[];
    }
    const resolvedFooter = await resolveHeaderFooter("FOOTER");
    if (resolvedFooter) {
      footerBlocks = JSON.parse(resolvedFooter.data || "[]") as HeaderFooterBlock[];
    }
  } catch {
    // Header/footer builder models may not exist yet — fall back to defaults
  }

  layoutCache = {
    tenant: tenant ? { theme: tenant.theme, companyId: tenant.companyId } : null,
    headerMenu: headerMenu ? { items: headerMenu.items } : null,
    footerMenu: footerMenu ? { items: footerMenu.items } : null,
    sidebarMenu: sidebarMenu ? { items: sidebarMenu.items } : null,
    company: company ? { ga4: company.ga4, gtm: company.gtm, fbPixel: company.fbPixel, gscVerificationTag: company.gscVerificationTag } : null,
    headerBlocks,
    footerBlocks,
    expiresAt: Date.now() + LAYOUT_CACHE_TTL_MS,
  };

  return layoutCache;
}

export const metadata: Metadata = {
  title: "Canopy Directory",
  description: "Localized business directory with paid listings and SEO-ready region pages",
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const layoutData = await getLayoutData();
  const theme = (layoutData.tenant?.theme ?? {}) as {
    styleGuide?: Partial<StyleGuide>;
    themeSettings?: Partial<ThemeSettings>;
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
  const company = layoutData.company;
  const headerMenu = layoutData.headerMenu;
  const footerMenu = layoutData.footerMenu;
  const useHeaderBuilder = layoutData.headerBlocks.length > 0;
  const useFooterBuilder = layoutData.footerBlocks.length > 0;

  return (
    <div className="min-h-full flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: renderGlobalStyleGuide(guide) }} />
      <style dangerouslySetInnerHTML={{ __html: renderThemeSettingsCSS(themeSettings) }} />
      {company?.gscVerificationTag && <meta name="google-site-verification" content={company.gscVerificationTag} />}
      {company?.gtm && <script async src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(company.gtm)}`} />}
      {company?.ga4 && <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(company.ga4)}`} />}
      {company?.fbPixel && <meta name="fb:pixel_id" content={company.fbPixel} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-200 bg-white">
        {useHeaderBuilder ? (
          <HeaderFooterRenderer blocks={layoutData.headerBlocks} />
        ) : (
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold text-zinc-900">
              Canopy Directory
            </Link>
            <nav className="flex items-center gap-6 text-sm text-zinc-600">
              {(headerMenu?.items.length ? headerMenu.items : [
                { id: "home", label: "Home", href: "/", target: null },
                { id: "directory", label: "Directory", href: "/", target: null },
                { id: "apply", label: "Apply to list", href: "/apply", target: null },
              ]).map((item) => (
                <Link key={item.id} href={item.href} target={item.target ?? undefined} className="hover:text-zinc-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 bg-white">
        {useFooterBuilder ? (
          <HeaderFooterRenderer blocks={layoutData.footerBlocks} />
        ) : (
          <>
            {footerMenu?.items.length ? (
              <div className="mx-auto max-w-5xl px-4 py-6">
                <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-600">
                  {footerMenu.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      target={item.target ?? undefined}
                      className="hover:text-zinc-900"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ) : null}
            <div className="py-4 text-center text-xs text-zinc-400">
              © {new Date().getFullYear()} Canopy Directory. Listings are not endorsements.
            </div>
          </>
        )}
      </footer>
    </div>
  );
}