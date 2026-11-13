/**
 * Admin tool registry — single source of truth for the sidebar, the
 * Tools Permission matrix, and route-level access checks.
 *
 * Keys are persisted in `ToolPermissionOverride.target`:
 *   - "section:<section>" hides/shows every link in that section/content type
 *   - "tool:<key>" hides/shows one specific menu link
 *
 * Keep keys stable — changing a key resets any saved overrides for it.
 */

export type AdminTool = {
  /** Stable per-link key, e.g. "products.list". */
  key: string;
  /** Section/content-type key used for defaults + section-level overrides. */
  section: string;
  href: string;
  label: string;
  /** Extra route prefixes that belong to this tool (for route-level guards). */
  paths?: string[];
};

export type AdminToolGroup = {
  title: string;
  items: AdminTool[];
};

export const ADMIN_TOOL_GROUPS: AdminToolGroup[] = [
  {
    title: "Content",
    items: [
      { key: "pages.list", section: "pages", href: "/admin/pages", label: "Pages" },
      { key: "articles.list", section: "articles", href: "/admin/articles", label: "Articles/Posts" },
      { key: "blogTemplate.list", section: "blogTemplate", href: "/admin/blog-template", label: "Blog Templates" },
      { key: "sections.list", section: "sections", href: "/admin/sections", label: "Sections" },
      { key: "sections.new", section: "sections", href: "/admin/sections/new", label: "Add New Section" },
      { key: "topics.list", section: "topics", href: "/admin/categories", label: "Topics" },
      { key: "topics.new", section: "topics", href: "/admin/categories/new", label: "Add New Topic" },
      { key: "topics.template", section: "topics", href: "/admin/topic-template", label: "Topic Custom Single Page" },
      { key: "templates.list", section: "templates", href: "/admin/templates", label: "SubTopics" },
      { key: "templates.new", section: "templates", href: "/admin/templates/new", label: "Add New SubTopic" },
      { key: "templates.template", section: "templates", href: "/admin/subtopic-template", label: "SubTopic Custom Single Page" },
      { key: "products.list", section: "products", href: "/admin/products", label: "Products" },
      { key: "products.new", section: "products", href: "/admin/products/add", label: "Add New Product" },
      { key: "products.orders", section: "products", href: "/admin/orders", label: "Orders" },
      { key: "products.categories", section: "products", href: "/admin/products/categories", label: "Product Categories" },
      { key: "products.tags", section: "products", href: "/admin/products/tags", label: "Product Tags" },
      { key: "products.attributes", section: "products", href: "/admin/products/attributes", label: "Product Attributes" },
      { key: "products.paymentGateway", section: "products", href: "/admin/products/payment-gateway", label: "Configure Payment Gateway" },
      { key: "products.coupons", section: "products", href: "/admin/coupons", label: "Coupons" },
      { key: "products.tax", section: "products", href: "/admin/tax", label: "Tax Rates" },
      { key: "products.singleTemplate", section: "products", href: "/admin/products/create-single", label: "Create Custom Single Product page" },
      { key: "products.cardTemplate", section: "products", href: "/admin/products/create-card-template", label: "Create Custom product item Card template" },
      { key: "products.pageTemplate", section: "products", href: "/admin/products/page-template", label: "Custom Product page template" },
      { key: "products.reports", section: "products", href: "/admin/products/reports", label: "Ecommerce Reports" },
    ],
  },
  {
    title: "Geo-Targeting",
    items: [
      { key: "categories.list", section: "categories", href: "/admin/geo-categories", label: "GeoCategory Pages" },
      { key: "categories.new", section: "categories", href: "/admin/geo-categories/new", label: "Add New GeoCategory" },
      { key: "categories.import", section: "categories", href: "/admin/geo-categories/import", label: "Bulk Import" },
      { key: "categories.template", section: "categories", href: "/admin/geo-category-template", label: "Geo Category Custom Single Page" },
      { key: "categories.imageNew", section: "categories", href: "/admin/geo-categories/images/new", label: "Add New Image" },
      { key: "categories.imageBulk", section: "categories", href: "/admin/geo-categories/images/bulk", label: "Bulk Add Images" },
      { key: "regions.list", section: "regions", href: "/admin/regions", label: "Regions" },
      { key: "regions.new", section: "regions", href: "/admin/regions/new", label: "Add New Region" },
      { key: "geoImages.list", section: "geoImages", href: "/admin/geo-images", label: "Geo Category Images" },
    ],
  },
  {
    title: "Directory",
    items: [
      { key: "listings.list", section: "listings", href: "/admin/listings", label: "Listings" },
      { key: "listings.bulk", section: "listings", href: "/admin/listings/bulk", label: "Bulk Actions" },
      { key: "listings.layouts", section: "listings", href: "/admin/listing-layouts", label: "Listing Custom Layout" },
      { key: "listings.layoutNew", section: "listings", href: "/admin/listing-layouts/new", label: "Add New Listing Layout" },
      { key: "listings.payment", section: "listings", href: "/admin/listings/payment", label: "Payment Configuration" },
      { key: "reports.listingRevenue", section: "reports", href: "/admin/listings/reports", label: "Listing Revenue" },
      { key: "featuredPlacements.list", section: "featuredPlacements", href: "/admin/featured-placements", label: "Featured Placements" },
      { key: "verification.list", section: "verification", href: "/admin/verification", label: "Verification" },
      { key: "reviews.list", section: "reviews", href: "/admin/reviews", label: "Reviews" },
      { key: "reviewQueue.list", section: "reviewQueue", href: "/admin/listings?status=PENDING_REVIEW", label: "Review queue" },
      { key: "exclusions.list", section: "exclusions", href: "/admin/exclusions", label: "Exclusions" },
      { key: "feeds.list", section: "feeds", href: "/admin/feeds", label: "Feeds" },
    ],
  },
  {
    title: "Ads / Listing",
    items: [
      { key: "listings.companies", section: "listings", href: "/admin/company-listings", label: "Company Listings" },
      { key: "listings.companyNew", section: "listings", href: "/admin/company-listings/new", label: "Add New Company Page" },
      { key: "listings.companyLayouts", section: "listings", href: "/admin/company-listing-layouts", label: "Company Listing Custom Landing Page Layout" },
      { key: "listings.companyLayoutNew", section: "listings", href: "/admin/company-listing-layouts/new", label: "Add New Custom Landing Page" },
      { key: "listings.companyPayment", section: "listings", href: "/admin/company-listings/payment", label: "Payment Configuration" },
      { key: "reports.companyRevenue", section: "reports", href: "/admin/company-listings/reports", label: "Company Listing Revenue" },
      { key: "widgets.list", section: "widgets", href: "/admin/widgets", label: "Widget Builder" },
      { key: "widgets.new", section: "widgets", href: "/admin/widgets/new", label: "Add New Widget" },
    ],
  },
  {
    title: "Sales & Billing",
    items: [
      { key: "leads.list", section: "leads", href: "/admin/leads", label: "Leads" },
      { key: "clients.list", section: "clients", href: "/admin/clients", label: "Clients" },
      { key: "invoices.list", section: "invoices", href: "/admin/invoices", label: "Invoices" },
      { key: "merchants.list", section: "merchants", href: "/admin/merchants", label: "Merchants" },
    ],
  },
  {
    title: "Admin",
    items: [
      { key: "myCompany.profile", section: "myCompany", href: "/admin/my-company", label: "My Company" },
      { key: "users.list", section: "users", href: "/admin/users", label: "Users" },
      { key: "users.new", section: "users", href: "/admin/users/add", label: "Add New User" },
      { key: "menus.list", section: "menus", href: "/admin/menus", label: "Menu Builder" },
      { key: "menus.newMenu", section: "menus", href: "/admin/menus/new-menu", label: "Create New Menu" },
      { key: "menus.newItem", section: "menus", href: "/admin/menus/new", label: "Add New Menu Item" },
    ],
  },
  {
    title: "System Tools",
    items: [
      { key: "myCompany.media", section: "myCompany", href: "/admin/media", label: "Media Library" },
      { key: "headerFooter.list", section: "headerFooter", href: "/admin/header-footer", label: "Header & Footer Builder" },
      { key: "general.list", section: "general", href: "/admin/general", label: "General" },
      { key: "general.email", section: "general", href: "/admin/email-settings", label: "Email Settings" },
      { key: "general.customForm", section: "general", href: "/admin/custom-advance-form", label: "Custom Advance Form" },
      { key: "general.customFields", section: "general", href: "/admin/custom-fields", label: "Custom Fields & Post Types", paths: ["/admin/custom-post-types"] },
      { key: "reading.list", section: "reading", href: "/admin/reading", label: "Reading" },
      { key: "sitemap.list", section: "sitemap", href: "/admin/sitemap", label: "Sitemap" },
      { key: "themeSettings.list", section: "themeSettings", href: "/admin/theme-settings", label: "Theme Settings" },
      { key: "styleGuide.list", section: "styleGuide", href: "/admin/style-guide", label: "Style Guide (Legacy)" },
      { key: "customCssJs.list", section: "customCssJs", href: "/admin/custom-css-js", label: "Custom CSS & JS" },
      { key: "reports.list", section: "reports", href: "/admin/reports", label: "Reports" },
      { key: "toolsPermission.list", section: "toolsPermission", href: "/admin/tools-permission", label: "Tools Permission" },
    ],
  },
];

