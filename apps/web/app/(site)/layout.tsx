import Link from "next/link";
import Script from "next/script";
import { headers } from "next/headers";
import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma, TENANT_ID } from "@/modules/shared";
import { safeDb } from "@/lib/db-resilient";
import { loadSharedSiteLayoutCache, loadSiteLayoutCache } from "@/lib/site-layout-cache";
import type { StyleGuide } from "@/lib/style-guide";
import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from "@/lib/theme-settings";
import { DEFAULT_HEADER_BLOCKS, DEFAULT_FOOTER_BLOCKS, type HeaderFooterBlock, type ContainerSettings, DEFAULT_CONTAINER_SETTINGS } from "@/lib/header-footer/types";
import { resolveHeaderFooter, parseHeaderFooterData } from "@/modules/header-footer";
import HeaderFooterRenderer from "@/components/admin/header-footer-builder/HeaderFooterRenderer";
import { resolvePageLayout, parsePageLayoutData } from "@/modules/page-layout";
import type { PageLayoutBlock } from "@/lib/page-layout/types";
import PageLayoutRenderer from "@/components/admin/page-layout-builder/PageLayoutRenderer";
import CartIcon from "@/components/storefront/CartIcon";
import WishlistSync from "@/components/storefront/WishlistSync";
import RecaptchaProvider from "@/components/site/RecaptchaProvider";
import AnalyticsTracker from "@/components/analytics/AnalyticsTracker";
import ConsentBanner from "@/components/analytics/ConsentBanner";
import CustomScripts from "@/components/site/CustomScripts";
import LiveChatWidget from "@/components/site/LiveChatWidget";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { DEFAULT_CUSTOM_CSS_JS, type CustomCssJsSettings } from "@/modules/custom-css-js/types";
import { normalizeLiveChatSettings } from "@/modules/live-chat/settings-helpers";

type MenuData = {
  items: {
    id: string;
    label: string;
    href: string;
    target: string | null;
    order: number;
    children?: { id: string; label: string; href: string; target: string | null; order: number }[];
  }[];
};

type SiteTheme = {
  styleGuide?: Partial<StyleGuide>;
  themeSettings?: Partial<ThemeSettings>;
  readingSettings?: { searchEngineVisibility?: string };
  generalSettings?: { recaptchaEnabled?: boolean; recaptchaSiteKey?: string; siteIconUrl?: string; siteTitle?: string };
  customCssJs?: Partial<CustomCssJsSettings>;
  liveChat?: unknown;
};

interface SharedLayoutCache {
  theme: SiteTheme;
  headerMenu: MenuData | null;
  footerMenu: MenuData | null;
  company: { ga4: string | null; gtm: string | null; fbPixel: string | null; gscVerificationTag: string | null } | null;
  headerBlocks: HeaderFooterBlock[];
  headerContainerSettings: ContainerSettings;
  footerBlocks: HeaderFooterBlock[];
  footerContainerSettings: ContainerSettings;
}

interface PageLayoutCache {
  pageLayoutBlocks: PageLayoutBlock[];
  pageLayoutContainerSettings: ContainerSettings;
}

const EMPTY_PAGE_LAYOUT: PageLayoutCache = {
  pageLayoutBlocks: [],
  pageLayoutContainerSettings: DEFAULT_CONTAINER_SETTINGS,
};

function safeScriptValue(value: string) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Tenant-level layout data. Shared by every route, so navigating to a new URL
 * never pays for these queries again (nor does a link prefetch).
 */
