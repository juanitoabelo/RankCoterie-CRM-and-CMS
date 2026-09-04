import { NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { canAccessSection, getApiUser } from "@/lib/admin-auth";
import { TENANT_ID } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user || !["pages", "templates", "widgets", "geoImages", "myCompany"].some((section) => canAccessSection(user, section))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const asset = await prisma.asset.create({
    data: {
      tenantId: TENANT_ID,
      kind: "image",
      mimeType: file.type,
      size: file.size,
      filename: file.name,
      bytes,
    },
  });

  return NextResponse.json({ url: `/api/assets/${asset.id}` });
}