import { NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.section.findMany({
      where: { tenantId: TENANT_ID, status: "LIVE" },
      select: { id: true, title: true, heading: true, slug: true, categoryId: true },
      orderBy: [{ order: "asc" }, { title: "asc" }],
    });
    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        title: row.heading || row.title,
        slug: row.slug,
        categoryId: row.categoryId,
      })),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load sections." },
      { status: 500 },
    );
  }
}
