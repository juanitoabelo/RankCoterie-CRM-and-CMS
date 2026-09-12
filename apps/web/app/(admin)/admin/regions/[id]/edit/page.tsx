import { notFound } from "next/navigation";
import { getRegion } from "../../actions";
import RegionEditForm from "./RegionEditForm";

export const revalidate = 0;

export default async function RegionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const region = await getRegion(id);
  if (!region) return notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/regions" className="hover:text-zinc-700">Regions</a> /{" "}
        <span className="text-zinc-700">Edit</span>
      </p>
      <div className="flex items-start justify-between">
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          Edit: <span className="text-blue-600">{region.state} Region</span>
        </h1>
        <span className="text-xs text-zinc-400">Help with SEO (search engine optimization) ⦿</span>
      </div>

      <RegionEditForm region={region} />
    </div>
  );
}
