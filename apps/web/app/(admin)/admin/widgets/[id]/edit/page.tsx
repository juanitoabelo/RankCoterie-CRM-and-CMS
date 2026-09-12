import { notFound } from "next/navigation";
import { getWidget, getCompanyOptions } from "../../actions";
import WidgetEditForm from "./WidgetEditForm";

export const revalidate = 0;

export default async function WidgetEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const widget = await getWidget(id);
  if (!widget) return notFound();

  const companyOptions = await getCompanyOptions();

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/widgets" className="hover:text-zinc-700">Widget Builder</a> /{" "}
        <span className="text-zinc-700">Edit</span>
      </p>
      <div className="flex items-start justify-between">
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          Edit: <span className="text-blue-600">{widget.title ?? widget.name}</span> <span className="text-blue-600">ⓘ</span>
        </h1>
        <span className="text-xs text-zinc-400">Help with SEO (search engine optimization) ⦿</span>
      </div>

      <WidgetEditForm widget={widget} companyOptions={companyOptions} />
    </div>
  );
}
