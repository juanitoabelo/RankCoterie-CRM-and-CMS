import Link from "next/link";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";

interface SidebarProps {
  className?: string;
}

async function getSidebarMenu() {
  const menu = await prisma.menu.findFirst({
    where: { tenantId: TENANT_ID, location: "SIDEBAR" },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return menu?.items ?? [];
}

export default async function Sidebar({ className = "" }: SidebarProps) {
  const items = await getSidebarMenu();

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className={`rounded-xl border border-zinc-200 bg-white p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">Navigation</h3>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            target={item.target ?? undefined}
            className="block rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
