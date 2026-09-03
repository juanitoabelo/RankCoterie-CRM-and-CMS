import Link from "next/link";
import { getCurrentUser, isSuperAdmin, canAccessSection } from "@/lib/admin-auth";
import { adminLogout } from "./login/actions";

type NavItem = {
  /** Permission key used to filter by role. */
  section: string;
  href?: string;
  label: string;
  /** Not-yet-built feature: rendered as a muted, disabled row. */
  soon?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

function visibleItems(
  items: NavItem[],
  can: (key: string) => boolean,
): NavItem[] {
  return items.filter((n) => n.soon || can(n.section));
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Content Types",
    items: [
      { section: "topics", href: "/admin/categories", label: "Topics" },
      { section: "articles", href: "/admin/articles", label: "Articles" },
      { section: "pages", href: "/admin/pages", label: "Pages" },
      { section: "templates", href: "/admin/templates", label: "Templates" },
      { section: "sections", href: "/admin/sections", label: "Sections" },
    ],
  },
  {
    title: "Geo-Targeting",
    items: [
      { section: "regions", href: "/admin/regions", label: "Regions" },
      { section: "geoImages", href: "/admin/geo-images", label: "Geo Category Images" },
    ],
  },
  {
    title: "Directory",
    items: [
      { section: "listings", href: "/admin/listings", label: "Listings" },
      { section: "reviewQueue", href: "/admin/listings?status=PENDING_REVIEW", label: "Review queue" },
      { section: "exclusions", href: "/admin/exclusions", label: "Exclusions" },
      { section: "feeds", href: "/admin/feeds", label: "Feeds" },
    ],
  },
  {
    title: "Ads / Listing",
    items: [{ section: "widgets", href: "/admin/widgets", label: "Widget Builder" }],
  },
  {
    title: "Sales & Billing",
    items: [
      { section: "leads", href: "/admin/leads", label: "Leads" },
      { section: "clients", href: "/admin/clients", label: "Clients" },
      { section: "invoices", href: "/admin/invoices", label: "Invoices" },
      { section: "merchants", href: "/admin/merchants", label: "Merchants" },
    ],
  },
  {
    title: "Admin",
    items: [
      { section: "myCompany", href: "/admin/my-company", label: "My Company" },
      { section: "users", href: "/admin/users", label: "Users" },
      { section: "menus", href: "/admin/menus", label: "Menu Builder" },
    ],
  },
  {
    title: "System Tools",
    items: [
      { section: "styleGuide", href: "/admin/style-guide", label: "Style Guide" },
      { section: "reports", href: "/admin/reports", label: "Reports" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const can =
    user === null
      ? () => false
      : (key: string) => canAccessSection(user, key);
  const allGroups = user === null ? [] : NAV_GROUPS;

  const name = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.email;

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
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
            className="mb-3 block rounded-md px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Dashboard
          </Link>
          {allGroups.map((group) => {
            const items = visibleItems(group.items, can);
            if (items.length === 0) return null;
            return (
              <div key={group.title} className="mb-3">
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {group.title}
                </div>
                {items.map((n) => (
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
                        className="mb-0.5 block rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        {n.label}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-zinc-200 px-3 py-3">
          {user !== null && (
            <div className="mb-2 truncate px-3 text-xs text-zinc-500">
              {name}
              {isSuperAdmin(user) && (
                <span className="ml-1 rounded bg-zinc-900 px-1 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Super Admin
                </span>
              )}
            </div>
          )}
          <form action={adminLogout}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="ml-60 flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
