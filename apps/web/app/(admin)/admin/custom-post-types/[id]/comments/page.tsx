import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { listCustomPostComments } from "../../../custom-fields/actions";
import CommentsModeration from "./CommentsModeration";

export const revalidate = 0;

export default async function CustomPostTypeCommentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSection("general");
  const { id } = await params;
  const postType = await prisma.customPostType.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { name: true, slug: true, singularLabel: true, pluralLabel: true },
  });
  if (!postType) notFound();
  const comments = await listCustomPostComments(id);
  if (!comments) notFound();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <Link href={`/admin/custom-post-types/${id}`} className="hover:underline">{postType.name}</Link> / Comments
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        {postType.pluralLabel || postType.name} comments
      </h1>
      <p className="mt-2 text-sm text-zinc-600">Review, approve, mark as spam, or delete comments submitted on this post type.</p>
      <CommentsModeration postTypeId={id} postTypeSlug={postType.slug} comments={comments} />
    </div>
  );
}
