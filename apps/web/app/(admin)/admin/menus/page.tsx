import Link from "next/link";
import { listMenusWithCounts } from "./actions";
import { MENU_LOCATION_LABELS } from "./constants";
import type { MenuLocation } from "@prisma/client";

export const revalidate = 0;

export default async function MenusOverviewPage() {
  const menus = await listMenusWithCounts();

  // Group menus by location
  const grouped = menus.reduce(
    (acc, menu) => {
      const loc = menu.location;
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(menu);
      return acc;
    },
    {} as Record<MenuLocation, typeof menus>
  );

  const locations: MenuLocation[] = ["HEADER", "FOOTER", "SIDEBAR"];

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Menu Builder</span>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Menu Builder</h1>
        <Link
          href="/admin/menus/new-menu"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          + Create New Menu
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Manage your navigation menus. Create menus and assign them to Header, Footer, or Sidebar locations.
      </p>

      <div className="mt-8 space-y-8">
        {locations.map((loc) => {
          const locationMenus = grouped[loc] ?? [];
          return (
            <div key={loc}>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {MENU_LOCATION_LABELS[loc]}
                </h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  {locationMenus.length} menu{locationMenus.length !== 1 ? "s" : ""}
                </span>
              </div>

              {locationMenus.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
                  <p className="text-sm text-zinc-400">No menus in this location yet.</p>
                  <Link
                    href="/admin/menus/new-menu"
                    className="mt-3 inline-block text-sm font-medium text-amber-600 hover:underline"
                  >
                    Create a menu
                  </Link>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {locationMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-zinc-900">{menu.name}</h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            {menu._count.items} item{menu._count.items !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          {MENU_LOCATION_LABELS[menu.location]}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <Link
                          href={`/admin/menus/${menu.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Edit Items
                        </Link>
                        <Link
                          href={`/admin/menus/new?menu=${menu.id}`}
                          className="text-sm font-medium text-zinc-600 hover:underline"
                        >
                          Add Item
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All Items Link */}
      <div className="mt-8 border-t border-zinc-200 pt-6">
        <Link
          href="/admin/menus/all"
          className="text-sm font-medium text-zinc-600 hover:underline"
        >
          View All Menu Items →
        </Link>
      </div>
    </div>
  );
}
