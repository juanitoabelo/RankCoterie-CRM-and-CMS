/**
 * Admin product tags — list, create and delete.
 */
import Link from "next/link";
import { listProductTags } from "@/modules/ecommerce/queries";
import { createProductTag, deleteProductTag } from "../actions";
import { EntityDeleteButton, TagCreateForm } from "@/components/admin/product/TaxonomyForms";

export const revalidate = 0;

export default async function ProductTagsAdminPage() {
  const tags = await listProductTags();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          Admin /{" "}
          <Link href="/admin/products" className="text-zinc-700 hover:underline">
            Products
          </Link>{" "}
          / <span className="text-zinc-700">Tags</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Product tags</h1>
        <p className="mt-1 text-sm text-zinc-500">{tags.length} tags</p>
        <nav className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href="/admin/products" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Products
          </Link>
          <Link href="/admin/products/categories" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Categories
          </Link>
          <Link href="/admin/products/attributes" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Attributes
          </Link>
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {tags.map((tag) => (
              <li key={tag.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{tag.name}</p>
                  <p className="truncate text-xs text-zinc-500">{tag.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="tabular-nums text-xs text-zinc-500">
                    {tag._count.products} product{tag._count.products === 1 ? "" : "s"}
                  </span>
                  <EntityDeleteButton id={tag.id} name={tag.name} action={deleteProductTag} />
                </div>
              </li>
            ))}
            {tags.length === 0 && (
              <li className="px-4 py-12 text-center text-sm text-zinc-500">
                No tags yet — add your first one on the right.
              </li>
            )}
          </ul>
        </div>

        <TagCreateForm action={createProductTag} />
      </div>
    </div>
  );
}
