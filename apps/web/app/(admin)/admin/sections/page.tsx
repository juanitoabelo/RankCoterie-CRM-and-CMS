import Link from "next/link";
import {
  ListToolbar,
  Pagination,
  SortableTh,
  parseListParams,
  sortableSort,
} from "@/components/admin/listing";
import { listSections } from "./actions";

export const revalidate = 0;

const SORTABLE = ["title", "slug", "order", "status", "updatedAt", "createdAt"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SectionsAdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = parseListParams((await searchParams) ?? {}, {
    filterKeys: ["status"],
  });
  const sort = sortableSort(params.sort, params.dir, SORTABLE);

  const { items: sections, total } = await listSections({
    q: params.q,
    status: params.filters.status ?? "",
    page: params.page,
    pageSize: params.pageSize,
    sort: sort?.field ?? "",
    dir: sort?.dir ?? "asc",
  });

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Content</span> /{" "}
        <span className="text-zinc-700">Sections</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Sections</h1>

      <ListToolbar
        basePath="/admin/sections"
        params={params}
        total={total}
        noun="sections"
        placeholder="Search by title or slug..."
      >
        <div>
          <label
            htmlFor="section-status"
            className="block text-sm font-medium text-zinc-800"
          >
            Status
          </label>
          <select
            id="section-status"
            name="status"
            defaultValue={params.filters.status ?? ""}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="LIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="HIDDEN">Hidden</option>
          </select>
        </div>
      </ListToolbar>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit Section</th>
              <SortableTh field="title" label="Section Title" basePath="/admin/sections" params={params} />
              <th className="px-4 py-2.5">View Page</th>
              <th className="px-4 py-2.5 text-right">ID#</th>
              <SortableTh field="status" label="Status" basePath="/admin/sections" params={params} />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sections.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No sections found.
                </td>
              </tr>
            )}
            {sections.map((s) => (
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
                  {s.category ? (
                    <a
                      href={`/g/${s.category.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View page
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
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

      <Pagination basePath="/admin/sections" params={params} total={total} />
    </div>
  );
}
