import Link from "next/link";
import CreateProductTemplateForm from "@/components/admin/product-template-builder/CreateProductTemplateForm";

export default function CreateSingleProductPage() {
  return (
    <div className="p-6">
      <p className="text-sm text-zinc-500">
        Admin /{" "}
        <Link href="/admin/products" className="text-zinc-700 hover:underline">Products</Link>
        {" / "}
        <span className="text-zinc-700">Create Single Product Page</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Create Custom Single Product Page
      </h1>
      <p className="mt-3 max-w-3xl text-sm text-zinc-600">
        Create a reusable product-page template, arrange product and content blocks, bind each block to product data, and preview it with a real product.
      </p>
      <CreateProductTemplateForm />
      <p className="mt-5 text-sm text-zinc-600">
        Existing templates:{" "}
        <Link href="/admin/product-templates" className="font-medium text-blue-700 hover:underline">
          Manage Product Templates
        </Link>
      </p>
    </div>
  );
}
