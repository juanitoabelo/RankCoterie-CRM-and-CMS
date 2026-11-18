import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";
import { syncAllCrmEmailConnections } from "@/modules/crm/oauth-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secrets = [process.env.CRM_SYNC_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => Boolean(value),
  );
  if (secrets.length === 0) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return secrets.some(
    (secret) => bearer === secret || request.headers.get("x-crm-sync-secret") === secret,
  );
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  try {
    const results = await syncAllCrmEmailConnections({ force });
    const imported = results.reduce((sum, result) => sum + result.imported, 0);
    const failed = results.filter((result) => result.error).length;
    await logAudit({
      action: "CRM_EMAIL_SYNC",
      entity: "CrmEmailConnection",
      entityId: "oauth-sync",
      actorId: null,
      reason: `Synced ${results.length} mailbox(es), imported ${imported} activity item(s)`,
      meta: { connections: results.length, imported, failed },
    }).catch(() => null);
    return NextResponse.json({ connections: results.length, imported, failed, results });
  } catch (error) {
    reportCrmIssue("error", "crm.oauth.sync.route", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mail sync failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
