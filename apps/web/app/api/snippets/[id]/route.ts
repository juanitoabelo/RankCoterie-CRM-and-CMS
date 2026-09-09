import { NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { canAccessSection, getApiUser } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user || (!canAccessSection(user, "pages") && !canAccessSection(user, "templates"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.snippet.deleteMany({
    where: { id, tenantId: TENANT_ID },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Snippet not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}