import Link from "next/link";
import { adminLogout } from "./login/actions";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/categories", label: "Categories" },
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
    <div className="min-h-full">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-sm font-semibold text-zinc-900">
            Canopy Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-zinc-900">
                {n.label}
              </Link>
            ))}
            <form action={adminLogout}>
              <button type="submit" className="text-xs text-zinc-400 hover:text-zinc-700">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}