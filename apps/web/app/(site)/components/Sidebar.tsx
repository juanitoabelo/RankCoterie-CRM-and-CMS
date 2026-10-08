import React from "react";
import Link from "next/link";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";

interface SidebarProps {
  className?: string;
  activeHref?: string;
}

interface MenuItem {
  id: string;
  label: string;
  href: string;
  target?: string;
  children?: MenuItem[];
}

async function getSidebarMenu() {
  const menu = await prisma.menu.findFirst({
    where: { tenantId: TENANT_ID, location: "SIDEBAR" },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return (menu?.items ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    target: item.target ?? undefined,
    children: undefined,
  }));
}

function renderMenuItems(
  items: MenuItem[],
  activeHref: string,
  depth = 0
) {
  return items.map((item) => {
    const isActive =
      item.href === activeHref ||
      (item.children?.some((child) => child.href === activeHref));

    const itemClassName = `block rounded-lg px-3 py-2 text-sm ${
      isActive ? "font-medium text-zinc-900 bg-zinc-50" : "text-zinc-600"
    } hover:bg-zinc-100 transition-colors`;

    const childrenClassName = `pl-${depth * 4} mt-1`;

    return (
      <React.Fragment key={item.id}>
        {item.children && item.children.length > 0 ? (
          <details
            className="rounded border border-zinc-200 overflow-hidden"
            open={isActive}
          >
            <summary
              className={`flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-900 hover:text-zinc-800 transition-colors`}
            >
              {item.label}
              <svg
                className="h-3 w-3 text-zinc-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="px-4 py-1 text-sm text-zinc-500">
              {renderMenuItems(item.children ?? [], activeHref, depth + 1)}
            </div>
          </details>
        ) : (
          <Link
            href={item.href}
            target={item.target ?? undefined}
            className={itemClassName}
          >
            {item.label}
          </Link>
        )}
      </React.Fragment>
    );
  });
}

export default async function Sidebar({ className = "", activeHref = "" }: SidebarProps) {
  const items = await getSidebarMenu();

  if (items.length === 0) {
    return null;
  }

  return (
    <aside
      className={`rounded-xl border border-zinc-200 bg-white p-4 ${className} shadow-sm`}
    >
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">Navigation</h3>
      <nav className="space-y-1">
        {renderMenuItems(items, activeHref)}
      </nav>
    </aside>
  );
}
