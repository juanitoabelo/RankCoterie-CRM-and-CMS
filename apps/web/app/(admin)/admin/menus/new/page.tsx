import { getMenuOptions } from "../actions";
import NewMenuItemForm from "./NewMenuItemForm";

export const revalidate = 0;

export default async function NewMenuItemPage() {
  const menuOptions = await getMenuOptions();

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/menus" className="hover:text-zinc-700">Menu Builder</a> /{" "}
        <span className="text-zinc-700">Add New Menu Item</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add Menu Item</h1>

      <NewMenuItemForm menuOptions={menuOptions} />
    </div>
  );
}
