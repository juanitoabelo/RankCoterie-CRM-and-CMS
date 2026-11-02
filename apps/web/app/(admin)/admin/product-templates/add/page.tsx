import Link from "next/link";
import CreateProductTemplateForm from "@/components/admin/product-template-builder/CreateProductTemplateForm";

export default function AddProductTemplatePage() {
  return (
    <div className="px-6 py-6">
      <p className="text-sm text-zinc-500">
        Admin / <Link href="/admin/product-templates" className="hover:underline">Product Templates</Link> / New
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Create Product Template</h1>
      <CreateProductTemplateForm />
    </div>
  );
}