export const ALL_ADMIN_TOOLS: AdminTool[] = ADMIN_TOOL_GROUPS.flatMap(
  (group) => group.items,
);

/** Human labels for section/content-type keys. */
export const SECTION_LABELS: Record<string, string> = {
  pages: "Pages",
  articles: "Articles / Posts",
  blogTemplate: "Blog Templates",
  sections: "Sections",
  topics: "Topics",
  templates: "SubTopics",
  products: "Products",
  categories: "Geo Categories",
  regions: "Regions",
  geoImages: "Geo Images",
  listings: "Listings",
  reports: "Reports",
  featuredPlacements: "Featured Placements",
  verification: "Verification",
  reviews: "Reviews",
  reviewQueue: "Review Queue",
  exclusions: "Exclusions",
  feeds: "Feeds",
  widgets: "Widgets",
  leads: "Leads",
  clients: "Clients",
  invoices: "Invoices",
  merchants: "Merchants",
  myCompany: "My Company",
  users: "Users",
  menus: "Menus",
  headerFooter: "Header & Footer",
  general: "General",
  reading: "Reading",
  sitemap: "Sitemap",
  themeSettings: "Theme Settings",
  styleGuide: "Style Guide",
  customCssJs: "Custom CSS & JS",
  toolsPermission: "Tools Permission",
};

