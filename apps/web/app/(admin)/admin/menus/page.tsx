import Link from "next/link";
import { createMenuForm, listMenus, MENU_LOCATION_LABELS, MENU_LOCATIONS } from "./actions";

export const revalidate = 0;

export default async function MenusAdminPage() {
  const menus = await listMenus();

  return (
    <div>
      <p className="text-sm text-zinc-500">Admin / <span className="text-zinc-700">Menu Builder</span></p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Menu Builder</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">Create named navigation menus and manage their ordered links.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form action={createMenuForm} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Add menu</h2>
          <label className="block text-xs font-medium text-zinc-600">Name
            <input name="name" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-medium text-zinc-600">Location
            <select name="location" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {MENU_LOCATIONS.map((location) => <option key={location} value={location}>{MENU_LOCATION_LABELS[location]}</option>)}
            </select>
          </label>
          <div className="flex justify-end border-t border-zinc-100 pt-3">
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Create menu</button>
          </div>
        </form>
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Menus ({menus.length})</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {menus.map((menu) => (
              <li key={menu.id} className="flex items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-medium text-zinc-900">{menu.name}</p><p className="text-xs text-zinc-500">{MENU_LOCATION_LABELS[menu.location]} · {menu._count.items} item(s)</p></div>
                <Link href={`/admin/menus/${menu.id}`} className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700">Edit</Link>
              </li>
            ))}
            {menus.length === 0 && <li className="py-3 text-sm text-zinc-400">No menus yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
