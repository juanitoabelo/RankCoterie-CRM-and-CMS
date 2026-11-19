import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  hashClientIp,
  recordEmailClick,
  requestClientIp,
  verifyClickTarget,
} from "@/modules/crm/email-tracking";
import { prisma, TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const url = new URL(request.url);
  const target = verifyClickTarget(
    url.searchParams.get("target"),
    url.searchParams.get("sig"),
    token,
  );
  if (!target) {
    return new Response("Invalid tracking link.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const ip = requestClientIp(request);
  const limited = rateLimit(`crm-email-click:${token}:${hashClientIp(ip) ?? "anon"}`, 180, 60_000);
  if (!limited.ok) {
    return new Response("Too many requests.", {
      status: 429,
      headers: { "Cache-Control": "no-store", "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  const message = await prisma.crmEmailMessage.findFirst({
    where: { tenantId: TENANT_ID, trackingToken: token, trackingEnabled: true },
    select: { id: true, toEmail: true },
  });
  if (message) {
    await recordEmailClick({
      messageId: message.id,
      recipient: message.toEmail,
      url: target,
      ipHash: hashClientIp(ip),
      userAgent: request.headers.get("user-agent"),
    }).catch(() => null);
  }

  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
