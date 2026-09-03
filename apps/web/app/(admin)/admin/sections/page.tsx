import Link from "next/link";
import { createSectionForm, listSections } from "./actions";

export const revalidate = 0;

export default async function SectionsAdminPage() {
  const sections = await listSections();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Content Types</span> /{" "}
        <span className="text-zinc-700">Sections</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Sections</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Group and organize content into named sections. Sections can be ordered
        and shown or hidden on the site.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Add section</h2>
          <form action={createSectionForm} className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-zinc-600">
              Slug (URL-safe, e.g. "sponsors")
              <input
                name="slug"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Title
              <input
                name="title"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Heading (display title)
              <input
                name="heading"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Order
              <input
                type="number"
                name="order"
                defaultValue={0}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Status
              <select name="status" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                <option value="LIVE">LIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="HIDDEN">HIDDEN</option>
              </select>
            </label>
            <div className="flex justify-end border-t border-zinc-100 pt-3">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Create section
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">All sections ({sections.length})</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {sections.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{s.title}</p>
                  <p className="truncate text-xs text-zinc-500">{s.slug}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Order {s.order} · {s.status}
                  </p>
                </div>
                <Link
                  href={`/admin/sections/${s.id}/edit`}
                  className="shrink-0 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Edit
                </Link>
              </li>
            ))}
            {sections.length === 0 && (
              <li className="py-3 text-sm text-zinc-400">No sections yet. Add your first above.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
