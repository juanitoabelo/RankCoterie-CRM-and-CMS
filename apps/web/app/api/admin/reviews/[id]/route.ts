import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const review = await prisma.review.findUnique({
    where: { id, tenantId: TENANT_ID },
    include: { listing: { select: { title: true, slug: true, tier: true } } },
  });

  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(review);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const review = await prisma.review.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        status: data.status,
        response: data.response,
        respondedAt: data.response ? new Date() : null,
      },
    });

    await logAudit({
      action: `REVIEW_${data.status}`,
      entity: "Review",
      entityId: id,
      meta: { listingId: review.listingId },
    });

    return NextResponse.json(review);
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

    await prisma.review.delete({ where: { id, tenantId: TENANT_ID } });

    await logAudit({
      action: "REVIEW_DELETE",
      entity: "Review",
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}