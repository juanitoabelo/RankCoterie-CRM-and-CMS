import { NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { canAccessSection, getApiUser } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asset = await prisma.asset.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  const safeFilename = (asset.filename ?? "image").replace(/"/g, "");

  return new NextResponse(asset.bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${safeFilename}"`,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user || !canAccessSection(user, "myCompany")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const asset = await prisma.asset.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!asset) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.asset.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user || !canAccessSection(user, "myCompany")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const asset = await prisma.asset.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!asset) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" || body.title === null) data.title = body.title || null;
  if (typeof body.alt === "string" || body.alt === null) data.alt = body.alt || null;
  if (typeof body.caption === "string" || body.caption === null) data.caption = body.caption || null;
  if (typeof body.width === "number" || body.width === null) data.width = body.width || null;
  if (typeof body.height === "number" || body.height === null) data.height = body.height || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const updated = await prisma.asset.update({ where: { id }, data });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    alt: updated.alt,
    caption: updated.caption,
    width: updated.width,
    height: updated.height,
  });
}