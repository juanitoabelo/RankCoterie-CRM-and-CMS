import { prisma } from "@/lib/directory/prismaCatalog";
import { updateRegionForm } from "../actions";

export const revalidate = 0;

export default async function RegionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [region, variantCount, listingCount] = await Promise.all([
    prisma.region.findUnique({ where: { id } }),
    prisma.contentVariant.count({ where: { regionId: id } }),
    prisma.listingRegion.count({ where: { regionId: id } }),
  ]);

  if (!region) {
    return <p className="text-sm text-zinc-500">Region not found.</p>;
  }

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/regions" className="hover:text-zinc-700">Regions</a> /{" "}
        <span className="text-zinc-700">{region.city ? `${region.city}, ${region.state}` : region.stateFull}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Edit: {region.city ? `${region.city}, ${region.state}` : region.stateFull}
      </h1>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Region details</h2>
        <p className="mb-4 mt-1 text-xs text-zinc-500">
          ID: <code className="rounded bg-zinc-100 px-1">{region.id}</code> · Slug:{" "}
          <code className="rounded bg-zinc-100 px-1">{region.slug}</code>
        </p>

        <form action={updateRegionForm.bind(null, region.id)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-zinc-800">State *</label>
              <input
                name="state"
                required
                defaultValue={region.state}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">State full name *</label>
              <input
                name="stateFull"
                required
                defaultValue={region.stateFull}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">City (blank = statewide)</label>
              <input
                name="city"
                defaultValue={region.city ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Area part</label>
              <select
                name="areaPart"
                defaultValue={region.areaPart ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                <option value="ALL">ALL</option>
                <option value="NORTHERN">NORTHERN</option>
                <option value="SOUTHERN">SOUTHERN</option>
                <option value="EASTERN">EASTERN</option>
                <option value="WESTERN">WESTERN</option>
                <option value="CENTRAL">CENTRAL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Priority</label>
              <input
                name="priority"
                type="number"
                defaultValue={region.priority}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Zip codes (comma-separated)</label>
              <input
                name="zipCodes"
                defaultValue={region.zipCodes.join(", ")}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800">
              Intro HTML (tokens supported)
            </label>
            <textarea
              name="custom1"
              rows={4}
              defaultValue={region.custom1 ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs leading-relaxed"
              placeholder="<p>Families {{in region}} find care close to home.</p>"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800">Secondary HTML</label>
            <textarea
              name="custom2"
              rows={3}
              defaultValue={region.custom2 ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Save changes
          </button>
        </form>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Usage</h2>
        <div className="mt-2 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Content variants</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{variantCount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Linked listings</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{listingCount}</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">
          Deleting a region with linked listings or variants will be ignored by the delete
          action to preserve referential integrity.
        </p>
      </div>
    </div>
  );
}
