import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const forms = await prisma.customForm.findMany({
    where: { tenantId: TENANT_ID, status: "PUBLISHED" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ forms });
}
