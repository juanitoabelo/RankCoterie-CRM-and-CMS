import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !verifyAdminToken(token, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";

  const result = await prisma.snippet.deleteMany({
    where: { id, tenantId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Snippet not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}