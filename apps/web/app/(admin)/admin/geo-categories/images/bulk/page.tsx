import { getGeoCategoryOptions } from "../../actions";
import BulkGeoCategoryImagesForm from "./BulkGeoCategoryImagesForm";

export const revalidate = 0;

export default async function BulkGeoCategoryImagesPage() {
  const { categories } = await getGeoCategoryOptions();
  return <BulkGeoCategoryImagesForm categories={categories} />;
}
