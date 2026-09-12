import { getGeoCategoryOptions } from "../../actions";
import NewGeoCategoryImageForm from "./NewGeoCategoryImageForm";

export const revalidate = 0;

export default async function NewGeoCategoryImagePage() {
  const { categories, regions } = await getGeoCategoryOptions();
  return <NewGeoCategoryImageForm categories={categories} regions={regions} />;
}
