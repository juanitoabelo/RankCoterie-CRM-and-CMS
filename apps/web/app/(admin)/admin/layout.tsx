import Link from "next/link";
import { adminLogout } from "./login/actions";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/regions", label: "Regions" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/listings?status=PENDING_REVIEW", label: "Review queue" },
  { href: "/admin/exclusions", label: "Exclusions" },
  { href: "/admin/feeds", label: "Feeds" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/merchants", label: "Merchants" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/reports", label: "Reports" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-zinc-200 bg-white">
        <Link href="/admin" className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
          Canopy Admin
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="mb-0.5 block rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-200 px-3 py-3">
          <form action={adminLogout}>
            <button type="submit" className="w-full rounded-md px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="ml-56 flex-1 px-6 py-8">{children}</main>
    </div>
  );
}