import Link from "next/link";
import { getCurrentUser, isSuperAdmin, canAccessSection } from "@/modules/auth";
import { adminLogout } from "./login/actions";
import AdminSidebar from "./AdminSidebar";

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

function visibleItems(
  items: NavItem[],
  can: (key: string) => boolean,
): NavItem[] {
  return items.filter((n) => n.soon || can(n.section));
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Content",
    items: [
      { section: "pages", href: "/admin/pages", label: "Pages" },
      { section: "articles", href: "/admin/articles", label: "Articles/Posts" },
      { section: "sections", href: "/admin/sections", label: "Sections" },
      { section: "sections", href: "/admin/sections/new", label: "Add New Section" },
      { section: "topics", href: "/admin/categories", label: "Topics" },
      { section: "topics", href: "/admin/categories/new", label: "Add New Topic" },
      { section: "templates", href: "/admin/templates", label: "SubTopics" },
      { section: "templates", href: "/admin/templates/new", label: "Add New SubTopic" },
    ],
  },
  {
    title: "Geo-Targeting",
    items: [
      { section: "categories", href: "/admin/geo-categories", label: "GeoCategory Pages" },
      { section: "categories", href: "/admin/geo-categories/new", label: "Add New GeoCategory" },
      { section: "categories", href: "/admin/geo-categories/images/new", label: "Add New Image" },
      { section: "categories", href: "/admin/geo-categories/images/bulk", label: "Bulk Add Images" },
      { section: "regions", href: "/admin/regions", label: "Regions" },
      { section: "regions", href: "/admin/regions/new", label: "Add New Region" },
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
    items: [
      { section: "widgets", href: "/admin/widgets", label: "Widget Builder" },
      { section: "widgets", href: "/admin/widgets/new", label: "Add New Widget" },
    ],
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
      { section: "users", href: "/admin/users/add", label: "Add New User" },
      { section: "menus", href: "/admin/menus", label: "Menu Builder" },
      { section: "menus", href: "/admin/menus/new-menu", label: "Create New Menu" },
      { section: "menus", href: "/admin/menus/new", label: "Add New Menu Item" },
    ],
  },
  {
    title: "System Tools",
    items: [
      { section: "headerFooter", href: "/admin/header-footer", label: "Header & Footer Builder" },
      { section: "themeSettings", href: "/admin/theme-settings", label: "Theme Settings" },
      { section: "styleGuide", href: "/admin/style-guide", label: "Style Guide (Legacy)" },
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

  const visibleGroups = allGroups
    .map((g) => ({ ...g, items: visibleItems(g.items, can) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <AdminSidebar
        groups={visibleGroups}
        userName={name ?? ""}
        isSuperAdmin={user !== null && isSuperAdmin(user)}
        logoutAction={adminLogout}
      />
      <main className="ml-60 flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
