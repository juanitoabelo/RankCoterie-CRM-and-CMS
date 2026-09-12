import { NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);
  const offset = Number(searchParams.get("offset") || "0");

  const assets = await prisma.asset.findMany({
    where: { tenantId: TENANT_ID, kind: "image" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
    take: limit,
    skip: offset,
  });

  const total = await prisma.asset.count({
    where: { tenantId: TENANT_ID, kind: "image" },
  });

  return NextResponse.json({
    assets: assets.map((a) => ({
      id: a.id,
      url: `/api/assets/${a.id}`,
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
      createdAt: a.createdAt.toISOString(),
    })),
    total,
  });
}
