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
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
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

  // Determine if on admin dashboard page
  const isAdminPage =
    pathname === "/admin" || pathname === "/admin/";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r-2 border-zinc-200 bg-white overflow-y-auto min-h-screen"
    >
      <Link
        href="/admin"
        className="flex items-center justify-center h-16 border-b border-zinc-200 px-4 text-sm font-semibold text-zinc-900"
      >
        <span className="flex items-center gap-2">
          <svg
            className="h-6 w-6 text-zinc-900"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 6v4a2 2 0 002 2h4a2 2 0 002-2v-4" />
          </svg>
          Canopy Admin
        </span>
      </Link>

      <nav className="flex-1 px-4 py-4">
        <ul className="space-y-1">
          <li>
            <Link
              href="/admin"
              className={[
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                isAdminPage ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseOver={isAdminPage ? () => {} : undefined}
            >
              <svg
                className="h-4 w-4 text-zinc-500 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 6v4a2 2 0 002 2h4a2 2 0 002-2v-4" />
              </svg>
              <span className="sr-only">Dashboard</span>
              Dashboard
            </Link>
          </li>
        </ul>

        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider z-10 text-zinc-400 mb-2">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((n) => {
                const active = n.href ? isActive(n.href, pathname) : false;
                return (
                  <li key={n.label} className="group">
                    {n.soon ? (
                      <a
                        href={n.href ?? "#"}
                        className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-1.5 text-sm text-zinc-300"
                      >
                        {n.label}
                        <span className="text-[9px] font-medium uppercase text-zinc-300">
                          Soon
                        </span>
                      </a>
                    ) : (
                      <Link
                        href={n.href ?? "#"}
                        className={[
                          "flex cursor-pointer items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                          active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onFocus={() => {}}
                        onBlur={() => {}}
                      >
                        {n.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

      </nav>

      <div className="border-t border-zinc-200 px-3 py-3">
        {userName && (
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs text-zinc-500 truncate">{userName}</span>
            {isSuperAdmin && (
              <span
                className="rounded bg-zinc-900 px-1 py-0.5 text-[9px] font-semibold uppercase text-white"
              >
                Super Admin
              </span>
            )}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            logoutAction();
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}