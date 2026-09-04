import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteMenuForm, getMenu, saveMenuItemsForm, MENU_LOCATION_LABELS } from "../actions";

export const revalidate = 0;

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const menu = await getMenu(id);
  if (!menu) return notFound();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <Link href="/admin/menus" className="text-zinc-700 hover:underline">Menu Builder</Link>{" "}
        / <span className="text-zinc-700">{menu.name}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        {menu.name}{" "}
        <span className="text-sm font-normal text-zinc-500">({MENU_LOCATION_LABELS[menu.location]})</span>
      </h1>

      <form action={saveMenuItemsForm} className="mt-6 max-w-2xl rounded-xl border border-zinc-200 bg-white p-5">
        <input type="hidden" name="menuId" value={menu.id} />
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900">Menu items (in order)</h2>
          <span className="text-xs text-zinc-400">Add a new row to append an item</span>
        </div>
        <div className="mt-3 space-y-2">
          {menu.items.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-400">
              No items yet. Fill in the first row below.
            </div>
          )}
          {menu.items.map((item) => (
            <div key={item.id} className="grid grid-cols-2 gap-2">
              <input
                name="itemLabel"
                defaultValue={item.label}
                placeholder="Label"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                name="itemHref"
                defaultValue={item.href}
                placeholder="URL / path"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <input name="itemLabel" placeholder="New label" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <input name="itemHref" placeholder="New URL / path" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
          <button
            type="submit"
            formAction={deleteMenuForm}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete menu
          </button>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Save items
          </button>
        </div>
      </form>
    </div>
  );
}
