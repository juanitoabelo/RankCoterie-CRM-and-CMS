import Link from "next/link";
import { listCategories } from "./actions";

export const revalidate = 0;

export default async function TopicsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const categories = await listCategories();

  const filtered = query
    ? categories.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    : categories;

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Content</span> /{" "}
        <span className="text-zinc-700">Topics</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Topics</h1>

      <form className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Search Topics</label>
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by title..."
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <div className="mt-4">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            VIEW TOPICS
          </button>
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Results</h2>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit Topic</th>
              <th className="px-4 py-2.5">Topic Title</th>
              <th className="px-4 py-2.5">View Page</th>
              <th className="px-4 py-2.5">Author</th>
              <th className="px-4 py-2.5">Image?</th>
              <th className="px-4 py-2.5 text-right">ID#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No topics found.
                </td>
              </tr>
            )}
            {filtered.map((cat) => {
              const primaryImage = cat.images?.[0]?.imageAsset?.id ?? null;
              return (
                <tr key={cat.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/categories/${cat.id}/edit`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{cat.title}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/g/${cat.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View page
                    </a>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{cat.author ?? "—"}</td>
                  <td className="px-4 py-3">
                    {primaryImage ? (
                      <img
                        src={`/api/assets/${primaryImage}`}
                        alt=""
                        className="h-10 w-10 rounded border border-zinc-200 object-cover"
                      />
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                    {cat.id.slice(0, 8)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
