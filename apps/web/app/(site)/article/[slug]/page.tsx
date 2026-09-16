import { prisma } from "@/modules/shared";
import { renderLocalizedContent } from "@/lib/localization/render";
import type { RegionContext } from "@/lib/localization/render";
import type { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { region } = await searchParams;

  const article = await prisma.contentTemplate.findFirst({
    where: { slug, status: "LIVE" },
    select: {
      title: true,
      metaDesc: true,
      metaKeywords: true,
      seoTitle: true,
      ogImage: true,
      canonicalUrl: true,
      robotsIndex: true,
      robotsFollow: true,
    },
  });
  if (!article) return { title: "Article not found" };

  let title = article.seoTitle || article.title;
  if (region) {
    const regionRow = await prisma.region.findFirst({ where: { slug: region } });
    if (regionRow) {
      const ctx: RegionContext = {
        regionName: regionRow.city
          ? `${regionRow.city}, ${regionRow.state}`
          : regionRow.stateFull,
      };
      title = renderLocalizedContent(article.seoTitle || article.title, ctx);
    }
  }

  const metaKeywords = article.metaKeywords
    ? (JSON.parse(article.metaKeywords) as string[])
    : [];

  return {
    title: article.metaDesc ? `${title} | Canopy` : title,
    description: article.metaDesc ?? undefined,
    keywords: metaKeywords.length > 0 ? metaKeywords : undefined,
    robots: {
      index: article.robotsIndex,
      follow: article.robotsFollow,
    },
    alternates: article.canonicalUrl ? { canonical: article.canonicalUrl } : undefined,
    openGraph: article.ogImage
      ? {
          title,
          description: article.metaDesc ?? undefined,
          images: [{ url: article.ogImage }],
        }
      : undefined,
  };
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { slug } = await params;
  const { region } = await searchParams;

  const article = await prisma.contentTemplate.findFirst({
    where: { slug, status: "LIVE" },
    include: {
      category: { select: { slug: true, title: true } },
    },
  });

  if (!article) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900">Article not found</h1>
          <p className="mt-2 text-zinc-500">The article you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  let body = article.body;
  let regionDisplayName: string | null = null;

  if (region) {
    const regionRow = await prisma.region.findFirst({ where: { slug: region } });
    if (regionRow) {
      regionDisplayName = regionRow.city
        ? `${regionRow.city}, ${regionRow.state}`
        : regionRow.stateFull;

      const variant = await prisma.contentVariant.findFirst({
        where: { templateId: article.id, regionId: regionRow.id, status: "LIVE" },
      });

      if (variant) {
        body = variant.body;
      } else {
        const ctx: RegionContext = {
          regionName: regionDisplayName,
          categoryName: article.category?.title,
        };
        body = renderLocalizedContent(article.body, ctx);
      }
    }
  } else {
    body = renderLocalizedContent(article.body, {});
  }

  return (
    <article className="mx-auto max-w-3xl">
      {regionDisplayName && (
        <p className="mb-4 text-sm text-zinc-500">
          Localized for{" "}
          <span className="font-medium text-zinc-700">{regionDisplayName}</span>
        </p>
      )}

      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
        {article.title}
      </h1>

      {article.category && (
        <p className="mt-2 text-sm text-zinc-500">
          in{" "}
          <a
            href={`/g/${article.category.slug}/`}
            className="underline underline-offset-2 hover:text-zinc-700"
          >
            {article.category.title}
          </a>
        </p>
      )}

      <div
        className="prose prose-zinc mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: body ?? "" }}
      />

      {article.jsonSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: article.jsonSchema }}
        />
      )}
    </article>
  );
}
