import { getApplyFormOptions } from "./actions";
import { prisma, TENANT_ID } from "@/modules/shared";
import BlockRenderer from "@/components/admin/page-builder/BlockRenderer";
import ApplyListingForm from "@/components/apply/ApplyListingForm";
import { hasBlockOfType } from "@/lib/page-builder/tree";
import type { Block } from "@/lib/page-builder/types";
import type { Metadata } from "next";

export const revalidate = 0;

async function getAssignedApplyPage() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } }).catch(() => null);
  const theme = (tenant?.theme ?? {}) as {
    readingSettings?: { applyPageId?: string | null };
  };
  const applyPageId = theme.readingSettings?.applyPageId;
  if (!applyPageId) return null;
  return prisma.page
    .findFirst({
      where: { id: applyPageId, tenantId: TENANT_ID, status: "LIVE" },
    })
    .catch(() => null);
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getAssignedApplyPage();
  if (!page) {
    return {
      title: "Apply to get listed | Canopy Directory",
      description:
        "Get your program listed in the directory with a local SEO page per region.",
    };
  }
  const title = page.seoTitle || page.title || page.name;
  const keywords = page.metaKeywords ? (JSON.parse(page.metaKeywords) as string[]) : [];
  return {
    title,
    description: page.metaDesc ?? undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    robots: { index: page.robotsIndex, follow: page.robotsFollow },
    alternates: page.canonicalUrl ? { canonical: page.canonicalUrl } : undefined,
  };
}

export default async function ApplyPage() {
  const [applyPage, options] = await Promise.all([
    getAssignedApplyPage(),
    getApplyFormOptions(),
  ]);

  const blocks: Block[] = applyPage?.data ? JSON.parse(applyPage.data) : [];
  // When the assigned page already embeds the form block, render only the page
  // content — otherwise we'd show two forms.
  const hasFormBlock = hasBlockOfType(blocks, "listingApplyForm");

  return (
    <div className="mx-auto max-w-2xl">
      {blocks.length > 0 && (
        <div className={hasFormBlock ? "" : "mb-10"}>
          <BlockRenderer blocks={blocks} />
        </div>
      )}

      {!hasFormBlock && <ApplyListingForm initialOptions={options} />}
    </div>
  );
}
