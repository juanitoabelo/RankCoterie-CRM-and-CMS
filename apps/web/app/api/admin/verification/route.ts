import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const where: any = { tenantId: TENANT_ID };
  if (status && status !== "ALL") where.status = status;

  const requests = await prisma.verificationRequest.findMany({
    where,
    include: {
      listing: { select: { title: true, slug: true, companyName: true } },
      requestedBy: { select: { email: true, firstName: true, lastName: true } },
      reviewedBy: { select: { email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const request = await prisma.verificationRequest.findUnique({
      where: { id, tenantId: TENANT_ID },
      include: { listing: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = {
      status: data.status,
      reviewedById: "admin-user-id", // TODO: get from session
      reviewedAt: new Date(),
    };

    if (data.status === "REJECTED" && data.rejectionReason) {
      updateData.rejectionReason = data.rejectionReason;
    }

    if (data.status === "APPROVED") {
      // Update listing badges
      const listing = await prisma.listing.findUnique({
        where: { id: request.listingId },
        select: { badges: true },
      });

      const badges = (listing?.badges as string[]) || [];
      if (!badges.includes("verified")) {
        await prisma.listing.update({
          where: { id: request.listingId },
          data: {
            badges: [...badges, "verified"],
            verifiedAt: new Date(),
            verifiedFields: { push: "verification" },
          },
        });
      }
    }

    const updated = await prisma.verificationRequest.update({
      where: { id, tenantId: TENANT_ID },
      data: updateData,
    });

    await logAudit({
      action: `VERIFICATION_${data.status}`,
      entity: "VerificationRequest",
      entityId: id,
      meta: { type: "VERIFICATION", listingId: request.listingId },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}