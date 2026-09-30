/**
 * Admin product attributes — list, create, plus term management.
 */
import Link from "next/link";
import { getAllProductAttributes } from "@/modules/ecommerce/queries";
import {
  createAttributeTerm,
  createProductAttribute,
  deleteAttributeTerm,
  deleteProductAttribute,
} from "../actions";
import {
  AttributeCreateForm,
  EntityDeleteButton,
  TermCreateForm,
} from "@/components/admin/product/TaxonomyForms";

export const revalidate = 0;

export default async function ProductAttributesAdminPage() {
  const attributes = await getAllProductAttributes();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          Admin /{" "}
          <Link href="/admin/products" className="text-zinc-700 hover:underline">
            Products
          </Link>{" "}
          / <span className="text-zinc-700">Attributes</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Product attributes</h1>
        <p className="mt-1 text-sm text-zinc-500">{attributes.length} attributes</p>
        <nav className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href="/admin/products" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Products
          </Link>
          <Link href="/admin/products/categories" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Categories
          </Link>
          <Link href="/admin/products/tags" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Tags
          </Link>
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {attributes.map((attribute) => (
            <div key={attribute.id} className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">{attribute.name}</h2>
                  <p className="text-xs text-zinc-500">
                    {attribute.slug} · {attribute.type}
                    {attribute.isFilterable ? " · filterable" : ""}
                    {attribute.isVariation ? " · variation" : ""}
                    {!attribute.isVisible ? " · hidden" : ""}
                  </p>
                </div>
                <EntityDeleteButton
                  id={attribute.id}
                  name={attribute.name}
                  action={deleteProductAttribute}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {attribute.terms.map((term) => (
                  <span
                    key={term.id}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700"
                  >
                    {term.name}
                    <EntityDeleteButton
                      id={term.id}
                      name={term.name}
                      label="×"
                      action={deleteAttributeTerm}
                    />
                  </span>
                ))}
                {attribute.terms.length === 0 && (
                  <span className="text-xs text-zinc-400">No values yet.</span>
                )}
              </div>

              <div className="mt-4">
                <TermCreateForm attributeId={attribute.id} action={createAttributeTerm} />
              </div>
            </div>
          ))}

          {attributes.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-12 text-center text-sm text-zinc-500">
              No attributes yet — add your first one on the right (e.g. Colour, Size).
            </div>
          )}
        </div>

        <AttributeCreateForm action={createProductAttribute} />
      </div>
    </div>
  );
}
