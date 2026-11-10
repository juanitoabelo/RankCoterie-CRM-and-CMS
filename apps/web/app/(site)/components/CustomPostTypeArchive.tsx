import Link from "next/link";
import Image from "next/image";
import { prisma, TENANT_ID } from "@/modules/shared";
import { sanitizeHtml } from "@/lib/style-guide";

export async function getCustomPostTypeArchive(typeSlug: string) {
  return prisma.customPostType.findFirst({
    where: { tenantId: TENANT_ID, OR: [{ slug: typeSlug }, { rewriteSlug: typeSlug }] },
    select: {
      name: true,
      slug: true,
      singularLabel: true,
      pluralLabel: true,
      archivesLabel: true,
      description: true,
      isPublic: true,
      hasArchive: true,
      rewriteSlug: true,
      showInRest: true,
      posts: {
        where: { tenantId: TENANT_ID, status: "PUBLISHED" },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          parentId: true,
          parent: { select: { title: true, status: true } },
          excerpt: true,
          featuredImageAssetId: true,
          updatedAt: true,
        },
      },
    },
  });
}

type CustomPostTypeArchiveData = NonNullable<Awaited<ReturnType<typeof getCustomPostTypeArchive>>>;

export function CustomPostTypeArchiveContent({ postType }: { postType: CustomPostTypeArchiveData }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <span className="text-zinc-700">{postType.name}</span>
      </nav>
      <h1 className="text-3xl font-bold text-zinc-900">{postType.archivesLabel || postType.pluralLabel || postType.name}</h1>
      {postType.description && <p className="mt-2 max-w-3xl text-zinc-600">{postType.description}</p>}

      {postType.posts.length === 0 ? (
        <p className="mt-8 text-zinc-500">No entries have been published yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {postType.posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <Link href={`/custom-post/${postType.slug}/${post.slug}`} className="group block">
                {post.featuredImageAssetId && (
                  <div className="relative aspect-[1.91/1] w-full">
                    <Image
                      src={`/api/assets/${post.featuredImageAssetId}`}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-amber-700">{post.title}</h2>
                  {post.parent?.status === "PUBLISHED" && <p className="mt-1 text-xs text-zinc-500">Under {post.parent.title}</p>}
                  {post.excerpt && (
                    <div
                      className="prose prose-sm mt-2 line-clamp-3 max-w-none text-zinc-600"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.excerpt) }}
                    />
                  )}
                  <time dateTime={post.updatedAt.toISOString()} className="mt-4 block text-xs text-zinc-400">
                    {post.updatedAt.toLocaleDateString()}
                  </time>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
