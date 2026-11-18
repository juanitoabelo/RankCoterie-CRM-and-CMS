import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { canAccessAnySectionForUser, getApiUser } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user || !(await canAccessAnySectionForUser(user, ["crm", "leads", "clients"]))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await getCrmAccessForUser(user);
  const { id } = await params;

  const attachment = await prisma.crmAttachment.findFirst({
    where: {
      id,
      tenantId: TENANT_ID,
      ...(access.ownedOnly
        ? {
            OR: [
              { deal: { ownerId: access.userId } },
              { lead: { assignedToId: access.userId } },
              { client: { assignedToId: access.userId } },
            ],
          }
        : {}),
    },
    include: {
      asset: { select: { bytes: true, mimeType: true, size: true, filename: true } },
    },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const safeFilename = attachment.filename.replace(/"/g, "");
  return new NextResponse(attachment.asset.bytes, {
    status: 200,
    headers: {
      "Content-Type": attachment.asset.mimeType,
      "Content-Length": String(attachment.asset.size),
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="${safeFilename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
