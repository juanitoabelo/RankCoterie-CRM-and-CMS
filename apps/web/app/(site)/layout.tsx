import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/modules/shared";
import { DEFAULT_STYLE_GUIDE, renderGlobalStyleGuide, type StyleGuide } from "@/lib/style-guide";
import { TENANT_ID } from "@/modules/shared";

// Cache for layout data (tenant, menu, company) - avoids repeated DB hits
interface LayoutCache {
  tenant: { theme: unknown; companyId: string | null } | null;
  headerMenu: { items: { id: string; label: string; href: string; target: string | null; order: number }[] } | null;
  company: { ga4: string | null; gtm: string | null; fbPixel: string | null; gscVerificationTag: string | null } | null;
  expiresAt: number;
}

const LAYOUT_CACHE_TTL_MS = 60_000; // 1 minute
let layoutCache: LayoutCache | null = null;

async function getLayoutData() {
  if (layoutCache && Date.now() < layoutCache.expiresAt) {
    return layoutCache;
  }

  const [tenant, headerMenu] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: TENANT_ID } }),
    prisma.menu.findFirst({
      where: { tenantId: TENANT_ID, location: "HEADER" },
      include: { items: { orderBy: { order: "asc" } } },
    }),
  ]);

  const company = tenant?.companyId
    ? await prisma.company.findUnique({ where: { id: tenant.companyId } })
    : await prisma.company.findUnique({ where: { tenantId: TENANT_ID } });

  layoutCache = {
    tenant: tenant ? { theme: tenant.theme, companyId: tenant.companyId } : null,
    headerMenu: headerMenu ? { items: headerMenu.items } : null,
    company: company ? { ga4: company.ga4, gtm: company.gtm, fbPixel: company.fbPixel, gscVerificationTag: company.gscVerificationTag } : null,
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
  const theme = (layoutData.tenant?.theme ?? {}) as { styleGuide?: Partial<StyleGuide> };
  const guide: StyleGuide = { ...DEFAULT_STYLE_GUIDE, ...theme.styleGuide };
  const company = layoutData.company;
  const headerMenu = layoutData.headerMenu;

  return (
    <div className="min-h-full flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: renderGlobalStyleGuide(guide) }} />
      {company?.gscVerificationTag && <meta name="google-site-verification" content={company.gscVerificationTag} />}
      {company?.gtm && <script async src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(company.gtm)}`} />}
      {company?.ga4 && <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(company.ga4)}`} />}
      {company?.fbPixel && <meta name="fb:pixel_id" content={company.fbPixel} />}
      <header className="border-b border-zinc-200 bg-white">
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
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Canopy Directory. Listings are not endorsements.
      </footer>
    </div>
  );
}