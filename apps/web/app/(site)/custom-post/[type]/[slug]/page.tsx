import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma, TENANT_ID } from "@/modules/shared";
import { resolveBlogTemplate, parseBlogTemplateData } from "@/modules/blog-template";
import BlogTemplateRenderer from "@/components/admin/blog-template-builder/BlogTemplateRenderer";
import { sanitizeHtml } from "@/lib/style-guide";
import { asCustomPostValues, getPublicCustomFields } from "@/lib/custom-posts/public-fields";
import CustomPostComments from "@/app/(site)/components/CustomPostComments";

export const revalidate = 0;

type Props = { params: Promise<{ type: string; slug: string }> };

async function getPublishedCustomPost(typeSlug: string, postSlug: string) {
  return prisma.customPost.findFirst({
    where: {
      tenantId: TENANT_ID,
      slug: postSlug,
      status: "PUBLISHED",
      postType: { is: { tenantId: TENANT_ID, slug: typeSlug, isPublic: true } },
    },
    include: {
      postType: {
        select: {
          id: true,
          name: true,
          singularLabel: true,
          slug: true,
          rewriteSlug: true,
          defaultTemplateId: true,
          coreFields: true,
          fieldGroupIds: true,
        },
      },
      featuredImage: { select: { id: true, alt: true, caption: true } },
      customTerm: { select: { name: true, slug: true } },
      author: { select: { firstName: true, lastName: true, authorBio: true, imageUrl: true } },
      parent: { select: { title: true, slug: true, status: true } },
      comments: {
        where: { status: "APPROVED" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, name: true, body: true, createdAt: true },
      },
    },
  });
}

function parseKeywords(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((keyword): keyword is string => typeof keyword === "string") : [];
  } catch (error) {
    console.error("Could not parse custom post SEO keywords.", error);
    return [];
  }
}

