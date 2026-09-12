import { notFound } from "next/navigation";
import { getGeoCategory } from "../../actions";
import EditGeoCategoryForm from "./GeoCategoryEditForm";

export const revalidate = 0;

export default async function EditGeoCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getGeoCategory(id);
  if (!category) return notFound();

  return <EditGeoCategoryForm category={category} />;
}
