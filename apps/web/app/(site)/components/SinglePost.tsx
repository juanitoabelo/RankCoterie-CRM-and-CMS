import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/modules/shared";
import { renderLocalizedContent } from "@/lib/localization/render";
import type { RegionContext } from "@/lib/localization/render";
import {
  buildRegionChoices,
  regionLabel,
  resolvePostRegion,
} from "@/lib/localization/postRegion";
import { resolveBlogTemplate, parseBlogTemplateData } from "@/modules/blog-template";
import BlogTemplateRenderer from "@/components/admin/blog-template-builder/BlogTemplateRenderer";
import type { BlogTemplateBlock, ContainerSettings } from "@/lib/blog-template/types";

/**
 * Single post (article) rendering served from the root `/[slug]` route.
 * Lookup order inside the route is product → page → single post.
 *
 * Region priority (see lib/localization/postRegion.ts): explicit ?region= →
 * "all" (token-stripped original) → geo state → first published variant.
 */

/** US state code from Vercel's geo headers; null in local dev / non-US. */
async function getGeoState(): Promise<string | null> {
  try {
    const h = await headers();
    if ((h.get("x-vercel-ip-country") ?? "").toUpperCase() !== "US") return null;
    return h.get("x-vercel-ip-country-region");
  } catch {
    return null;
  }
}

export async function getSinglePostSeo(
  slug: string,
  region?: string,
): Promise<Metadata | null> {
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
      category: { select: { title: true } },
      variants: {
        where: { status: "LIVE" },
        select: { regionId: true },
      },
    },
  });
  if (!article) return null;

  const [allRegions, geoState] = await Promise.all([
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
    getGeoState(),
  ]);
  const resolved = resolvePostRegion({
    param: region,
    regions: allRegions,
    variantRegionIds: article.variants.map((v) => v.regionId),
    geoState,
  });
  const ctx: RegionContext =
    resolved.kind === "region"
      ? {
          regionName: regionLabel(resolved.region),
          regionUrlPart: resolved.region.slug,
          categoryName: article.category?.title,
        }
      : { categoryName: article.category?.title };

  const title = renderLocalizedContent(article.seoTitle || article.title, ctx);
  const description = article.metaDesc
    ? renderLocalizedContent(article.metaDesc, ctx)
    : undefined;

  const metaKeywords = article.metaKeywords
    ? (JSON.parse(article.metaKeywords) as string[])
    : [];

  return {
    title: article.metaDesc ? `${title} | Canopy` : title,
    description,
    keywords: metaKeywords.length > 0 ? metaKeywords : undefined,
    robots: {
      index: article.robotsIndex,
      follow: article.robotsFollow,
    },
    alternates: article.canonicalUrl ? { canonical: article.canonicalUrl } : undefined,
    openGraph: article.ogImage
      ? {
          title,
          description,
          images: [{ url: article.ogImage }],
        }
      : undefined,
  };
}

export async function loadSinglePost(slug: string, region?: string) {
  const article = await prisma.contentTemplate.findFirst({
    where: { slug, status: "LIVE" },
    include: {
      category: { select: { slug: true, title: true } },
      featuredImage: { select: { id: true, alt: true, caption: true } },
      variants: {
        where: { status: "LIVE" },
        select: { regionId: true, body: true },
      },
    },
  });
  if (!article) return null;

  const [allRegions, geoState] = await Promise.all([
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
    getGeoState(),
  ]);
  const variantRegionIds = article.variants.map((v) => v.regionId);
  const resolved = resolvePostRegion({
    param: region,
    regions: allRegions,
    variantRegionIds,
    geoState,
  });

  let body: string;
  let regionDisplayName: string | null = null;

  if (resolved.kind === "general") {
    body = renderLocalizedContent(article.body, {
      categoryName: article.category?.title,
    });
  } else {
    const active = resolved.region;
    regionDisplayName = regionLabel(active);

    const variant = article.variants.find((v) => v.regionId === active.id);
    if (variant) {
      body = variant.body;
    } else {
      const ctx: RegionContext = {
        regionName: regionDisplayName,
        regionUrlPart: active.slug,
        categoryName: article.category?.title,
      };
      body = renderLocalizedContent(article.body, ctx);
    }
  }

  const regionChoices = buildRegionChoices(allRegions, variantRegionIds, resolved);

  // Try to resolve blog single template
  let blocks: BlogTemplateBlock[] = [];
  let containerSettings: ContainerSettings | undefined;

  try {
    const template = await resolveBlogTemplate("single", {
      pageId: article.id,
      pageType: "article",
      pathname: `/${slug}`,
    });
    if (template) {
      const parsed = parseBlogTemplateData(template.data);
      blocks = parsed.blocks;
      containerSettings = parsed.containerSettings;
    }
  } catch {
    // Blog template model may not exist yet
  }

  return {
    article,
    body,
    regionDisplayName,
    regionChoices,
    blocks,
    containerSettings,
  };
}

type SinglePostData = NonNullable<Awaited<ReturnType<typeof loadSinglePost>>>;

export function SinglePost({
  article,
  body,
  regionChoices,
  blocks,
  containerSettings,
}: SinglePostData) {
  // If a template is assigned, use the template renderer
  if (blocks.length > 0) {
    return (
      <article className="pt-[50px] pb-[50px]">
        <BlogTemplateRenderer
          blocks={blocks}
          containerSettings={containerSettings}
          article={{
            ...article,
            body,
            featuredImage: article.featuredImage
              ? `/api/assets/${article.featuredImage.id}`
              : null,
            featuredImageAlt: article.featuredImage?.alt ?? null,
            featuredImageCaption: article.featuredImage?.caption ?? null,
          }}
          templateType="single"
        />
      </article>
    );
  }

  // Fallback: default article layout
  return (
    <article className="pt-[50px] pb-[50px]">
      <div className="mx-auto max-w-[1200px]">
        {regionChoices.length > 1 && (
          <nav aria-label="Region versions" className="mb-6 flex flex-wrap gap-2">
            {regionChoices.map((choice) =>
              choice.active ? (
                <span
                  key={choice.slug}
                  aria-current="true"
                  className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
                >
                  {choice.label}
                </span>
              ) : (
                <Link
                  key={choice.slug}
                  href={`/${article.slug}?region=${encodeURIComponent(choice.slug)}`}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                >
                  {choice.label}
                </Link>
              ),
            )}
          </nav>
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
      </div>
    </article>
  );
}
