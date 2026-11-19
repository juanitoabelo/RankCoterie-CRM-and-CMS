import { rateLimit } from "@/lib/rate-limit";
import {
  hashClientIp,
  recordEmailOpen,
  requestClientIp,
} from "@/modules/crm/email-tracking";
import { prisma, TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

const NO_STORE = "no-store, no-cache, must-revalidate, private";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ip = requestClientIp(request);
  const limited = rateLimit(`crm-email-open:${token}:${hashClientIp(ip) ?? "anon"}`, 120, 60_000);
  const headers = {
    "Content-Type": "image/gif",
    "Cache-Control": NO_STORE,
    "Content-Length": String(PIXEL.length),
  };
  if (!limited.ok) {
    return new Response(PIXEL, {
      headers: { ...headers, "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  const message = await prisma.crmEmailMessage.findFirst({
    where: { tenantId: TENANT_ID, trackingToken: token, trackingEnabled: true },
    select: { id: true, toEmail: true },
  });
  if (message) {
    await recordEmailOpen({
      messageId: message.id,
      recipient: message.toEmail,
      ipHash: hashClientIp(ip),
      userAgent: request.headers.get("user-agent"),
    }).catch(() => null);
  }

  return new Response(PIXEL, { headers });
}
