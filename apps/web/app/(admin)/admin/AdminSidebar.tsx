"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  section: string;
  href?: string;
  label: string;
  soon?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminSidebar({
  groups,
  userName,
  isSuperAdmin,
  logoutAction,
}: {
  groups: NavGroup[];
  userName: string;
  isSuperAdmin: boolean;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-zinc-200 bg-white">
      <Link
        href="/admin"
        className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900"
      >
        Canopy Admin
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          href="/admin"
          className={`mb-3 block rounded-md px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 ${
            pathname === "/admin"
              ? "bg-zinc-900 text-white hover:bg-zinc-800"
              : "text-zinc-900"
          }`}
        >
          Dashboard
        </Link>
        {groups.map((group) => (
          <div key={group.title} className="mb-3">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {group.title}
            </div>
            {group.items.map((n) => {
              const active = n.href ? isActive(n.href, pathname) : false;
              return (
                <span key={n.label}>
                  {n.soon ? (
                    <span className="mb-0.5 flex cursor-not-allowed items-center justify-between rounded-md px-3 py-1.5 text-sm text-zinc-300">
                      {n.label}
                      <span className="text-[10px] font-medium uppercase text-zinc-300">
                        Soon
                      </span>
                    </span>
                  ) : (
                    <Link
                      href={n.href ?? "#"}
                      className={`mb-0.5 block rounded-md px-3 py-1.5 text-sm ${
                        active
                          ? "bg-zinc-900 font-medium text-white"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                    >
                      {n.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-zinc-200 px-3 py-3">
        {userName && (
          <div className="mb-2 truncate px-3 text-xs text-zinc-500">
            {userName}
            {isSuperAdmin && (
              <span className="ml-1 rounded bg-zinc-900 px-1 py-0.5 text-[10px] font-semibold uppercase text-white">
                Super Admin
              </span>
            )}
          </div>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
