import { NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { canAccessSection, getApiUser } from "@/lib/admin-auth";
import { TENANT_ID } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authed(): Promise<boolean> {
  const user = await getApiUser();
  return user !== null && (canAccessSection(user, "pages") || canAccessSection(user, "templates"));
}

export async function GET() {
  if (!(await authed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const snippets = await prisma.snippet.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, block: true, updatedAt: true },
    take: 50,
  });
  return NextResponse.json({ snippets });
}

export async function POST(request: Request) {
  if (!(await authed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    block?: unknown;
  } | null;
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!body?.block || typeof body.block !== "object") {
    return NextResponse.json({ error: "A block is required." }, { status: 400 });
  }

  const snippet = await prisma.snippet.create({
    data: { tenantId: TENANT_ID, name, block: body.block },
    select: { id: true, name: true, block: true },
  });
  return NextResponse.json({ snippet });
}