async function getSharedLayoutData(): Promise<SharedLayoutCache> {
  return loadSharedSiteLayoutCache(async () => {
    const [tenant, headerMenu, footerMenu, resolvedHeader, resolvedFooter] = await Promise.all([
      safeDb(() => prisma.tenant.findUnique({ where: { id: TENANT_ID } }), null),
      safeDb(
        () =>
          prisma.menu.findFirst({
            where: { tenantId: TENANT_ID, location: "HEADER" },
            include: {
              items: {
                where: { parentId: null },
                orderBy: { order: "asc" },
                include: { children: { orderBy: { order: "asc" } } },
              },
            },
          }),
        null,
      ),
      safeDb(
        () =>
          prisma.menu.findFirst({
            where: { tenantId: TENANT_ID, location: "FOOTER" },
            include: {
              items: {
                where: { parentId: null },
                orderBy: { order: "asc" },
                include: { children: { orderBy: { order: "asc" } } },
              },
            },
          }),
        null,
      ),
      resolveHeaderFooter("HEADER").catch(() => null),
      resolveHeaderFooter("FOOTER").catch(() => null),
    ]);

    const company = tenant?.companyId
      ? await safeDb(() => prisma.company.findUnique({ where: { id: tenant.companyId! } }), null)
      : await safeDb(() => prisma.company.findUnique({ where: { tenantId: TENANT_ID } }), null);

    let headerBlocks: HeaderFooterBlock[] = DEFAULT_HEADER_BLOCKS;
    let headerContainerSettings: ContainerSettings = DEFAULT_CONTAINER_SETTINGS;
    if (resolvedHeader) {
      try {
        const parsed = parseHeaderFooterData(resolvedHeader.data);
        headerBlocks = parsed.blocks as HeaderFooterBlock[];
        headerContainerSettings = parsed.containerSettings;
      } catch {
        // Fall back to the default header when stored builder data is invalid.
      }
    }

    let footerBlocks: HeaderFooterBlock[] = DEFAULT_FOOTER_BLOCKS;
    let footerContainerSettings: ContainerSettings = DEFAULT_CONTAINER_SETTINGS;
    if (resolvedFooter) {
      try {
        const parsed = parseHeaderFooterData(resolvedFooter.data);
        footerBlocks = parsed.blocks as HeaderFooterBlock[];
        footerContainerSettings = parsed.containerSettings;
      } catch {
        // Fall back to the default footer when stored builder data is invalid.
      }
    }

    return {
      theme: (tenant?.theme ?? {}) as SiteTheme,
      headerMenu: headerMenu ? { items: headerMenu.items } : null,
      footerMenu: footerMenu ? { items: footerMenu.items } : null,
      company: company
        ? { ga4: company.ga4, gtm: company.gtm, fbPixel: company.fbPixel, gscVerificationTag: company.gscVerificationTag }
        : null,
      headerBlocks,
      headerContainerSettings,
      footerBlocks,
      footerContainerSettings,
    };
  });
}

