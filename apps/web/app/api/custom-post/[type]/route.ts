import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { sanitizeHtml } from "@/lib/style-guide";
import { asCustomPostValues, getPublicCustomFields } from "@/lib/custom-posts/public-fields";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const postType = await prisma.customPostType.findFirst({
    where: { tenantId: TENANT_ID, slug: type, isPublic: true, showInRest: true },
    select: {
      id: true,
      name: true,
      singularLabel: true,
      pluralLabel: true,
      slug: true,
      fieldGroupIds: true,
    },
  });
  if (!postType) return NextResponse.json({ error: "Custom post type not found." }, { status: 404 });

  const [posts, fieldGroups] = await Promise.all([
    prisma.customPost.findMany({
      where: { tenantId: TENANT_ID, postTypeId: postType.id, status: "PUBLISHED" },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        body: true,
        values: true,
        updatedAt: true,
        customTerm: { select: { name: true, slug: true } },
        author: { select: { firstName: true, lastName: true, authorBio: true, imageUrl: true } },
      },
    }),
    prisma.customFieldGroup.findMany({
      where: {
        tenantId: TENANT_ID,
        OR: [
          { id: { in: postType.fieldGroupIds } },
          { contentTypes: { has: postType.slug } },
        ],
      },
      select: { fields: true },
    }),
  ]);
  const publicFieldGroups = fieldGroups.map((group) => group.fields);
  return NextResponse.json({
    postType: {
      id: postType.id,
      name: postType.name,
      singularLabel: postType.singularLabel,
      pluralLabel: postType.pluralLabel,
      slug: postType.slug,
    },
    posts: posts.map(({ values, ...post }) => ({
      ...post,
      excerpt: post.excerpt ? sanitizeHtml(post.excerpt) : null,
      body: post.body ? sanitizeHtml(post.body) : null,
      customFields: getPublicCustomFields(publicFieldGroups, asCustomPostValues(values)),
    })),
  });
}
