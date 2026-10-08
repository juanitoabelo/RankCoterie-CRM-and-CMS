import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const placement = await prisma.featuredPlacement.findUnique({
    where: { id, tenantId: TENANT_ID },
    include: {
      category: { select: { title: true, slug: true } },
      region: { select: { stateFull: true, slug: true } },
      purchases: {
        include: {
          listing: { select: { title: true, slug: true, tier: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!placement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(placement);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const placement = await prisma.featuredPlacement.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        type: data.type,
        slug: data.slug,
        label: data.label,
        description: data.description,
        priceMonthly: data.priceMonthly,
        priceQuarterly: data.priceQuarterly,
        priceAnnually: data.priceAnnually,
        currency: data.currency,
        maxSlots: data.maxSlots,
        categoryId: data.categoryId,
        regionId: data.regionId,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        status: data.status,
      },
    });

    await logAudit({
      action: "FEATURED_PLACEMENT_UPDATE",
      entity: "FeaturedPlacement",
      entityId: id,
      meta: { type: data.type, slug: data.slug, label: data.label },
    });

    return NextResponse.json(placement);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.featuredPlacement.delete({
      where: { id, tenantId: TENANT_ID },
    });

    await logAudit({
      action: "FEATURED_PLACEMENT_DELETE",
      entity: "FeaturedPlacement",
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}