import { NextResponse } from "next/server";
import { canAccessAnySectionForUser, getApiUser } from "@/modules/auth";
import { getCrmHealth } from "@/modules/crm/health";
import { reportCrmIssue } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secretAuthorized(request: Request): boolean {
  const secrets = [process.env.CRM_HEALTH_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => Boolean(value),
  );
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return secrets.some(
    (secret) => bearer === secret || request.headers.get("x-crm-health-secret") === secret,
  );
}

export async function GET(request: Request) {
  const user = await getApiUser();
  const adminAuthorized = user ? await canAccessAnySectionForUser(user, ["crm"]) : false;
  if (!adminAuthorized && !secretAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const health = await getCrmHealth();
    return NextResponse.json(health, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    reportCrmIssue("error", "crm.health", error);
    return NextResponse.json(
      { status: "degraded", error: error instanceof Error ? error.message : "Health check failed." },
      { status: 503 },
    );
  }
}
