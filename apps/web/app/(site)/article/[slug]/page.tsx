import { prisma } from "@/lib/directory/prismaCatalog";
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
  });
  if (!article) return { title: "Article not found" };

  let title = article.title;
  if (region) {
    const regionRow = await prisma.region.findFirst({ where: { slug: region } });
    if (regionRow) {
      const ctx: RegionContext = {
        regionName: regionRow.city
          ? `${regionRow.city}, ${regionRow.state}`
          : regionRow.stateFull,
      };
      title = renderLocalizedContent(article.title, ctx);
    }
  }

  return {
    title: article.metaDesc ? `${title} | Canopy` : title,
    description: article.metaDesc ?? undefined,
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

  // Check for pre-materialized variant
  let body = article.body;
  let regionDisplayName: string | null = null;

  if (region) {
    const regionRow = await prisma.region.findFirst({ where: { slug: region } });
    if (regionRow) {
      regionDisplayName = regionRow.city
        ? `${regionRow.city}, ${regionRow.state}`
        : regionRow.stateFull;

      // Try to find a pre-materialized variant first
      const variant = await prisma.contentVariant.findFirst({
        where: { templateId: article.id, regionId: regionRow.id, status: "LIVE" },
      });

      if (variant) {
        body = variant.body;
      } else {
        // Fall back to live token rendering
        const ctx: RegionContext = {
          regionName: regionDisplayName,
          categoryName: article.category?.title,
        };
        body = renderLocalizedContent(article.body, ctx);
      }
    }
  } else {
    // No region — strip all region tokens
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
    </article>
  );
}
