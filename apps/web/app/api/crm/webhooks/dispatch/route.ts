import { NextResponse } from "next/server";
import { dispatchPendingWebhooks } from "@/lib/webhooks/dispatch";
import { reportCrmIssue } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secrets = [process.env.CRM_WEBHOOK_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => Boolean(value),
  );
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return secrets.some(
    (secret) => bearer === secret || request.headers.get("x-crm-webhook-secret") === secret,
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const summary = await dispatchPendingWebhooks(50);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    await reportCrmIssue("error", "crm.webhooks.cron", error);
    return NextResponse.json({ error: "Webhook dispatch failed." }, { status: 500 });
  }
}
