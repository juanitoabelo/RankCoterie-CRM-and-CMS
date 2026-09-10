import { notFound } from "next/navigation";
import { getMenuItem, getParentItemOptions } from "../../../actions";
import MenuItemEditForm from "./MenuItemEditForm";

export const revalidate = 0;

export default async function MenuItemEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getMenuItem(id);
  if (!item) return notFound();

  const parentOptions = await getParentItemOptions(item.menuId);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/menus" className="hover:text-zinc-700">Menu Builder</a> /{" "}
        <span className="text-zinc-700">Edit Item</span>
      </p>
      <div className="flex items-start justify-between">
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          Edit Item: <span className="text-blue-600">{item.label}</span>
        </h1>
      </div>

      <MenuItemEditForm item={item} parentOptions={parentOptions} />
    </div>
  );
}
