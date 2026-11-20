import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getRecaptchaConfig, isRecaptchaActive, verifyRecaptchaToken } from "@/lib/recaptcha";
import { TENANT_ID } from "@/modules/shared";
import { captureLead } from "@/modules/leads/capture";
import { getLiveChatSettings } from "@/modules/live-chat/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limited = rateLimit(`liveChat:${ip}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many messages. Try again in ${limited.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  if (typeof raw.website === "string" && raw.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 200) : "";
  const email = typeof raw.email === "string" ? raw.email.trim().slice(0, 200) : "";
  const message = typeof raw.message === "string" ? raw.message.trim().slice(0, 4000) : "";
  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const settings = await getLiveChatSettings();
  if (!settings.enabled) {
    return NextResponse.json({ error: "Live chat is unavailable." }, { status: 404 });
  }

  const recaptchaConfig = await getRecaptchaConfig();
  if (isRecaptchaActive(recaptchaConfig)) {
    const token = typeof raw.recaptchaToken === "string" ? raw.recaptchaToken : "";
    const recaptcha = await verifyRecaptchaToken(token, ip, recaptchaConfig);
    if (!recaptcha.ok) {
      return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 403 });
    }
  }

  const result = await captureLead({
    tenantId: TENANT_ID,
    name,
    email,
    message,
    source: settings.leadSource,
  });
  return NextResponse.json({ ok: true, leadId: result.lead.id });
}
