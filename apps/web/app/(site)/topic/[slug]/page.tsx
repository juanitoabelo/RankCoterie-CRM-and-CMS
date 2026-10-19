import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma, TENANT_ID } from "@/modules/shared";
import { renderLocalizedContent } from "@/lib/localization/render";
import { sanitizeHtml } from "@/lib/style-guide";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { filterIndexableRegions } from "@/lib/directory/indexGate";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

interface TopicSection {
  title: string;
  content: string;
}

/** `sections` is a JSON column; keep only well-formed, non-empty entries. */
function parseSections(value: unknown): TopicSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const { title, content } = entry as { title?: unknown; content?: unknown };
      if (typeof content !== "string" || !content.trim()) return null;
      return { title: typeof title === "string" ? title : "", content };
    })
    .filter((s): s is TopicSection => s !== null);
}

async function getTopic(slug: string) {
  return prisma.category.findFirst({
    where: { tenantId: TENANT_ID, slug, status: "LIVE" },
    include: {
      images: {
        where: { position: "PRIMARY" },
        take: 1,
        include: { imageAsset: { select: { id: true, alt: true, title: true, caption: true } } },
      },
      geoCategory: { select: { id: true, slug: true, title: true, description: true } },
      contentTemplates: {
        where: { status: "LIVE" },
        orderBy: { title: "asc" },
        select: { id: true, slug: true, title: true, metaDesc: true },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = await prisma.category.findFirst({
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
    },
  });
  if (!topic) return {};

  const title = topic.seoTitle || topic.title;
  let keywords: string[] = [];
  try {
    keywords = topic.metaKeywords ? (JSON.parse(topic.metaKeywords) as string[]) : [];
  } catch {
    keywords = [];
  }

  return {
    title,
    description: topic.metaDesc ?? undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    robots: { index: topic.robotsIndex, follow: topic.robotsFollow },
    alternates: topic.canonicalUrl ? { canonical: topic.canonicalUrl } : undefined,
    openGraph: topic.ogImage
      ? { title, description: topic.metaDesc ?? undefined, images: [{ url: topic.ogImage }] }
      : undefined,
  };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const topic = await getTopic(slug);
  if (!topic) notFound();

  const ctx = { categoryName: topic.title };
  const intro = renderLocalizedContent(topic.description, ctx);
  const sections = parseSections(topic.sections);
  const hero = topic.images[0]?.imageAsset ?? null;

  let geoStates: { id: string; slug: string; stateFull: string }[] = [];
  if (topic.geoCategory) {
    const repo = await getCatalogRepo();
    const allRegions = await repo.getRegions();
    geoStates = await filterIndexableRegions(
      repo,
      topic.geoCategory.id,
      allRegions.filter((r) => r.city === null),
    );
  }

  return (
    <article className="pt-[50px] pb-[50px]">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-800">
            Directory
          </Link>{" "}
          / <span className="text-zinc-700">{topic.title}</span>
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {topic.title}
        </h1>
        {topic.author && <p className="mt-2 text-sm text-zinc-500">By {topic.author}</p>}

        {hero && (
          <figure className="mt-6 max-w-3xl">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <Image
                src={`/api/assets/${hero.id}/`}
                alt={hero.alt || hero.title || ""}
                title={hero.title || undefined}
                fill
                sizes="(min-width: 1024px) 768px, 100vw"
                className="object-cover"
              />
            </div>
            {hero.caption && <figcaption className="mt-2 text-xs text-zinc-500">{hero.caption}</figcaption>}
          </figure>
        )}

        {intro && (
          <div
            className="prose-sm mt-6 max-w-3xl text-zinc-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(intro) }}
          />
        )}

        {sections.map((section, i) => (
          <section key={i} className="mt-10 max-w-3xl">
            {section.title && (
              <h2 className="text-xl font-semibold text-zinc-900">{section.title}</h2>
            )}
            <div
              className="prose-sm mt-3 text-zinc-700"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderLocalizedContent(section.content, ctx)) }}
            />
          </section>
        ))}

        {topic.geoCategory && (
          <section className="mt-12 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-900">{topic.geoCategory.title}</h2>
            {topic.geoCategory.description && (
              <p className="mt-2 text-sm text-zinc-600">
                {renderLocalizedContent(topic.geoCategory.description, {})}
              </p>
            )}
            {geoStates.length > 0 ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {geoStates.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/g/${topic.geoCategory!.slug}/${s.slug}/`}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-300"
                    >
                      <span className="font-medium text-zinc-800">{s.stateFull}</span>
                      <span className="text-sm text-zinc-400">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href={`/g/${topic.geoCategory.slug}/`}
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Browse {topic.geoCategory.title} &rsaquo;
            </Link>
          </section>
        )}

        {topic.contentTemplates.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-zinc-900">Related SubTopics</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {topic.contentTemplates.map((st) => (
                <li key={st.id}>
                  <Link
                    href={`/subtopic/${st.slug}/`}
                    className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300"
                  >
                    <span className="font-medium text-zinc-800">{st.title}</span>
                    {st.metaDesc && (
                      <span className="mt-1 block text-sm text-zinc-500">{st.metaDesc}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {topic.jsonSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: topic.jsonSchema }}
          />
        )}
      </div>
    </article>
  );
}
