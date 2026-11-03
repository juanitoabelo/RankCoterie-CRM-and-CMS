import { getArticlesForAdmin } from "@/modules/content";
import {
  ListToolbar,
  Pagination,
  SortableTh,
  parseListParams,
  sortableSort,
} from "@/components/admin/listing";
import ImageUploader from "@/components/admin/ImageUploader";
import SubmitButton from "@/components/admin/SubmitButton";
import { createArticleForm, deleteArticleForm } from "./actions";

export const revalidate = 0;

const SORTABLE = ["title", "slug", "status", "author", "updatedAt", "createdAt"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ArticlesAdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = parseListParams((await searchParams) ?? {});
  const sort = sortableSort(params.sort, params.dir, SORTABLE);

  const { items: articles, total } = await getArticlesForAdmin({
    q: params.q,
    page: params.page,
    pageSize: params.pageSize,
    sort: sort?.field ?? "",
    dir: sort?.dir ?? "asc",
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
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-article-title" className="block text-sm font-medium text-zinc-800">
              Article title <span aria-hidden="true">*</span>
            </label>
            <input
              id="new-article-title"
              name="title"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="new-article-meta-desc" className="block text-sm font-medium text-zinc-800">
              Meta Description
            </label>
            <textarea
              id="new-article-meta-desc"
              name="metaDesc"
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="new-article-body" className="block text-sm font-medium text-zinc-800">
              Body HTML <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="new-article-body"
              name="body"
              required
              rows={8}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-zinc-200 p-4">
            <h3 className="text-sm font-medium text-zinc-800">Featured image</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Recommended dimensions: 1200 × 630 px (1.91:1 landscape).
            </p>
            <div className="mt-3">
              <ImageUploader name="featuredImageAssetId" label="Upload featured image" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Creating…">Create</SubmitButton>
          </div>
        </div>
      </form>

      <ListToolbar basePath="/admin/articles" params={params} total={total} noun="articles" />

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <SortableTh field="title" label="Title" basePath="/admin/articles" params={params} />
              <th className="px-4 py-2.5">Category</th>
              <SortableTh field="status" label="Status" basePath="/admin/articles" params={params} />
              <th className="px-4 py-2.5">Variants</th>
              <SortableTh field="updatedAt" label="Updated" basePath="/admin/articles" params={params} />
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {articles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No articles found.
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
                  {a._count.variants} region{a._count.variants !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {a.updatedAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteArticleForm.bind(null, a.id)}>
                    <SubmitButton
                      pendingText="Deleting…"
                      className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800 disabled:no-underline"
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/articles" params={params} total={total} />
    </div>
  );
}
