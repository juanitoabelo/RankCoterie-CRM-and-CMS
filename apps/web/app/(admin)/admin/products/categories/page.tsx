/**
 * Admin product categories — list, create and delete.
 */
import Link from "next/link";
import { listProductCategories } from "@/modules/ecommerce/queries";
import { createProductCategory, deleteProductCategory } from "../actions";
import { CategoryCreateForm, EntityDeleteButton } from "@/components/admin/product/TaxonomyForms";

export const revalidate = 0;

function indent(rows: Awaited<ReturnType<typeof listProductCategories>>) {
  const byParent = new Map<string | null, typeof rows>();
  for (const row of rows) {
    const list = byParent.get(row.parentId ?? null) ?? [];
    list.push(row);
    byParent.set(row.parentId ?? null, list);
  }

  const flat: Array<{ row: (typeof rows)[number]; depth: number }> = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const row of byParent.get(parentId) ?? []) {
      flat.push({ row, depth });
      walk(row.id, depth + 1);
    }
  };
  walk(null, 0);

  // Orphans (parent filtered out / missing) still belong on the screen.
  for (const row of rows) {
    if (!flat.some((entry) => entry.row.id === row.id)) flat.push({ row, depth: 0 });
  }

  return flat;
}

export default async function ProductCategoriesAdminPage() {
  const rows = await listProductCategories();
  const flat = indent(rows);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          Admin /{" "}
          <Link href="/admin/products" className="text-zinc-700 hover:underline">
            Products
          </Link>{" "}
          / <span className="text-zinc-700">Categories</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Product categories</h1>
        <p className="mt-1 text-sm text-zinc-500">{rows.length} categories</p>
        <nav className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href="/admin/products" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Products
          </Link>
          <Link href="/admin/products/tags" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Tags
          </Link>
          <Link href="/admin/products/attributes" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Attributes
          </Link>
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {flat.map(({ row, depth }) => (
                <tr key={row.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900" style={{ paddingLeft: 16 + depth * 16 }}>
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{row.slug}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{row._count.products}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {row.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EntityDeleteButton id={row.id} name={row.name} action={deleteProductCategory} />
                  </td>
                </tr>
              ))}
              {flat.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No categories yet — add your first one on the right.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <CategoryCreateForm
          action={createProductCategory}
          categories={rows.map((row) => ({ id: row.id, name: row.name }))}
        />
      </div>
    </div>
  );
}
