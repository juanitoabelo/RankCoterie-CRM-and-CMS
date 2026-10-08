import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";

export async function GET() {
  const placements = await prisma.featuredPlacement.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      category: { select: { title: true, slug: true } },
      region: { select: { stateFull: true, slug: true } },
      _count: { select: { purchases: true } },
    },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(placements);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const placement = await prisma.featuredPlacement.create({
      data: {
        tenantId: TENANT_ID,
        type: data.type,
        slug: data.slug,
        label: data.label,
        description: data.description,
        priceMonthly: data.priceMonthly,
        priceQuarterly: data.priceQuarterly,
        priceAnnually: data.priceAnnually,
        currency: data.currency ?? "USD",
        maxSlots: data.maxSlots ?? 1,
        categoryId: data.categoryId,
        regionId: data.regionId,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        status: data.status ?? "AVAILABLE",
      },
    });

    await logAudit({
      action: "FEATURED_PLACEMENT_CREATE",
      entity: "FeaturedPlacement",
      entityId: placement.id,
      meta: { type: data.type, slug: data.slug, label: data.label },
    });

    return NextResponse.json(placement);
  } catch (error) {
    console.error("Create error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}