import { rateLimit } from "@/lib/rate-limit";
import {
  hashClientIp,
  recordEmailUnsubscribe,
  requestClientIp,
} from "@/modules/crm/email-tracking";
import { prisma, TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = "no-store, no-cache, must-revalidate, private";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function page(title: string, body: string): Response {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title></head>` +
      `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#27272a">` +
      `<h1 style="font-size:1.25rem">${safeTitle}</h1><p style="color:#52525b">${safeBody}</p></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": NO_STORE } },
  );
}

async function handle(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const ip = requestClientIp(request);
  const limited = rateLimit(`crm-email-unsubscribe:${token}:${hashClientIp(ip) ?? "anon"}`, 20, 60_000);
  if (!limited.ok) {
    return new Response("Too many requests.", {
      status: 429,
      headers: { "Cache-Control": NO_STORE, "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  const message = await prisma.crmEmailMessage.findFirst({
    where: { tenantId: TENANT_ID, trackingToken: token },
    select: { id: true, toEmail: true },
  });
  if (!message) return page("Link unavailable", "This unsubscribe link is invalid.");

  await recordEmailUnsubscribe({
    messageId: message.id,
    recipient: message.toEmail,
  }).catch(() => null);

  return page(
    "You are unsubscribed",
    `${message.toEmail} will not receive further CRM email from this tenant. You can close this window.`,
  );
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return handle(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return handle(request, context);
}
