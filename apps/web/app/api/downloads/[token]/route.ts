import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = "private, no-store, no-cache, must-revalidate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const grant = await prisma.digitalDownloadGrant.findFirst({
    where: { token, tenantId: TENANT_ID },
    select: {
      id: true,
      url: true,
      expiresAt: true,
      downloadLimit: true,
      downloadsUsed: true,
      order: { select: { paymentStatus: true } },
    },
  });

  if (!grant || grant.order.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "Download not found." }, { status: 404, headers: { "Cache-Control": NO_STORE } });
  }
  if (grant.expiresAt && grant.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "This download has expired." }, { status: 410, headers: { "Cache-Control": NO_STORE } });
  }

  const claimed = await prisma.digitalDownloadGrant.updateMany({
    where: {
      id: grant.id,
      tenantId: TENANT_ID,
      OR: [{ downloadLimit: null }, { downloadsUsed: { lt: grant.downloadLimit } }],
    },
    data: { downloadsUsed: { increment: 1 } },
  });
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "This download has reached its download limit." },
      { status: 410, headers: { "Cache-Control": NO_STORE } },
    );
  }

  const destination = /^https?:\/\//.test(grant.url)
    ? grant.url
    : `${process.env.SITE_URL?.replace(/\/+$/, "") ?? ""}${grant.url}`;
  return NextResponse.redirect(destination, { status: 302, headers: { "Cache-Control": NO_STORE } });
}
