import Link from "next/link";
import { createWidgetForm, listWidgets } from "./actions";

export const revalidate = 0;

export default async function WidgetsAdminPage() {
  const widgets = await listWidgets();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Ads / Listing</span> /{" "}
        <span className="text-zinc-700">Widget Builder</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Widget Builder</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Create free-form HTML ad / promo widgets with an optional featured image
        that redirects to any page, article or listing.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Add widget</h2>
          <form action={createWidgetForm} className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-zinc-600">
              Name
              <input name="name" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Image asset ID (from uploads — optional)
              <input name="imageAssetId" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Redirect URL (page / article / any path — optional)
              <input name="redirectUrl" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              HTML
              <textarea name="html" required rows={6} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono" />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
              <input type="checkbox" name="active" defaultChecked className="accent-zinc-900" />
              Active
            </label>
            <div className="flex justify-end border-t border-zinc-100 pt-3">
              <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                Create widget
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Widgets ({widgets.length})</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {widgets.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {w.name}
                    {!w.active && (
                      <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">Inactive</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {w.placements.length} placement(s)
                    {w.redirectUrl ? ` · → ${w.redirectUrl}` : ""}
                  </p>
                </div>
                <Link href={`/admin/widgets/${w.id}/edit`} className="shrink-0 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                  Edit
                </Link>
              </li>
            ))}
            {widgets.length === 0 && (
              <li className="py-3 text-sm text-zinc-400">No widgets yet. Add your first above.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
