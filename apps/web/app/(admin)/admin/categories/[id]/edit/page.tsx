import { prisma } from "@/lib/directory/prismaCatalog";
import CategoryForm from "@/components/admin/CategoryForm";

export const revalidate = 0;

export default async function CategoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [category, allCategories] = await Promise.all([
    prisma.category.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { slug: "asc" } }),
  ]);

  if (!category) {
    return <p className="text-sm text-zinc-500">Category not found.</p>;
  }

  const formCategories = allCategories.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/categories" className="hover:text-zinc-700">Categories</a> /{" "}
        <span className="text-zinc-700">{category.title}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit category</h1>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <CategoryForm
          category={{ id: category.id, slug: category.slug, title: category.title }}
          allCategories={formCategories}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
