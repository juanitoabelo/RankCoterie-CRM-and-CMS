import { prisma } from "@/lib/directory/prismaCatalog";
import { createArticleForm, deleteArticleForm } from "./actions";

export const revalidate = 0;

export default async function ArticlesAdminPage() {
  const articles = await prisma.contentTemplate.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      category: { select: { title: true } },
      variants: { select: { id: true, regionId: true, status: true } },
    },
  });

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Articles</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Articles</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Create and manage articles. Use <code className="rounded bg-zinc-100 px-1">{"{{region}}"}</code> tokens
        in the body to auto-localize content per region. Publish to generate
        region-specific variants.
      </p>

      <form
        action={createArticleForm}
        className="mt-8 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-medium text-zinc-900">Create article</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            name="title"
            placeholder="Article title *"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <textarea
            name="body"
            placeholder="Body HTML *"
            required
            rows={1}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="metaDesc"
            placeholder="Meta description (optional)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Create
          </button>
        </div>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Variants</th>
              <th className="px-4 py-2.5">Updated</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {articles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No articles yet.
                </td>
              </tr>
            )}
            {articles.map((a) => (
              <tr key={a.id} className={a.status === "LIVE" ? "" : "opacity-50"}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <a
                    href={`/admin/articles/${a.id}/edit`}
                    className="underline underline-offset-2 hover:text-zinc-600"
                  >
                    {a.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {a.category?.title ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === "LIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : a.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : a.status === "SCHEDULED"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {a.variants.length} region{a.variants.length !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {a.updatedAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteArticleForm.bind(null, a.id)}>
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
