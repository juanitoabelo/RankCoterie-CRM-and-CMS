import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import {
  ListToolbar,
  Pagination,
  SortableTh,
  parseListParams,
  sortableSort,
} from "@/components/admin/listing";

export const revalidate = 0;

const SORTABLE = ["state", "city", "priority", "createdAt"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function RegionsListPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = parseListParams((await searchParams) ?? {}, {
    filterKeys: ["state"],
  });
  const sort = sortableSort(params.sort, params.dir, SORTABLE);

  const where: Prisma.RegionWhereInput = {
    tenantId: TENANT_ID,
    ...(params.filters.state ? { state: params.filters.state } : {}),
    ...(params.q
      ? {
          OR: [
            { state: { contains: params.q, mode: "insensitive" } },
            { stateFull: { contains: params.q, mode: "insensitive" } },
            { city: { contains: params.q, mode: "insensitive" } },
            { slug: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.RegionOrderByWithRelationInput[] = sort
    ? [{ [sort.field]: sort.dir } as Prisma.RegionOrderByWithRelationInput, { id: "asc" }]
    : [{ state: "asc" }, { city: "asc" }, { id: "asc" }];

  // Row list, total and the state dropdown resolve together instead of the
  // previous three sequential round-trips (which also scanned every row to
  // build the dropdown).
  const [regions, total, stateRows] = await Promise.all([
    prisma.region.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        state: true,
        city: true,
        custom1: true,
        custom2: true,
        priority: true,
      },
    }),
    prisma.region.count({ where }),
    prisma.region.findMany({
      where: { tenantId: TENANT_ID },
      distinct: ["state"],
      orderBy: { state: "asc" },
      select: { state: true },
    }),
  ]);
  const states = stateRows.map((r) => r.state);

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Regions</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Regions</h1>

      <ListToolbar
        basePath="/admin/regions"
        params={params}
        total={total}
        noun="regions"
        placeholder="Search state, city or slug..."
      >
        <div>
          <label
            htmlFor="region-state"
            className="block text-sm font-medium text-zinc-800"
          >
            In State
          </label>
          <select
            id="region-state"
            name="state"
            defaultValue={params.filters.state ?? "ALL"}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="ALL">ALL</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </ListToolbar>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit Region</th>
              <SortableTh field="state" label="Region State" basePath="/admin/regions" params={params} />
              <SortableTh field="city" label="Region City" basePath="/admin/regions" params={params} />
              <th className="px-4 py-2.5 text-center">Box 1 Content?</th>
              <th className="px-4 py-2.5 text-center">Box 2 Content?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {regions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No regions found.
                </td>
              </tr>
            )}
            {regions.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/regions/${r.id}/edit`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    ✎ Edit
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700">{r.state}</td>
                <td className="px-4 py-3 text-zinc-700">{r.city ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  {r.custom1 ? (
                    <span className="text-emerald-600">✔</span>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.custom2 ? (
                    <span className="text-emerald-600">✔</span>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/regions" params={params} total={total} />
    </div>
  );
}
