import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { parseProductBulkAction, readIdList } from "@/modules/ecommerce/product-form";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";
import { getApiUser, canAccessSectionForUser } from "@/modules/auth";

async function authed(): Promise<boolean> {
  const user = await getApiUser();
  return user !== null && (await canAccessSectionForUser(user, "products"));
}

export async function POST(request: NextRequest) {
  if (!(await authed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const ids = readIdList(formData, "ids", "Products");
    const parsed = parseProductBulkAction(formData);

    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "No products selected" }, { status: 400 });
    }
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const data =
      parsed.action === "status"
        ? { status: parsed.value }
        : { featured: parsed.value };

    const result = await prisma.product.updateMany({
      where: { id: { in: ids }, tenantId: TENANT_ID },
      data,
    });

    await logAudit({
      action: parsed.action === "status" ? "PRODUCT_BULK_STATUS" : "PRODUCT_BULK_FEATURED",
      entity: "Product",
      entityId: ids.join(","),
      meta: { action: parsed.action, value: parsed.value, count: result.count },
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error("Bulk product update error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Bulk update failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await authed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const rawIds = searchParams.get("ids");
    let ids: string[] = [];
    if (rawIds) {
      try {
        const parsed = JSON.parse(rawIds);
        ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : rawIds.split(",").filter(Boolean);
      } catch {
        ids = rawIds.split(",").filter(Boolean);
      }
    }
    ids = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];

    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "No products selected" }, { status: 400 });
    }

    const result = await prisma.product.deleteMany({
      where: { id: { in: ids }, tenantId: TENANT_ID },
    });

    await logAudit({
      action: "PRODUCT_BULK_DELETE",
      entity: "Product",
      entityId: ids.join(","),
      meta: { count: result.count },
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error("Bulk product delete error:", error);
    return NextResponse.json({ ok: false, error: "Bulk delete failed" }, { status: 500 });
  }
}
