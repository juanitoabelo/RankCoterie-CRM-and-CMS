import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma, TENANT_ID } from "@/modules/shared";
import { renderLocalizedContent } from "@/lib/localization/render";
import { sanitizeHtml } from "@/lib/style-guide";
import { resolveContentPageTemplate, parseContentPageTemplateData } from "@/modules/content-page-template";
import ContentPageTemplateRenderer from "@/components/admin/content-page-template-builder/ContentPageTemplateRenderer";
import type { ContentPageRenderData } from "@/lib/content-page-template/bindings";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

function parseDisplaySections(value: unknown): boolean[] {
  const raw = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })() : value;
  return Array.isArray(raw) ? raw.map(Boolean) : [];
}

async function getSubTopic(slug: string) {
  return prisma.contentTemplate.findFirst({
    where: { tenantId: TENANT_ID, slug, status: "LIVE" },
    include: {
      category: { select: { id: true, slug: true, title: true } },
      featuredImage: { select: { id: true, alt: true, title: true, caption: true } },
      sectionLinks: {
        orderBy: { order: "asc" },
        include: {
          section: { select: { id: true, title: true, heading: true, body: true, status: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const st = await prisma.contentTemplate.findFirst({
    where: { tenantId: TENANT_ID, slug, status: "LIVE" },
    select: {
      title: true,
      seoTitle: true,
      metaDesc: true,
      metaKeywords: true,
      ogImage: true,
      canonicalUrl: true,
      robotsIndex: true,
      robotsFollow: true,
      category: { select: { title: true } },
    },
  });
  if (!st) return {};

  const ctx = { categoryName: st.category?.title };
  const title = renderLocalizedContent(st.seoTitle || st.title, ctx);
  const description = st.metaDesc ? renderLocalizedContent(st.metaDesc, ctx) : undefined;
  let keywords: string[] = [];
  try {
    keywords = st.metaKeywords ? (JSON.parse(st.metaKeywords) as string[]) : [];
  } catch {
    keywords = [];
  }

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    robots: { index: st.robotsIndex, follow: st.robotsFollow },
    alternates: st.canonicalUrl ? { canonical: st.canonicalUrl } : undefined,
    openGraph: st.ogImage
      ? { title, description, images: [{ url: st.ogImage }] }
      : undefined,
  };
}

export default async function SubTopicPage({ params }: Props) {
  const { slug } = await params;
  const subtopic = await getSubTopic(slug);
  if (!subtopic) notFound();

  const ctx = { categoryName: subtopic.category?.title };
  const body = renderLocalizedContent(subtopic.body, ctx);
  const image = subtopic.featuredImage;

  const display = parseDisplaySections(subtopic.displaySections);
  const anyToggle = display.some(Boolean);
  const sections = subtopic.sectionLinks
    .filter((link) => link.section.status === "LIVE")
    .filter((_, i) => (anyToggle ? display[i] === true : true));

  const template = await resolveContentPageTemplate("subtopic", subtopic.id);
  const { blocks: templateBlocks, containerSettings } = parseContentPageTemplateData(template?.data ?? null);

  if (templateBlocks.length > 0) {
    const renderData: ContentPageRenderData = {
      kind: "subtopic",
      binding: {
        page: {
          title: subtopic.title,
          slug: subtopic.slug,
          body,
          author: subtopic.author,
          metaDesc: subtopic.metaDesc,
          seoTitle: subtopic.seoTitle,
        },
        pageUrl: `/subtopic/${subtopic.slug}/`,
        heroImage: image ? `/api/assets/${image.id}/` : null,
        heroImageAlt: image?.alt ?? image?.title ?? null,
        heroImageCaption: image?.caption ?? null,
        topic: subtopic.category
          ? {
              title: subtopic.category.title,
              slug: subtopic.category.slug,
              url: `/topic/${subtopic.category.slug}/`,
            }
          : null,
        sectionsCount: sections.length,
      },
      sections: sections.map((link) => ({
        title: link.section.heading || link.section.title,
        content: link.section.body ? renderLocalizedContent(link.section.body, ctx) : "",
      })),
      geo: null,
      subtopics: [],
      topic: subtopic.category
        ? {
            title: subtopic.category.title,
            slug: subtopic.category.slug,
            url: `/topic/${subtopic.category.slug}/`,
            description: null,
          }
        : null,
    };

    return (
      <div className="pt-[50px] pb-[50px]">
        <div className="mx-auto max-w-[1200px]">
          <ContentPageTemplateRenderer
            blocks={templateBlocks}
            containerSettings={containerSettings}
            kind="subtopic"
            binding={renderData.binding}
            sections={renderData.sections}
            geo={renderData.geo}
            subtopics={renderData.subtopics}
            topic={renderData.topic}
          />
        </div>
        {subtopic.jsonSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: subtopic.jsonSchema }}
          />
        )}
      </div>
    );
  }

  return (
    <article className="pt-[50px] pb-[50px]">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-800">
            Directory
          </Link>
          {subtopic.category && (
            <>
              {" "}/{" "}
              <Link href={`/topic/${subtopic.category.slug}/`} className="hover:text-zinc-800">
                {subtopic.category.title}
              </Link>
            </>
          )}{" "}
          / <span className="text-zinc-700">{subtopic.title}</span>
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {subtopic.title}
        </h1>
        {subtopic.author && <p className="mt-2 text-sm text-zinc-500">By {subtopic.author}</p>}

        {image && (
          <figure className="mt-6 max-w-3xl">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <Image
                src={`/api/assets/${image.id}/`}
                alt={image.alt || image.title || ""}
                title={image.title || undefined}
                fill
                sizes="(min-width: 1024px) 768px, 100vw"
                className="object-cover"
              />
            </div>
            {image.caption && <figcaption className="mt-2 text-xs text-zinc-500">{image.caption}</figcaption>}
          </figure>
        )}

        {body && (
          <div
            className="prose prose-zinc mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
          />
        )}

        {sections.map((link) => (
          <section key={link.section.id} className="mt-10 max-w-3xl">
            <h2 className="text-xl font-semibold text-zinc-900">
              {link.section.heading || link.section.title}
            </h2>
            {link.section.body && (
              <div
                className="prose-sm mt-3 text-zinc-700"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(renderLocalizedContent(link.section.body, ctx)),
                }}
              />
            )}
          </section>
        ))}

        {subtopic.jsonSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: subtopic.jsonSchema }}
          />
        )}
      </div>
    </article>
  );
}