function jsonLd(raw: string | null, postId: string): string | null {
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw)).replace(/</g, "\\u003c");
  } catch (error) {
    console.error(`Could not parse structured data for custom post "${postId}".`, error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, slug } = await params;
  const post = await getPublishedCustomPost(type, slug);
  if (!post) return { title: "Page not found" };

  const title = post.seoTitle || post.title;
  const description = post.metaDesc || post.excerpt || undefined;
  const image = post.ogImage || (post.featuredImage ? `/api/assets/${post.featuredImage.id}` : undefined);
  const keywords = parseKeywords(post.metaKeywords);
  return {
    title,
    description,
    ...(keywords.length > 0 ? { keywords } : {}),
    robots: { index: post.robotsIndex, follow: post.robotsFollow },
    alternates: post.canonicalUrl ? { canonical: post.canonicalUrl } : undefined,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function CustomPostPage({ params }: Props) {
  const { type, slug } = await params;
  const post = await getPublishedCustomPost(type, slug);
  if (!post) notFound();

  const customValues = asCustomPostValues(post.values);
  const fieldGroups = await prisma.customFieldGroup.findMany({
    where: {
      tenantId: TENANT_ID,
      OR: [
        { id: { in: post.postType.fieldGroupIds } },
        { contentTypes: { has: post.postType.slug } },
      ],
    },
    select: { fields: true },
  });
  const publicCustomFields = getPublicCustomFields(fieldGroups.map((group) => group.fields), customValues);
  const path = `/custom-post/${post.postType.slug}/${post.slug}`;
  const [assignedTemplate, typeTemplate, defaultTemplate] = await Promise.all([
    post.templateId && post.postType.coreFields.includes("template")
      ? prisma.blogTemplate.findFirst({
        where: {
          id: post.templateId,
          tenantId: TENANT_ID,
          type: "single",
          OR: [{ customPostTypeId: post.postType.id }, { customPostTypeId: null }],
        },
        select: { data: true },
      })
    : Promise.resolve(null),
    post.postType.defaultTemplateId
    ? prisma.blogTemplate.findFirst({
        where: {
          id: post.postType.defaultTemplateId,
          tenantId: TENANT_ID,
          type: "single",
          OR: [{ customPostTypeId: post.postType.id }, { customPostTypeId: null }],
        },
          select: { data: true },
        })
      : Promise.resolve(null),
    resolveBlogTemplate("single", {
      pageId: post.id,
      pageType: post.postType.slug,
      pathname: path,
    }),
  ]);
  const template = assignedTemplate ?? typeTemplate ?? defaultTemplate;
  const templateData = template ? parseBlogTemplateData(template.data) : null;
  const structuredData = jsonLd(post.jsonSchema, post.id);

  return (
    <>
      {templateData && templateData.blocks.length > 0 ? (
        <article className="py-12">
          <BlogTemplateRenderer
            blocks={templateData.blocks}
            containerSettings={templateData.containerSettings}
            article={{
              id: post.id,
              title: post.title,
              slug: post.slug,
              articleUrl: path,
              body: post.body,
              excerpt: post.excerpt,
              metaDesc: post.metaDesc,
              seoTitle: post.seoTitle,
              focusKeyphrase: post.focusKeyphrase,
              author: [post.author?.firstName, post.author?.lastName].filter(Boolean).join(" ") || null,
              ogImage: post.ogImage || (post.featuredImage ? `/api/assets/${post.featuredImage.id}` : null),
              featuredImage: post.featuredImage ? `/api/assets/${post.featuredImage.id}` : null,
              featuredImageAlt: post.featuredImage?.alt,
              featuredImageCaption: post.featuredImage?.caption,
              category: post.customTerm ? { title: post.customTerm.name, name: post.customTerm.name, slug: post.customTerm.slug } : null,
              customFields: publicCustomFields,
              createdAt: post.createdAt,
            }}
            templateType="single"
          />
        </article>
      ) : (
        <main className="mx-auto max-w-4xl px-4 py-12">
          <nav className="mb-6 text-sm text-zinc-500">
            <Link href="/" className="hover:underline">Home</Link>
            {" / "}
            <Link href={`/${post.postType.rewriteSlug || post.postType.slug}`} className="hover:underline">{post.postType.pluralLabel || post.postType.name}</Link>
            {post.parent?.status === "PUBLISHED" && (
              <>
                {" / "}
                <Link href={`/custom-post/${post.postType.slug}/${post.parent.slug}`} className="hover:underline">{post.parent.title}</Link>
              </>
            )}
          </nav>
          <article>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{post.title}</h1>
            {post.customTerm && (
              <p className="mt-3 text-sm text-zinc-500">in {post.customTerm.name}</p>
            )}
            {post.postType.coreFields.includes("author") && post.author && (
              <div className="mt-4 flex items-center gap-3 text-sm text-zinc-600">
                {post.author.imageUrl && <Image src={post.author.imageUrl} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover" />}
                <div>
                  <p className="font-medium text-zinc-800">
                    {[post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || "Author"}
                  </p>
                  {post.author.authorBio && <p className="mt-1 max-w-prose">{post.author.authorBio}</p>}
                </div>
              </div>
            )}
            {post.featuredImage && (
              <div className="relative mt-8 aspect-[1.91/1] w-full overflow-hidden rounded-xl">
                <Image
                  src={`/api/assets/${post.featuredImage.id}`}
                  alt={post.featuredImage.alt ?? post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="object-cover"
                />
              </div>
            )}
            {post.excerpt && (
              <div className="prose prose-zinc mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.excerpt) }} />
            )}
            {post.body && (
              <div className="prose prose-zinc mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body) }} />
            )}
          </article>
          {post.postType.coreFields.includes("comments") && (
            <CustomPostComments
              typeSlug={post.postType.slug}
              postSlug={post.slug}
              comments={post.comments}
            />
          )}
        </main>
      )}
      {templateData && templateData.blocks.length > 0 && post.postType.coreFields.includes("comments") && (
        <div className="mx-auto max-w-6xl px-4 pb-12">
          <CustomPostComments
            typeSlug={post.postType.slug}
            postSlug={post.slug}
            comments={post.comments}
          />
        </div>
      )}
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      )}
    </>
  );
}
