import { getCompanyOptions } from "../actions";
import NewWidgetForm from "./NewWidgetForm";

export const revalidate = 0;

export default async function NewWidgetPage() {
  const companyOptions = await getCompanyOptions();

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/widgets" className="hover:text-zinc-700">Widget Builder</a> /{" "}
        <span className="text-zinc-700">Add New Widget</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Add New Widget <span className="text-blue-600">ⓘ</span>
      </h1>

      <NewWidgetForm companyOptions={companyOptions} />
    </div>
  );
}
