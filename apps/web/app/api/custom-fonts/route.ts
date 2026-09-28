import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { canAccessSection, getApiUser } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { loadCustomFonts } from "@/lib/custom-fonts.server";
import {
  MAX_FONT_BYTES,
  validateFontBytes,
  validateFontFamily,
  validateFontStyle,
  validateFontWeight,
} from "@/lib/custom-fonts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List the tenant's uploaded fonts (metadata only — bytes come from /[id]). */
export async function GET() {
  const user = await getApiUser();
  if (!user || !canAccessSection(user, "themeSettings")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ fonts: await loadCustomFonts() });
}

/** Upload one font file: a family name plus weight/style metadata. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user || !canAccessSection(user, "themeSettings")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_FONT_BYTES) {
    return NextResponse.json({ error: "Font files must be 5 MB or smaller." }, { status: 413 });
  }

  const family = validateFontFamily(String(formData.get("family") ?? ""));
  if (!family.ok) return NextResponse.json({ error: family.error }, { status: 400 });

  const weight = validateFontWeight(String(formData.get("weight") ?? "400"));
  if (!weight.ok) return NextResponse.json({ error: weight.error }, { status: 400 });

  const style = validateFontStyle(String(formData.get("style") ?? "normal"));
  const mono = formData.get("mono") === "on" || formData.get("mono") === "true";

  const bytes = Buffer.from(await file.arrayBuffer());
  const validated = validateFontBytes(bytes, file.type);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  try {
    // Re-uploading the same family/weight/style replaces the file. Delete first
    // so the row id (and therefore the font URL) changes — a new id defeats the
    // immutable browser cache and visitors get the new file immediately.
    await prisma.customFont.deleteMany({
      where: { tenantId: TENANT_ID, family: family.family, weight: weight.weight, style },
    });
    const font = await prisma.customFont.create({
      data: {
        tenantId: TENANT_ID,
        family: family.family,
        weight: weight.weight,
        style,
        mono,
        mimeType: validated.mimeType,
        size: bytes.length,
        filename: file.name || null,
        bytes,
        createdBy: user.id,
      },
      select: { id: true },
    });
    await logAudit({
      action: "CUSTOM_FONT_UPLOAD",
      entity: "CustomFont",
      entityId: font.id,
      actorId: user.id,
      meta: { family: family.family, weight: weight.weight, style, mimeType: validated.mimeType },
    });
    return NextResponse.json({ ok: true, id: font.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save font." },
      { status: 500 },
    );
  }
}
