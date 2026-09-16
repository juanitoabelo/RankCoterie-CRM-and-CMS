import { prisma } from "@/modules/shared";
import BlockRenderer from "@/components/admin/page-builder/BlockRenderer";
import type { Block } from "@/lib/page-builder/types";
import type { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findFirst({
    where: { slug, status: "LIVE" },
    select: {
      title: true,
      name: true,
      seoTitle: true,
      metaDesc: true,
      metaKeywords: true,
      ogImage: true,
      canonicalUrl: true,
      robotsIndex: true,
      robotsFollow: true,
    },
  });
  if (!page) return { title: "Page not found" };

  const title = page.seoTitle || page.title || page.name;
  const metaKeywords = page.metaKeywords
    ? JSON.parse(page.metaKeywords) as string[]
    : [];

  return {
    title,
    description: page.metaDesc ?? undefined,
    keywords: metaKeywords.length > 0 ? metaKeywords : undefined,
    robots: {
      index: page.robotsIndex,
      follow: page.robotsFollow,
    },
    alternates: page.canonicalUrl ? { canonical: page.canonicalUrl } : undefined,
    openGraph: page.ogImage
      ? {
          title,
          description: page.metaDesc ?? undefined,
          images: [{ url: page.ogImage }],
        }
      : undefined,
  };
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await prisma.page.findFirst({
    where: {
      slug,
      status: "LIVE",
    },
  });

  if (!page) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900">Page not found</h1>
          <p className="mt-2 text-zinc-500">The page you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const blocks: Block[] = page.data ? JSON.parse(page.data) : [];

  return (
    <div>
      <BlockRenderer blocks={blocks} />
      {page.jsonSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: page.jsonSchema }}
        />
      )}
    </div>
  );
}
