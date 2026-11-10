import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { sanitizeHtml } from "@/lib/style-guide";
import { asCustomPostValues, getPublicCustomFields } from "@/lib/custom-posts/public-fields";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; slug: string }> },
) {
  const { type, slug } = await params;
  const post = await prisma.customPost.findFirst({
    where: {
      tenantId: TENANT_ID,
      slug,
      status: "PUBLISHED",
      postType: { is: { tenantId: TENANT_ID, slug: type, isPublic: true, showInRest: true } },
    },
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
      comments: {
        where: { status: "APPROVED" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, name: true, body: true, createdAt: true },
      },
      postType: { select: { id: true, slug: true, fieldGroupIds: true } },
    },
  });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
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
  const { values, postType, ...publicPost } = post;
  return NextResponse.json({
    post: {
      ...publicPost,
      excerpt: publicPost.excerpt ? sanitizeHtml(publicPost.excerpt) : null,
      body: publicPost.body ? sanitizeHtml(publicPost.body) : null,
      customFields: getPublicCustomFields(
        fieldGroups.map((group) => group.fields),
        asCustomPostValues(values),
      ),
    },
  });
}
