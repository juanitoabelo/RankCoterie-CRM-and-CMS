/**
 * Admin Products Page
 *
 * Server component — lists products with searchParams-driven filters,
 * following the same pattern as the listings admin page.
 */
import Link from "next/link";
import DeleteProductButton from "@/components/admin/product/DeleteProductButton";
import PageSizeSelect from "@/components/admin/PageSizeSelect";
import { getProducts } from "@/modules/ecommerce/queries";
import { deleteProduct } from "./actions";

export const revalidate = 0;

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const PAGE_SIZE = 20;

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All types" },
  { value: "SIMPLE", label: "Simple" },
  { value: "VARIABLE", label: "Variable" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "SERVICE", label: "Service" },
  { value: "EXTERNAL", label: "External / Affiliate" },
  { value: "GROUPED", label: "Grouped" },
  { value: "BUNDLE", label: "Bundle" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "PRIVATE", label: "Private" },
];

const VISIBILITY_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All visibility" },
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
  { value: "MEMBERS", label: "Members only" },
  { value: "HIDDEN", label: "Hidden" },
];

function pageHref(params: Record<string, string>, page: number): string {
  const qs = new URLSearchParams({ ...params, page: String(page) });
  return `/admin/products?${qs.toString()}`;
}

/** Reject unknown enum values from the URL instead of letting Prisma throw. */
function pickOption(value: string | undefined, options: { value: string }[]): string {
  if (!value) return "ALL";
  return options.some((opt) => opt.value === value) ? value : "ALL";
}

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; visibility?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const type = pickOption(sp.type, TYPE_OPTIONS);
  const status = pickOption(sp.status, STATUS_OPTIONS);
  const visibility = pickOption(sp.visibility, VISIBILITY_OPTIONS);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = parseInt(sp.pageSize ?? "20", 10);

  const { items, total, totalPages } = await getProducts({
    search: q || undefined,
    type: type as never,
    status: status as never,
    visibility: visibility as never,
    page,
    pageSize: parseInt(sp.pageSize ?? "20", 10),
  });

  const filterParams = { q, type, status, visibility };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Admin / <span className="text-zinc-700">Products</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} product{total === 1 ? "" : "s"} found
          </p>
          <nav className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link href="/admin/products/categories" className="text-zinc-600 hover:text-zinc-900 hover:underline">
              Categories
            </Link>
            <Link href="/admin/products/tags" className="text-zinc-600 hover:text-zinc-900 hover:underline">
              Tags
            </Link>
            <Link href="/admin/products/attributes" className="text-zinc-600 hover:text-zinc-900 hover:underline">
              Attributes
            </Link>
          </nav>
        </div>
        <Link
          href="/admin/products/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add product
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <label htmlFor="q" className="block text-xs font-medium text-zinc-500">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Name, description or SKU"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-xs font-medium text-zinc-500">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-zinc-500">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="visibility" className="block text-xs font-medium text-zinc-500">
            Visibility
          </label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={visibility}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="block text-xs font-medium text-zinc-500">
            Per page
          </label>
          <select
            id="pageSize"
            name="pageSize"
            defaultValue={String(pageSize)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Filter
        </button>
      </form>

      {/* Products table */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        product.images[0]?.asset
                          ? `/api/assets/${product.images[0].assetId}`
                          : "/placeholder-product.svg"
                      }
                      alt=""
                      className="h-8 w-8 rounded border border-zinc-200 bg-zinc-100 object-cover"
                    />
                    <div>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {product.name}
                      </Link>
                      {product.featured && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600">{product.sku || "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
                    {product.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      product.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-700"
                        : product.status === "DRAFT"
                          ? "bg-zinc-100 text-zinc-600"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {product.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">{product.visibility}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium ${
                      product.stockStatus === "IN_STOCK"
                        ? "text-emerald-600"
                        : product.stockStatus === "LOW_STOCK"
                          ? "text-amber-600"
                          : "text-zinc-400"
                    }`}
                  >
                    {product.stockStatus.replace(/_/g, " ")}
                    {product.manageStock && product.stockQuantity !== null
                      ? ` (${product.stockQuantity})`
                      : ""}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3 text-sm">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-zinc-600 hover:text-zinc-900 hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteProductButton id={product.id} name={product.name} action={deleteProduct} />
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-zinc-700">No products found</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Create your first product to get started.
                  </p>
                  <Link
                    href="/admin/products/add"
                    className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                  >
                    Add product
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref({ ...filterParams, pageSize: sp.pageSize ?? "20" }, page - 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref({ ...filterParams, pageSize: sp.pageSize ?? "20" }, page + 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
      {totalPages > 1 && (
        <PageSizeSelect
          pageSize={sp.pageSize ?? "20"}
          filterParams={filterParams}
          options={PAGE_SIZE_OPTIONS}
        />
      )}
    </div>
  );
}
