import { prisma } from "@/modules/shared";
import { renderLocalizedContent } from "@/lib/localization/render";
import type { Metadata } from "next";
import { resolveBlogTemplate, parseBlogTemplateData } from "@/modules/blog-template";
import BlogTemplateRenderer from "@/components/admin/blog-template-builder/BlogTemplateRenderer";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Blog | Canopy Directory",
    description: "Read the latest articles and insights from Canopy Directory.",
  };
}

export default async function BlogPage() {
  // Resolve the blog listing template
  let blocks: import("@/lib/blog-template/types").BlogTemplateBlock[] = [];
  let containerSettings: import("@/lib/blog-template/types").ContainerSettings | undefined;

  try {
    const template = await resolveBlogTemplate("listing", { pathname: "/blog" });
    if (template) {
      const parsed = parseBlogTemplateData(template.data);
      blocks = parsed.blocks;
      containerSettings = parsed.containerSettings;
    }
  } catch {
    // Blog template model may not exist yet
  }

  // Fetch articles for the blog post grid
  const articles = await prisma.contentTemplate.findMany({
    where: { status: "LIVE" },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      category: { select: { slug: true, title: true } },
    },
  });

  return (
    <div>
      {blocks.length > 0 ? (
        <BlogTemplateRenderer
          blocks={blocks}
          containerSettings={containerSettings}
          articles={articles}
          templateType="listing"
        />
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-bold text-zinc-900">Blog</h1>
          {articles.length === 0 ? (
            <p className="mt-4 text-zinc-500">No articles published yet.</p>
          ) : (
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={`/article/${article.slug}`}
                  className="group rounded-lg border border-zinc-200 bg-white p-6 transition hover:shadow-md"
                >
                  {article.ogImage && (
                    <img
                      src={article.ogImage}
                      alt={article.title}
                      className="mb-4 h-48 w-full rounded object-cover"
                    />
                  )}
                  {article.category && (
                    <span className="text-xs font-medium uppercase text-amber-600">
                      {article.category.title}
                    </span>
                  )}
                  <h2 className="mt-2 text-lg font-semibold text-zinc-900 group-hover:text-amber-600">
                    {article.title}
                  </h2>
                  {article.metaDesc && (
                    <p className="mt-2 text-sm text-zinc-500 line-clamp-2">
                      {article.metaDesc}
                    </p>
                  )}
                  <time className="mt-3 block text-xs text-zinc-400">
                    {new Date(article.createdAt).toLocaleDateString()}
                  </time>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
