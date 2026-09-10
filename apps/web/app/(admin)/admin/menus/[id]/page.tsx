import { notFound } from "next/navigation";
import Link from "next/link";
import { getMenu, deleteMenu } from "../actions";
import { MENU_LOCATION_LABELS } from "../constants";
import MenuItemsSortable from "../components/MenuItemsSortable";

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
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {menu.name}{" "}
          <span className="text-sm font-normal text-zinc-500">({MENU_LOCATION_LABELS[menu.location]})</span>
        </h1>
        <Link
          href={`/admin/menus/new?menu=${menu.id}`}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          + Add Item
        </Link>
      </div>

      <div className="mt-6">
        <MenuItemsSortable
          menuId={menu.id}
          menuName={menu.name}
          items={menu.items}
        />
      </div>
    </div>
  );
}
