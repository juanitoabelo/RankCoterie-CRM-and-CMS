/**
 * Admin Product Templates Page
 *
 * Server component — lists product templates with a client delete button.
 */
import Link from "next/link";
import { listProductTemplates } from "@/modules/product-template/queries";
import DeleteTemplateButton from "./DeleteTemplateButton";

export const revalidate = 0;

export default async function ProductTemplatesAdminPage() {
  const templates = await listProductTemplates("single");

  return (
    <div className="px-6 py-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-4">Product Templates</h1>

      <div className="mb-4">
        <Link
          href="/admin/product-templates/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add Product Template
        </Link>
      </div>

      {templates.length === 0 && (
        <p className="mt-4 text-zinc-500">No product templates configured.</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white mt-4">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {templates.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">{t.name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 text-xs font-medium">{t.type}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/product-templates/${t.id}`}
                    className="text-zinc-600 hover:text-zinc-900 hover:underline"
                  >
                    Edit
                  </Link>
                  <span className="ml-2">
                    <DeleteTemplateButton id={t.id} name={t.name} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