/**
 * Built-in defaults used when no override exists. This mirrors the original
 * hardcoded SECTION_ROLES map, so behaviour is unchanged until a super admin
 * edits permissions. SUPER_ADMIN is always allowed and is not listed.
 */
export const DEFAULT_SECTION_ROLES: Record<string, string[]> = {
  dashboard: ["SUPER_ADMIN", "ADMIN", "EDITOR", "MARKETING", "REVIEWER", "SALES_REP"],
  topics: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  sections: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  articles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  pages: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  templates: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  geoImages: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  menus: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  regions: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  widgets: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  general: ["SUPER_ADMIN", "ADMIN"],
  reading: ["SUPER_ADMIN", "ADMIN"],
  themeSettings: ["SUPER_ADMIN", "ADMIN"],
  headerFooter: ["SUPER_ADMIN", "ADMIN"],
  styleGuide: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  exclusions: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  feeds: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  reports: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  sitemap: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  myCompany: ["SUPER_ADMIN", "ADMIN"],
  users: ["SUPER_ADMIN"],
  leads: ["SUPER_ADMIN", "ADMIN", "SALES_REP"],
  clients: ["SUPER_ADMIN", "ADMIN", "SALES_REP"],
  invoices: ["SUPER_ADMIN", "ADMIN", "SALES_REP"],
  merchants: ["SUPER_ADMIN", "ADMIN", "SALES_REP"],
  listings: ["SUPER_ADMIN", "ADMIN", "REVIEWER"],
  reviewQueue: ["SUPER_ADMIN", "ADMIN", "REVIEWER"],
  products: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  toolsPermission: ["SUPER_ADMIN"],
};

export const SECTION_TARGET_PREFIX = "section:";
export const TOOL_TARGET_PREFIX = "tool:";

export function sectionTarget(section: string): string {
  return `${SECTION_TARGET_PREFIX}${section}`;
}

export function toolTarget(key: string): string {
  return `${TOOL_TARGET_PREFIX}${key}`;
}

function pathnameOf(href: string): string {
  return href.split("?")[0];
}

/** Nav paths, longest first so nested routes match the most specific link. */
const PATH_TOOLS = ALL_ADMIN_TOOLS.flatMap((tool) =>
  [pathnameOf(tool.href), ...(tool.paths ?? [])].map((path) => ({ tool, path })),
).sort((a, b) => b.path.length - a.path.length);

/**
 * Resolve which tool a request path belongs to. Returns null for paths that
 * are not gated by the tool registry (dashboard home, login, my-listing, …).
 */
export function toolForPath(pathname: string): AdminTool | null {
  const clean = pathname.replace(/\/+$/, "");
  if (!clean || clean === "/admin") return null;

  for (const entry of PATH_TOOLS) {
    if (clean === entry.path) return entry.tool;
  }
  for (const entry of PATH_TOOLS) {
    if (clean.startsWith(`${entry.path}/`)) return entry.tool;
  }
  return null;
}
