import { getCurrentUser, isSuperAdmin, isSubscriberOnly, canAccessSection } from "@/modules/auth";
import { adminLogout } from "./login/actions";
import AdminSidebar from "./AdminSidebar";
import { CustomFontProvider } from "@/components/admin/CustomFontProvider";
import { loadCustomFontsSafe } from "@/lib/custom-fonts.server";

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
      { section: "blogTemplate", href: "/admin/blog-template", label: "Blog Templates" },
      { section: "sections", href: "/admin/sections", label: "Sections" },
      { section: "sections", href: "/admin/sections/new", label: "Add New Section" },
      { section: "topics", href: "/admin/categories", label: "Topics" },
      { section: "topics", href: "/admin/categories/new", label: "Add New Topic" },
      { section: "templates", href: "/admin/templates", label: "SubTopics" },
      { section: "templates", href: "/admin/templates/new", label: "Add New SubTopic" },
      { section: "products", href: "/admin/products", label: "Products" },
      { section: "products", href: "/admin/products/add", label: "Add New Product" },
      { section: "products", href: "/admin/orders", label: "Orders" },
      { section: "products", href: "/admin/products/categories", label: "Product Categories" },
      { section: "products", href: "/admin/products/tags", label: "Product Tags" },
      { section: "products", href: "/admin/products/attributes", label: "Product Attributes" },
      { section: "products", href: "/admin/products/payment-gateway", label: "Configure Payment Gateway" },
      { section: "products", href: "/admin/coupons", label: "Coupons" },
      { section: "products", href: "/admin/tax", label: "Tax Rates" },
      { section: "products", href: "/admin/products/create-single", label: "Create Custom Single Product page" },
      { section: "products", href: "/admin/products/create-card-template", label: "Create Custom product item Card template" },
{ section: "products", href: "/admin/products/page-template", label: "Custom Product page template" },
      { section: "products", href: "/admin/products/reports", label: "Ecommerce Reports" },
      ],
  },
  {
    title: "Geo-Targeting",
    items: [
      { section: "categories", href: "/admin/geo-categories", label: "GeoCategory Pages" },
      { section: "categories", href: "/admin/geo-categories/new", label: "Add New GeoCategory" },
      { section: "categories", href: "/admin/geo-category-template", label: "Geo Category Custom Single Page" },
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
        { section: "listings", href: "/admin/listings/bulk", label: "Bulk Actions" },
        { section: "listings", href: "/admin/listings/payment", label: "Payment Configuration" },
        { section: "reports", href: "/admin/listings/reports", label: "Listing Revenue" },
        { section: "featuredPlacements", href: "/admin/featured-placements", label: "Featured Placements" },
        { section: "verification", href: "/admin/verification", label: "Verification" },
        { section: "reviews", href: "/admin/reviews", label: "Reviews" },
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
      { section: "myCompany", href: "/admin/media", label: "Media Library" },
      { section: "headerFooter", href: "/admin/header-footer", label: "Header & Footer Builder" },
      { section: "general", href: "/admin/general", label: "General" },
      { section: "reading", href: "/admin/reading", label: "Reading" },
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

  const subscriberOnly = user !== null && isSubscriberOnly(user);

  // Uploaded fonts feed every font-family dropdown in the admin, so they load
  // once here and reach the builders through context.
  const customFonts = user ? await loadCustomFontsSafe() : [];

  return (
    <CustomFontProvider fonts={customFonts}>
      <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
        <AdminSidebar
          groups={subscriberOnly ? [] : visibleGroups}
          userName={name ?? ""}
          isSuperAdmin={user !== null && isSuperAdmin(user)}
          subscriberOnly={subscriberOnly}
          logoutAction={adminLogout}
        />
        <main className="ml-60 flex-1 px-6 py-8">{children}</main>
      </div>
    </CustomFontProvider>
  );
}
