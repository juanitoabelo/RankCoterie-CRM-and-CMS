import { NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.category.findMany({
    where: { tenantId: TENANT_ID, status: "LIVE" },
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json(rows);
}