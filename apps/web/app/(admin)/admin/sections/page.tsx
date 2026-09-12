import Link from "next/link";
import { listSections } from "./actions";

export const revalidate = 0;

export default async function SectionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const sections = await listSections();

  const filtered = statusFilter
    ? sections.filter((s) => s.status === statusFilter)
    : sections;

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Content</span> /{" "}
        <span className="text-zinc-700">Sections</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Sections</h1>

      <form className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Search Sections</label>
        <select
          name="status"
          defaultValue={statusFilter}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="LIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="HIDDEN">Hidden</option>
        </select>
        <div className="mt-4">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            VIEW SECTIONS
          </button>
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Results</h2>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit Section</th>
              <th className="px-4 py-2.5">Section Title</th>
              <th className="px-4 py-2.5">View Page</th>
              <th className="px-4 py-2.5 text-right">ID#</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No sections found.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/sections/${s.id}/edit`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900">{s.title}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/feed/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View page
                  </a>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                  {s.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.status === "LIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : s.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {s.status === "LIVE" ? "Active" : s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
