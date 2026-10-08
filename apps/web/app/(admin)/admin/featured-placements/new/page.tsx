import { prisma } from "@/lib/directory/prismaCatalog";
import { getCategoriesForSelect, getRegionsForSelect, getFeaturedPlacementTypes, getFeaturedPlacementStatuses } from "../actions";
import FeaturedPlacementForm from "../FeaturedPlacementForm";

export const revalidate = 0;

export default async function NewFeaturedPlacementPage() {
  const [categories, regions, types, statuses] = await Promise.all([
    getCategoriesForSelect(),
    getRegionsForSelect(),
    getFeaturedPlacementTypes(),
    getFeaturedPlacementStatuses(),
  ]);

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / Featured Placements / <span className="text-zinc-700">New</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">New Featured Placement</h1>
      <div className="mt-6 max-w-3xl">
        <FeaturedPlacementForm
          placement={null}
          categories={categories}
          regions={regions}
          types={types}
          statuses={statuses}
          submitLabel="Create Placement"
        />
      </div>
    </div>
  );
}