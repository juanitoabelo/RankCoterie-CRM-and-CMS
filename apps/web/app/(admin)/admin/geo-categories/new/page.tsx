import { getGeoCategoryFormOptions } from "../actions";
import NewGeoCategoryForm from "./NewGeoCategoryForm";

export default async function NewGeoCategoryPage() {
  const { sections, states } = await getGeoCategoryFormOptions();
  return <NewGeoCategoryForm sections={sections} states={states} />;
}
