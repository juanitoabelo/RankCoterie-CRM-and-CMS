import { NextRequest, NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 10_000) {
    return NextResponse.json({ error: "Comment submission is too large." }, { status: 413 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const limit = rateLimit(`customPostComment:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: `Too many submissions. Try again in ${limit.retryAfterSeconds}s.` }, { status: 429 });
  }

  let payload: unknown;
  try {
    const rawPayload = await request.text();
    if (rawPayload.length > 10_000) {
      return NextResponse.json({ error: "Comment submission is too large." }, { status: 413 });
    }
    payload = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const bodyData = payload as Record<string, unknown>;
  const name = typeof bodyData.name === "string" ? bodyData.name.trim() : "";
  const email = typeof bodyData.email === "string" ? bodyData.email.trim() : "";
  const body = typeof bodyData.body === "string" ? bodyData.body.trim() : "";
  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Name is required and must be 100 characters or fewer." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!body || body.length > 5000) {
    return NextResponse.json({ error: "Comment is required and must be 5,000 characters or fewer." }, { status: 400 });
  }

  const { type, slug } = await params;
  const post = await prisma.customPost.findFirst({
    where: {
      tenantId: TENANT_ID,
      slug,
      status: "PUBLISHED",
      postType: { is: { tenantId: TENANT_ID, slug: type, isPublic: true, coreFields: { has: "comments" } } },
    },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  await prisma.customPostComment.create({
    data: { tenantId: TENANT_ID, postId: post.id, name, email, body },
  });
  return NextResponse.json({ message: "Comment submitted for moderation." }, { status: 201 });
}
