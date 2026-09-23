import { NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
  const rows = await prisma.category.findMany({
    where: { tenantId: TENANT_ID, status: "LIVE" },
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load categories." },
      { status: 500 },
    );
  }
}