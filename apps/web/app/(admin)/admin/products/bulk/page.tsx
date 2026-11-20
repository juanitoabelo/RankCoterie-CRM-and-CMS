import ProductBulkClient from "@/components/admin/product/ProductBulkClient";
import { getProducts } from "@/modules/ecommerce/queries";

export const revalidate = 0;

export default async function BulkActionsPage() {
  const { items } = await getProducts({ pageSize: 100, sortBy: "name", sortOrder: "asc" });

  return (
    <ProductBulkClient
      products={items.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        type: product.type,
        status: product.status,
        price: product.price,
        stockStatus: product.stockStatus,
        featured: product.featured,
        createdAt: product.createdAt,
      }))}
    />
  );
}
