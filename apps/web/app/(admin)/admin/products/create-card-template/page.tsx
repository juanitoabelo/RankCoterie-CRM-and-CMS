import Link from "next/link";
import ProductCardTemplateBuilder from "@/components/admin/product/ProductCardTemplateBuilder";
import { getProductCardTemplateSettings } from "@/lib/product-card-template-server";
import { getProductGridPage } from "@/modules/ecommerce/queries";
import { requireSection } from "@/modules/auth";

export const revalidate = 0;

export default async function CreateProductCardTemplatePage() {
  await requireSection("products");
  const [settings, preview] = await Promise.all([
    getProductCardTemplateSettings(),
    getProductGridPage({ perPage: 6, orderBy: "date", sortOrder: "desc" }),
  ]);

  return (
    <div>
      <nav className="px-4 pt-4 text-sm text-zinc-500 sm:px-6" aria-label="Breadcrumb">
        Admin /{" "}
        <Link href="/admin/products" className="text-zinc-700 hover:underline">
          Products
        </Link>{" "}
        / <span className="text-zinc-700">Product card template</span>
      </nav>
      <ProductCardTemplateBuilder
        initialSettings={settings}
        previewProducts={preview.items}
      />
    </div>
  );
}
