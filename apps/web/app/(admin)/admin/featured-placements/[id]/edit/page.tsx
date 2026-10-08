import { prisma } from "@/lib/directory/prismaCatalog";
import { getFeaturedPlacement, getCategoriesForSelect, getRegionsForSelect, getFeaturedPlacementTypes, getFeaturedPlacementStatuses } from "../actions";
import FeaturedPlacementForm from "../FeaturedPlacementForm";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function EditFeaturedPlacementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [placement, categories, regions, types, statuses] = await Promise.all([
    getFeaturedPlacement(id),
    getCategoriesForSelect(),
    getRegionsForSelect(),
    getFeaturedPlacementTypes(),
    getFeaturedPlacementStatuses(),
  ]);

  if (!placement) notFound();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / Featured Placements / <span className="text-zinc-700">Edit</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit Featured Placement</h1>
      <div className="mt-6 max-w-3xl">
        <FeaturedPlacementForm
          placement={placement}
          categories={categories}
          regions={regions}
          types={types}
          statuses={statuses}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}