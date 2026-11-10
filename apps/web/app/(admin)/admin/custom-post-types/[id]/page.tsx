import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { getCustomPostTypeData } from "../../custom-fields/actions";
import { prisma, TENANT_ID } from "@/modules/shared";
import CustomPostTypeEntries from "./CustomPostTypeEntries";

export const revalidate = 0;

export default async function CustomPostTypePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("general");
  const { id } = await params;
  const data = await getCustomPostTypeData(id);
  if (!data) notFound();

  // Seed category/template options for the entries form (loaded once server-side).
  const [categories, templates] = await Promise.all([
    prisma.customPostTerm.findMany({
      where: { tenantId: TENANT_ID, postTypeId: id, taxonomy: "category" },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.blogTemplate.findMany({
      where: {
        tenantId: TENANT_ID,
        type: "single",
        OR: [
          { customPostTypeId: id },
          {
            id: { in: data.posts.flatMap((post) => post.templateId ? [post.templateId] : []) },
            customPostTypeId: null,
          },
        ],
      },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <Link href="/admin/custom-fields" className="hover:underline">System Tools / Custom Fields &amp; Post Types</Link> / {data.name}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{data.name}</h1>
          {data.description && <p className="mt-1 text-sm text-zinc-600">{data.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {data.coreFields.includes("comments") && (
            <Link href={`/admin/custom-post-types/${id}/comments`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">
              Manage comments
            </Link>
          )}
          {data.isPublic && data.hasArchive && (
            <Link
              href={`/${data.rewriteSlug || data.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              View archive
            </Link>
          )}
          <Link href="/admin/custom-fields" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Back to System Tools</Link>
        </div>
      </div>
      <div className="mt-6">
        <CustomPostTypeEntries postType={{
          ...data,
          categories: categories.map((category) => ({ id: category.id, title: category.name, slug: category.slug })),
          templates,
        }} />
      </div>
    </div>
  );
}
