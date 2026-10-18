import Link from "next/link";
import NewTemplateForm from "@/components/admin/listing-template-builder/NewTemplateForm";
import { createListingTemplateAction } from "../actions";

export const revalidate = 0;

export default function NewListingTemplatePage() {
  const create = async (formData: FormData) => {
    "use server";
    return createListingTemplateAction(formData);
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Directory</span> /{" "}
        <Link href="/admin/listing-layouts" className="text-zinc-700 hover:underline">Listing Custom Layout</Link> /{" "}
        <span className="text-zinc-700">New Template</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">New Listing Template</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Create a template, then arrange listing blocks and sidebar widgets in the
        Structure Display. Switch to the Visual Display to preview with real
        listings. Content fields support data-binding tokens and structured
        listing-data bindings that resolve per listing.
      </p>
      <NewTemplateForm onCreate={create} />
    </div>
  );
}
