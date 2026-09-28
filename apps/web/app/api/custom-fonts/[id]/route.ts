import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { canAccessSection, getApiUser } from "@/modules/auth";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cuid, so a crafted id can never reach Prisma as a path/filter expression. */
const SAFE_ID = /^[a-zA-Z0-9_-]+$/;

/**
 * Serve the font bytes. Deliberately unauthenticated (like `/api/assets/[id]`)
 * because public pages have to fetch fonts the browser has no session for, and
 * the bytes are not sensitive — a font file is not user data.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const font = await prisma.customFont.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true, mimeType: true, size: true, bytes: true },
  });
  if (!font) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(font.bytes, {
    status: 200,
    headers: {
      "Content-Type": font.mimeType,
      "Content-Length": String(font.size),
      // Uploads always get a fresh id, so the URL changes and this can be immutable.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user || !canAccessSection(user, "themeSettings")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const font = await prisma.customFont.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true, family: true },
  });
  if (!font) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // `?family=1` drops every weight of the family; the id alone drops one file.
  const wholeFamily = new URL(request.url).searchParams.get("family") === "1";
  if (wholeFamily) {
    const { count } = await prisma.customFont.deleteMany({
      where: { tenantId: TENANT_ID, family: font.family },
    });
    await logAudit({
      action: "CUSTOM_FONT_DELETE",
      entity: "CustomFont",
      entityId: font.id,
      actorId: user.id,
      meta: { family: font.family, filesDeleted: count },
    });
    return NextResponse.json({ ok: true, deleted: count });
  }

  await prisma.customFont.delete({ where: { id } });
  await logAudit({
    action: "CUSTOM_FONT_DELETE",
    entity: "CustomFont",
    entityId: id,
    actorId: user.id,
    meta: { family: font.family },
  });

  return NextResponse.json({ ok: true, deleted: 1 });
}
