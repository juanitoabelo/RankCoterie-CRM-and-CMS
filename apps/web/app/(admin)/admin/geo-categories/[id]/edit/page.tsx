import { notFound } from "next/navigation";
import { getGeoCategory, getGeoCategoryFormOptions } from "../../actions";
import { listGeoCategoryTemplates } from "../../../geo-category-template/actions";
import { getGeoCategoryTemplateAssignment } from "@/modules/geo-category-template";
import EditGeoCategoryForm from "./GeoCategoryEditForm";

export const revalidate = 0;

export default async function EditGeoCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, options, geoTemplates, assignment] = await Promise.all([
    getGeoCategory(id),
    getGeoCategoryFormOptions(id),
    listGeoCategoryTemplates(),
    getGeoCategoryTemplateAssignment(id),
  ]);
  if (!category) return notFound();

  return (
    <EditGeoCategoryForm
      category={category}
      sections={options.sections}
      states={options.states}
      geoTemplates={geoTemplates}
      assignedTemplateId={assignment?.geoCategoryTemplateId ?? null}
    />
  );
}
