import { NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";

export async function GET() {
  const rows = await prisma.category.findMany({
    where: { tenantId: TENANT_ID, status: "LIVE" },
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json(rows);
}