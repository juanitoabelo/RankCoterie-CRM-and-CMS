import Link from "next/link";
import { listWidgets } from "./actions";

export const revalidate = 0;

export default async function WidgetsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const widgets = await listWidgets();

  const filtered = query
    ? widgets.filter((w) => (w.title ?? w.name).toLowerCase().includes(query.toLowerCase()))
    : widgets;

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Widget Builder</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Widgets</h1>

      <form className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Search Widgets</label>
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
            VIEW WIDGETS
          </button>
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Results</h2>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit Widget</th>
              <th className="px-4 py-2.5">Widget Title</th>
              <th className="px-4 py-2.5">Widget URL</th>
              <th className="px-4 py-2.5">Widget ID</th>
              <th className="px-4 py-2.5">Featured Img?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No widgets found.
                </td>
              </tr>
            )}
            {filtered.map((w) => (
              <tr key={w.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/widgets/${w.id}/edit`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    ✎ Edit
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900">{w.title ?? w.name}</td>
                <td className="px-4 py-3">
                  {w.url ? (
                    <a
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {w.url} ↗
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600">{w.id.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  {w.imageAsset ? (
                    <span className="text-sm font-medium text-emerald-600">YES</span>
                  ) : (
                    <span className="text-sm text-zinc-400">NO</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
