import { createCategoryImageForm, deleteCategoryImageForm, getGeoImageOptions, listCategoryImages } from "./actions";
import BulkGeoImageForm from "./BulkGeoImageForm";

export const revalidate = 0;

export default async function GeoImagesAdminPage() {
  const [images, options] = await Promise.all([listCategoryImages(), getGeoImageOptions()]);
  const categoryNames = new Map(options.categories.map((category) => [category.id, category.title]));
  const regionNames = new Map(options.regions.map((region) => [region.id, region.city ? `${region.city}, ${region.state}` : region.slug]));
  const categoryOptions = options.categories.map((category) => ({ id: category.id, label: category.title }));
  const regionOptions = options.regions.map((region) => ({ id: region.id, label: region.city ? `${region.city}, ${region.state}` : region.slug }));
  return (
    <div>
      <p className="text-sm text-zinc-500">Admin / <span className="text-zinc-700">Geo-Targeting</span> / Geo Category Images</p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Geo Category Images</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">Assign uploaded assets to a category, region, or both. Paste asset IDs returned by `/api/uploads`; multiple rows can share an asset for bulk coverage.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <BulkGeoImageForm categories={categoryOptions} regions={regionOptions} />
        <form action={createCategoryImageForm} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Assign image</h2>
          <label className="block text-xs font-medium text-zinc-600">Image asset ID<input name="imageAssetId" required placeholder="Asset ID from upload" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></label>
          <label className="block text-xs font-medium text-zinc-600">Category<select name="categoryId" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"><option value="">All categories</option>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
          <label className="block text-xs font-medium text-zinc-600">Region<select name="regionId" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"><option value="">All regions</option>{options.regions.map((region) => <option key={region.id} value={region.id}>{region.city ? `${region.city}, ${region.state}` : region.slug}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-medium text-zinc-600">Position<select name="position" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"><option>PRIMARY</option><option>BANNER</option><option>THUMB</option></select></label><label className="block text-xs font-medium text-zinc-600">Order<input type="number" name="order" defaultValue={0} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></label></div>
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-600"><input type="checkbox" name="isPrimary" />Primary image</label>
          <div className="flex justify-end border-t border-zinc-100 pt-3"><button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Assign image</button></div>
        </form>
        <section className="rounded-xl border border-zinc-200 bg-white p-5"><h2 className="text-sm font-medium text-zinc-900">Assignments ({images.length})</h2><ul className="mt-4 divide-y divide-zinc-100">{images.map((image) => <li key={image.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-900">{categoryNames.get(image.categoryId ?? "") ?? "All categories"} · {regionNames.get(image.regionId ?? "") ?? "All regions"}</p><p className="truncate text-xs text-zinc-500">Asset {image.imageAssetId} · {image.position}{image.isPrimary ? " · Primary" : ""}</p></div><form action={deleteCategoryImageForm}><input type="hidden" name="id" value={image.id} /><button type="submit" className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600">Delete</button></form></li>)}{images.length === 0 && <li className="py-3 text-sm text-zinc-400">No image assignments yet.</li>}</ul></section>
      </div>
    </div>
  );
}
