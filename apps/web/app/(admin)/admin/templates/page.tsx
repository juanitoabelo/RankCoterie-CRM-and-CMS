import Link from "next/link";
import {
  ListToolbar,
  Pagination,
  SortableTh,
  parseListParams,
  sortableSort,
} from "@/components/admin/listing";
import { listSubTopics } from "./actions";

export const revalidate = 0;

const SORTABLE = ["title", "slug", "status", "author", "updatedAt", "createdAt"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SubTopicsListPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = parseListParams((await searchParams) ?? {});
  const sort = sortableSort(params.sort, params.dir, SORTABLE);

  const { items: subtopics, total } = await listSubTopics({
    q: params.q,
    page: params.page,
    pageSize: params.pageSize,
    sort: sort?.field ?? "",
    dir: sort?.dir ?? "asc",
  });

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Content</span> /{" "}
        <span className="text-zinc-700">SubTopics</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">SubTopics</h1>

      <ListToolbar
        basePath="/admin/templates"
        params={params}
        total={total}
        noun="subtopics"
        placeholder="Search by title..."
      />

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit Page</th>
              <SortableTh field="title" label="SubTopic Title" basePath="/admin/templates" params={params} />
              <th className="px-4 py-2.5">View Page</th>
              <SortableTh field="author" label="Author" basePath="/admin/templates" params={params} />
              <th className="px-4 py-2.5">Image?</th>
              <th className="px-4 py-2.5 text-right">ID#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {subtopics.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No subtopics found.
                </td>
              </tr>
            )}
            {subtopics.map((st) => (
              <tr key={st.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/templates/${st.id}/edit`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900">{st.title}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/subtopic/${st.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View page
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-600">{st.author ?? "—"}</td>
                <td className="px-4 py-3">
                  {st.featuredImage ? (
                    <img
                      src={`/api/assets/${st.featuredImage.id}`}
                      alt=""
                      className="h-10 w-10 rounded border border-zinc-200 object-cover"
                    />
                  ) : (
                    <span className="inline-block rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                      HAS NO IMAGE
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                  {st.id.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/templates" params={params} total={total} />
    </div>
  );
}