async function getPageLayoutData(pathname: string): Promise<PageLayoutCache> {
  return loadSiteLayoutCache(pathname, async () => {
    try {
      const resolved = await resolvePageLayout({ pathname });
      if (resolved) {
        const parsed = parsePageLayoutData(resolved.data);
        return {
          pageLayoutBlocks: parsed.blocks,
          pageLayoutContainerSettings: parsed.containerSettings,
        };
      }
    } catch {
      // Page layout models may not exist yet — fall back to the route's page.
    }
    return EMPTY_PAGE_LAYOUT;
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const { theme } = await getSharedLayoutData();
  const siteIconUrl = theme.generalSettings?.siteIconUrl;
  const siteTitle = theme.generalSettings?.siteTitle || "Rank Coterie Directory";
  return {
    title: siteTitle,
    description: "Localized business directory with paid listings and SEO-ready region pages",
    icons: siteIconUrl
      ? {
          icon: { url: siteIconUrl, type: "image/png", sizes: "any" },
        }
      : undefined,
  };
}

function resolveThemeSettings(theme: SiteTheme): ThemeSettings {
  return {
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
}

function HeaderSkeleton() {
  return (
    <div className="border-b border-zinc-200 bg-white" aria-hidden="true">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="h-5 w-40 animate-pulse rounded bg-zinc-100" />
        <div className="hidden items-center gap-5 sm:flex">
          <div className="h-4 w-16 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-hidden="true">
      <div className="h-8 w-2/3 max-w-sm animate-pulse rounded bg-zinc-100" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  );
}

async function SiteUtilities() {
  const data = await getSharedLayoutData();
  const showStorefrontUtilities = resolveThemeSettings(data.theme).layout.showStorefrontUtilities !== false;
  return showStorefrontUtilities ? <WishlistSync /> : null;
}

async function SiteHeader() {
  const data = await getSharedLayoutData();
  const themeSettings = resolveThemeSettings(data.theme);
  const headerMenu = data.headerMenu;
  const useHeaderBuilder = data.headerBlocks.length > 0;
  const showStorefrontUtilities = themeSettings.layout.showStorefrontUtilities !== false;
  const headerSticky = useHeaderBuilder && data.headerContainerSettings.sticky === "top";

  return (
    <header
      className={useHeaderBuilder ? "" : "border-b border-zinc-200 bg-white"}
      style={headerSticky ? { position: "sticky", top: 0, zIndex: 40 } : undefined}
    >
      {useHeaderBuilder ? (
        <div className="relative">
          <HeaderFooterRenderer
            blocks={data.headerBlocks}
            containerSettings={data.headerContainerSettings}
            menus={{
              header: headerMenu?.items ?? [
                { id: "home", label: "Home", href: "/" },
                { id: "directory", label: "Directory", href: "/" },
                { id: "apply", label: "Apply to list", href: "/apply" },
              ],
              footer: data.footerMenu?.items ?? [],
            }}
          />
          <div className="absolute right-4 top-1/5 z-20 -translate-y-1/2 flex items-center gap-4">
            {showStorefrontUtilities && (
              <>
                <Link href="/wishlist" className="hidden text-sm text-zinc-600 hover:text-zinc-900 sm:inline">
                  Wishlist
                </Link>
                <Link href="/orders" className="hidden text-sm text-zinc-600 hover:text-zinc-900 sm:inline">
                  Track order
                </Link>
                <CartIcon />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            Rank Coterie Directory
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-6 text-sm text-zinc-600">
              {(headerMenu?.items.length ? headerMenu.items : [
                { id: "home", label: "Home", href: "/", target: null },
                { id: "search", label: "Search", href: "/search", target: null },
                { id: "directory", label: "Directory", href: "/", target: null },
                { id: "apply", label: "Apply to list", href: "/apply", target: null },
              ]).map((item) => (
                <Link key={item.id} href={item.href} target={item.target ?? undefined} className="hover:text-zinc-900">
                  {item.label}
                </Link>
              ))}
              {showStorefrontUtilities && (
                <>
                  <Link href="/wishlist" className="hover:text-zinc-900">Wishlist</Link>
                  <Link href="/orders" className="hover:text-zinc-900">Track order</Link>
                </>
              )}
            </nav>
            {showStorefrontUtilities && <CartIcon />}
          </div>
        </div>
      )}
    </header>
  );
}

async function SiteFooter() {
  const data = await getSharedLayoutData();
  const footerMenu = data.footerMenu;
  const useFooterBuilder = data.footerBlocks.length > 0;

  return (
    <footer className={useFooterBuilder ? "" : "border-t border-zinc-200 bg-white"}>
      {useFooterBuilder ? (
        <HeaderFooterRenderer
          blocks={data.footerBlocks}
          containerSettings={data.footerContainerSettings}
          menus={{
            header: data.headerMenu?.items ?? [],
            footer: footerMenu?.items ?? [],
          }}
        />
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
            © {new Date().getFullYear()} Rank Coterie Directory. Listings are not endorsements.
          </div>
        </>
      )}
    </footer>
  );
}

async function SiteTracking() {
  const [data, analyticsConfig] = await Promise.all([getSharedLayoutData(), getAnalyticsConfig()]);
  const theme = data.theme;
  const company = data.company;
  const ga4 = company?.ga4;
  const gtm = company?.gtm;
  const fbPixel = company?.fbPixel;
  const gscVerificationTag = company?.gscVerificationTag;
  const recaptchaSiteKey =
    theme.generalSettings?.recaptchaEnabled && theme.generalSettings?.recaptchaSiteKey
      ? theme.generalSettings.recaptchaSiteKey
      : "";
  const customCssJs: CustomCssJsSettings = {
    ...DEFAULT_CUSTOM_CSS_JS,
    ...(theme.customCssJs ?? {}),
  };
  const liveChatSettings = normalizeLiveChatSettings(theme.liveChat);

  return (
    <>
      {/* GSC verification: set the tag in Admin → My Company → analytics. */}
      {gscVerificationTag && (
        <meta name="google-site-verification" content={gscVerificationTag} />
      )}
      {ga4 && (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`}
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', ${safeScriptValue(ga4)});
              `,
            }}
          />
        </>
      )}
      {gtm && (
        <Script
          id="gtm-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||function(){
              (w[l].q=w[l].q||[]).push(arguments)},w[l].l=+new Date();
              var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)
              })(window,document,'script','dataLayer',${safeScriptValue(gtm)});
            `,
          }}
        />
      )}
      {fbPixel && (
        <Script
          id="fb-pixel-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', ${safeScriptValue(fbPixel)});
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
      {recaptchaSiteKey && <RecaptchaProvider siteKey={recaptchaSiteKey} />}
      {customCssJs.customCss && (
        <style dangerouslySetInnerHTML={{ __html: customCssJs.customCss }} />
      )}
      {customCssJs.customJs && <CustomScripts html={customCssJs.customJs} />}
      <AnalyticsTracker
        enabled={analyticsConfig.enabled}
        consentRequired={analyticsConfig.consentRequired}
        excludedPaths={analyticsConfig.excludedPaths}
      />
      <ConsentBanner enabled={analyticsConfig.enabled && analyticsConfig.consentRequired} />
      {liveChatSettings.enabled ? (
        <LiveChatWidget settings={liveChatSettings} recaptchaSiteKey={recaptchaSiteKey} />
      ) : null}
    </>
  );
}

async function SitePageLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const pathname =
    hdrs.get("x-pathname") ??
    hdrs.get("x-nextjs-pathname") ??
    hdrs.get("next-url") ??
    "/";
  const data = await getPageLayoutData(pathname);

  return data.pageLayoutBlocks.length > 0 ? (
    <PageLayoutRenderer
      blocks={data.pageLayoutBlocks}
      containerSettings={data.pageLayoutContainerSettings}
    />
  ) : (
    children
  );
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <Suspense fallback={null}>
        <SiteUtilities />
      </Suspense>

      <Suspense fallback={<HeaderSkeleton />}>
        <SiteHeader />
      </Suspense>

      <main className="flex-1">
        <Suspense fallback={<PageSkeleton />}>
          <SitePageLayout>{children}</SitePageLayout>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>

      <Suspense fallback={null}>
        <SiteTracking />
      </Suspense>
    </div>
  );
}
