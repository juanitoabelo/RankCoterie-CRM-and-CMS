import type { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import {
  ListToolbar,
  Pagination,
  SortableTh,
  parseListParams,
  sortableSort,
} from "@/components/admin/listing";
import SubmitButton from "@/components/admin/SubmitButton";
import { createPageForm, deletePageForm } from "./actions";

export const revalidate = 0;

const SORTABLE = ["name", "slug", "status", "updatedAt"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PagesAdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = parseListParams((await searchParams) ?? {});

  const where: Prisma.PageWhereInput = {
    tenantId: TENANT_ID,
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { slug: { contains: params.q, mode: "insensitive" } },
            { title: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const sort = sortableSort(params.sort, params.dir, SORTABLE);
  const orderBy: Prisma.PageOrderByWithRelationInput[] = sort
    ? [{ [sort.field]: sort.dir } as Prisma.PageOrderByWithRelationInput, { id: "asc" }]
    : [{ status: "asc" }, { name: "asc" }];

  // Only the columns the table renders — `data` (builder JSON) is the heavy
  // one and is never shown here.
  const [pages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: { id: true, name: true, slug: true, status: true, updatedAt: true },
    }),
    prisma.page.count({ where }),
  ]);

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Pages</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Pages</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Build and manage pages with the visual drag-and-drop editor.
        Each page is accessible at <code>/[slug]</code>.
      </p>

      <form
        action={createPageForm}
        className="mt-8 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-medium text-zinc-900">Create page</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            name="name"
            placeholder="Internal name *"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="slug"
            placeholder="URL slug *"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="title"
            placeholder="Page title (optional)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <SubmitButton pendingText="Creating…">Create</SubmitButton>
        </div>
      </form>

      <ListToolbar basePath="/admin/pages" params={params} total={total} noun="pages" />

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <SortableTh field="name" label="Name" basePath="/admin/pages" params={params} />
              <SortableTh field="slug" label="Slug" basePath="/admin/pages" params={params} />
              <SortableTh field="status" label="Status" basePath="/admin/pages" params={params} />
              <SortableTh field="updatedAt" label="Updated" basePath="/admin/pages" params={params} />
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No pages found.
                </td>
              </tr>
            )}
            {pages.map((p) => (
              <tr key={p.id} className={p.status === "LIVE" ? "" : "opacity-50"}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <a
                    href={`/admin/pages/${p.id}/edit`}
                    className="underline underline-offset-2 hover:text-zinc-600"
                  >
                    {p.name}
                  </a>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  /{p.slug}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "LIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : p.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {p.updatedAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deletePageForm.bind(null, p.id)}>
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

      <Pagination basePath="/admin/pages" params={params} total={total} />
    </div>
  );
}
