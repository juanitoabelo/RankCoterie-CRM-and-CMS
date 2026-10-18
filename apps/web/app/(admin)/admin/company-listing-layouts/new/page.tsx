import Link from "next/link";
import NewTemplateForm from "@/components/admin/listing-template-builder/NewTemplateForm";
import { createCompanyListingTemplateAction } from "../actions";

export const revalidate = 0;

export default function NewCompanyListingTemplatePage() {
  const create = async (formData: FormData) => {
    "use server";
    return createCompanyListingTemplateAction(formData);
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Directory</span> /{" "}
        <Link href="/admin/company-listing-layouts" className="text-zinc-700 hover:underline">Company Listing Custom Landing Page Layout</Link> /{" "}
        <span className="text-zinc-700">Add New Custom Landing Page</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add New Custom Landing Page</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Create a template, then arrange company landing page blocks and sidebar widgets in the
        Structure Display. Switch to the Visual Display to preview with real
        company pages. Content fields support data-binding tokens and structured
        listing-data bindings that resolve per company page.
      </p>
      <NewTemplateForm onCreate={create} />
    </div>
  );
}