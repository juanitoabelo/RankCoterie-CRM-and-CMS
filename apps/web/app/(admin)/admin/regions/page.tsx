import Link from "next/link";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import { US_STATES } from "../constants";

export const revalidate = 0;

export default async function RegionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const stateFilter = params.state ?? "ALL";

  const where = stateFilter !== "ALL" ? { state: stateFilter } : {};

  const [regions, total] = await Promise.all([
    prisma.region.findMany({
      where,
      orderBy: [{ state: "asc" }, { city: "asc" }, { id: "asc" }],
    }),
    prisma.region.count({ where }),
  ]);

  const states = Array.from(
    new Set(
      (await prisma.region.findMany({ select: { state: true } })).map((r) => r.state)
    )
  ).sort();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Regions</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Regions</h1>

      <form className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">In State</label>
        <select
          name="state"
          defaultValue={stateFilter}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="ALL">ALL</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="mt-4">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            VIEW REGIONS
          </button>
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">
        Results ({total} Region{total === 1 ? "" : "s"})
      </h2>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit Region</th>
              <th className="px-4 py-2.5">Region State</th>
              <th className="px-4 py-2.5">Region City</th>
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
    </div>
  );
}
