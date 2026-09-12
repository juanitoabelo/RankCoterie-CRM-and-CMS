import Link from "next/link";
import { listGeoCategories, deleteGeoCategoryForm } from "./actions";

export const revalidate = 0;

function ImageThumb({ assetId }: { assetId: string | null }) {
  if (!assetId) return <span className="text-xs text-zinc-400">—</span>;
  return (
    <img
      src={`/api/assets/${assetId}`}
      alt=""
      className="h-10 w-10 rounded border border-zinc-200 object-cover"
    />
  );
}

export default async function GeoCategoriesListPage() {
  const categories = await listGeoCategories();

  function findImage(images: { position: string; imageAssetId: string }[], position: string) {
    const img = images.find((i) => i.position === position);
    return img?.imageAssetId ?? null;
  }

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Geo-Targeting</span> / GeoCategory Pages
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">GeoCategory Pages</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Manage geo-targeted category pages with parent, state, and city content sections.
      </p>

      <div className="mt-6 flex gap-3">
        <Link
          href="/admin/geo-categories"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          View All GeoCategories
        </Link>
        <Link
          href="/admin/geo-categories/new"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Add New GeoCategory
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Edit GeoCat</th>
              <th className="px-4 py-2.5">GeoCat Title</th>
              <th className="px-4 py-2.5">View Page</th>
              <th className="px-4 py-2.5">Parent Img?</th>
              <th className="px-4 py-2.5">State Img?</th>
              <th className="px-4 py-2.5">City Img?</th>
              <th className="px-4 py-2.5 text-right">ID#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                  No geo categories yet.
                </td>
              </tr>
            )}
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/geo-categories/${cat.id}/edit`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900">{cat.title}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/g/${cat.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View page
                  </a>
                </td>
                <td className="px-4 py-3">
                  <ImageThumb assetId={findImage(cat.images, "PRIMARY")} />
                </td>
                <td className="px-4 py-3">
                  <ImageThumb assetId={findImage(cat.images, "STATE")} />
                </td>
                <td className="px-4 py-3">
                  <ImageThumb assetId={findImage(cat.images, "CITY")} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                  {cat.id.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
