import { notFound } from "next/navigation";
import { getGeoCategory, getGeoCategoryFormOptions } from "../../actions";
import EditGeoCategoryForm from "./GeoCategoryEditForm";

export const revalidate = 0;

export default async function EditGeoCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, options] = await Promise.all([getGeoCategory(id), getGeoCategoryFormOptions(id)]);
  if (!category) return notFound();

  return <EditGeoCategoryForm category={category} sections={options.sections} states={options.states} />;
}
