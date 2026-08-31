import { prisma } from "@/lib/directory/prismaCatalog";
import { createTemplateForm, deleteTemplateForm } from "./actions";

export const revalidate = 0;

export default async function TemplatesAdminPage() {
  const templates = await prisma.contentTemplate.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      category: { select: { title: true } },
      variants: { select: { id: true } },
    },
  });

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Templates</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Content Templates</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Reusable content blocks with <code className="rounded bg-zinc-100 px-1">{"{{region}}"}</code> tokens.
        Publish to generate per-region variants. Use for category descriptions,
        region intros, and other repeatable content.
      </p>

      <form
        action={createTemplateForm}
        className="mt-8 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-medium text-zinc-900">Create template</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            name="title"
            placeholder="Template title *"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <textarea
            name="body"
            placeholder="Body with tokens *"
            required
            rows={1}
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
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No templates yet.
                </td>
              </tr>
            )}
            {templates.map((t) => (
              <tr key={t.id} className={t.status === "LIVE" ? "" : "opacity-50"}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <a
                    href={`/admin/templates/${t.id}/edit`}
                    className="underline underline-offset-2 hover:text-zinc-600"
                  >
                    {t.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {t.category?.title ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.status === "LIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : t.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {t.variants.length} region{t.variants.length !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {t.updatedAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteTemplateForm.bind(null, t.id)}>
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
