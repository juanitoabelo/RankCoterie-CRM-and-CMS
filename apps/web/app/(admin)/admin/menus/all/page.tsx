import Link from "next/link";
import { listMenuItems, getMenuOptions } from "../actions";

export const revalidate = 0;

export default async function AllMenuItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; menu?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const menuFilter = params.menu ?? "";
  const [items, menuOptions] = await Promise.all([listMenuItems(), getMenuOptions()]);

  let filtered = items;
  if (menuFilter) {
    filtered = filtered.filter((item) => item.menuId === menuFilter);
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q)
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <Link href="/admin/menus" className="text-zinc-700 hover:underline">Menu Builder</Link>{" "}
        / <span className="text-zinc-700">All Menu Items</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">All Menu Items</h1>

      <form className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-800">Search Menu Items</label>
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by text or URL..."
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="w-64">
            <label className="block text-sm font-medium text-zinc-800">Filter by Menu</label>
            <select
              name="menu"
              defaultValue={menuFilter}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">All Menus</option>
              {menuOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.location})</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            SEARCH
          </button>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Results
          <span className="ml-2 text-sm font-normal text-zinc-500">({filtered.length} items)</span>
        </h2>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit</th>
              <th className="px-4 py-2.5">Item Text</th>
              <th className="px-4 py-2.5">Item Link/URL</th>
              <th className="px-4 py-2.5">Menu</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5 text-right">Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No menu items found.
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const isNested = !!item.parentId;
              return (
                <tr key={item.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/menus/items/${item.id}/edit`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      ✎ Edit
                    </Link>
                  </td>
                  <td className={`px-4 py-3 font-medium text-zinc-900 ${isNested ? "pl-8" : ""}`}>
                    {isNested && <span className="text-zinc-400">↳ </span>}
                    {item.label}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {item.href}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{item.menu.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{item.itemType}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                    {item.order}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
