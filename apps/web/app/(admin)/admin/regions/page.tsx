import { prisma } from "@/lib/directory/prismaCatalog";
import { createRegionForm, deleteRegionForm } from "./actions";

export const revalidate = 0;

export default async function RegionsAdminPage() {
  const [regions, variantCounts, listingCounts] = await Promise.all([
    prisma.region.findMany({
      orderBy: [{ state: "asc" }, { priority: "asc" }, { id: "asc" }],
    }),
    prisma.contentVariant.groupBy({
      by: ["regionId"],
      _count: { _all: true },
    }),
    prisma.listingRegion.groupBy({
      by: ["regionId"],
      _count: { _all: true },
    }),
  ]);

  const variantCountByRegion = new Map(
    variantCounts.map((v) => [v.regionId, v._count._all]),
  );
  const listingCountByRegion = new Map(
    listingCounts.map((v) => [v.regionId, v._count._all]),
  );

  const states = Array.from(new Set(regions.map((r) => r.state))).sort();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Regions</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Regions</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Regions drive geo-localization: per-region content variants, listing coverage,
        and nearby-area links. A city row (e.g. "San Diego") inherits its state; a
        statewide row has no city. Add a region here to make it available across the
        dashboard and on the public site.
      </p>

      <form
        action={createRegionForm}
        className="mt-8 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-medium text-zinc-900">Create region</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="state"
            placeholder="State (e.g. CA) *"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="stateFull"
            placeholder="State full name (e.g. California) *"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="city"
            placeholder="City (blank = statewide)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            name="areaPart"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">Area part (none)</option>
            <option value="ALL">ALL</option>
            <option value="NORTHERN">NORTHERN</option>
            <option value="SOUTHERN">SOUTHERN</option>
            <option value="EASTERN">EASTERN</option>
            <option value="WESTERN">WESTERN</option>
            <option value="CENTRAL">CENTRAL</option>
          </select>
          <input
            name="priority"
            type="number"
            placeholder="Priority (default 999)"
            defaultValue={999}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <textarea
            name="custom1"
            placeholder="Localized intro HTML — {{region}} tokens allowed"
            rows={1}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <textarea
            name="custom2"
            placeholder="Secondary HTML (optional)"
            rows={1}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="zipCodes"
            placeholder="Zip codes, comma-separated (optional)"
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
              <th className="px-4 py-2.5">Region</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5">Variants</th>
              <th className="px-4 py-2.5">Listings</th>
              <th className="px-4 py-2.5">Zips</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {regions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                  No regions yet.
                </td>
              </tr>
            )}
            {regions.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <a
                    href={`/admin/regions/${r.id}/edit`}
                    className="underline underline-offset-2 hover:text-zinc-600"
                  >
                    {r.city ? `${r.city}, ${r.state}` : r.stateFull}
                  </a>
                  <span className="ml-2 text-xs text-zinc-400">{r.slug}</span>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.city
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {r.city ? "City" : "Statewide"}
                  </span>
                  {r.areaPart ? <span className="ml-1 text-xs text-zinc-400">· {r.areaPart}</span> : null}
                </td>
                <td className="px-4 py-3 text-zinc-500">{r.priority}</td>
                <td className="px-4 py-3 text-zinc-500">{variantCountByRegion.get(r.id) ?? 0}</td>
                <td className="px-4 py-3 text-zinc-500">{listingCountByRegion.get(r.id) ?? 0}</td>
                <td className="px-4 py-3 text-zinc-500">{r.zipCodes.length}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteRegionForm.bind(null, r.id)}>
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

      <p className="mt-4 text-[11px] text-zinc-400">
        {states.length} state{states.length === 1 ? "" : "s"}: {states.join(", ") || "—"}
      </p>
    </div>
  );
}
