import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { readIdList } from "@/modules/ecommerce/product-form";
import { getEffectiveProductPrice } from "@/modules/ecommerce/pricing";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";
import { getApiUser, canAccessSectionForUser } from "@/modules/auth";

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/\n/g, " ").replace(/"/g, '""')}"`;
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user || !(await canAccessSectionForUser(user, "products"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const ids = readIdList(formData, "ids", "Products");
    const where = ids.length ? { id: { in: ids }, tenantId: TENANT_ID } : { tenantId: TENANT_ID };

    const products = await prisma.product.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "ID",
      "Name",
      "Slug",
      "SKU",
      "Type",
      "Status",
      "Visibility",
      "Featured",
      "Regular Price",
      "Sale Price",
      "Effective Price",
      "Stock Status",
      "Stock Quantity",
      "Categories",
      "Tags",
      "Short Description",
      "Created At",
      "Updated At",
    ];

    const rows = products.map((product) => {
      const price = getEffectiveProductPrice(product);
      return [
        product.id,
        product.name,
        product.slug,
        product.sku,
        product.type,
        product.status,
        product.visibility,
        product.featured ? "yes" : "no",
        product.regularPrice.toFixed(2),
        product.salePrice?.toFixed(2) ?? "",
        price.price.toFixed(2),
        product.stockStatus,
        product.stockQuantity ?? "",
        product.categories.map((link) => link.category.name).join("; "),
        product.tags.map((link) => link.tag.name).join("; "),
        (product.shortDescription ?? "").replace(/\n/g, " "),
        product.createdAt.toISOString(),
        product.updatedAt.toISOString(),
      ];
    });

    const csv = [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");

    await logAudit({
      action: "PRODUCT_EXPORT",
      entity: "Product",
      entityId: ids.join(",") || "all",
      meta: { count: products.length },
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Product export error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
