import { prisma } from "@/lib/directory/prismaCatalog";
import { createCategoryForm, deleteCategoryForm } from "./actions";

export const revalidate = 0;

export default async function CategoriesAdminPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ status: "asc" }, { slug: "asc" }],
    include: { parent: { select: { id: true, title: true } } },
  });

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Categories</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Categories</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Manage directory categories. Each listing must belong to at least one category.
        Categories appear as top-level URL paths (<code>/g/[category]</code>).
      </p>

      <form
        action={createCategoryForm}
        className="mt-8 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-medium text-zinc-900">Add category</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            name="title"
            placeholder="Title *"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="slug"
            placeholder="Slug * (lowercase, hyphens)"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select
            name="parentId"
            defaultValue=""
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">No parent (top-level)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue="LIVE"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="LIVE">LIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Create category
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Slug</th>
              <th className="px-4 py-2.5">Parent</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No categories yet.
                </td>
              </tr>
            )}
            {categories.map((c) => (
              <tr
                key={c.id}
                className={c.status === "LIVE" ? "" : "opacity-50"}
              >
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <a
                    href={`/admin/categories/${c.id}/edit`}
                    className="underline underline-offset-2 hover:text-zinc-600"
                  >
                    {c.title}
                  </a>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {c.slug}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {c.parent?.title ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === "LIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : c.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteCategoryForm.bind(null, c.id)}>
                    <button
                      type="submit"
                      className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
