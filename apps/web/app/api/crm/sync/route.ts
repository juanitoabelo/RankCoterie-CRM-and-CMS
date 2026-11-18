import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logCrmActivity } from "@/modules/crm/activity";
import { CRM_ACTIVITY_TYPES, type CrmActivityType } from "@/modules/crm/constants";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncActivity = {
  externalId: string;
  type?: string;
  subject?: string;
  body?: string;
  occurredAt?: string;
  provider?: string;
  userId?: string;
  leadId?: string;
  clientId?: string;
  dealId?: string;
};

const TYPE_MAP: Record<string, CrmActivityType> = {
  email: "EMAIL",
  message: "EMAIL",
  call: "CALL",
  meeting: "MEETING",
  event: "MEETING",
  note: "NOTE",
  task: "TASK",
};

function activityType(input: SyncActivity): CrmActivityType {
  const direct = input.type?.toUpperCase();
  if (direct && (CRM_ACTIVITY_TYPES as readonly string[]).includes(direct)) {
    return direct as CrmActivityType;
  }
  return TYPE_MAP[input.type?.toLowerCase() ?? ""] ?? "NOTE";
}

function authorized(request: Request): boolean {
  const secrets = [process.env.CRM_SYNC_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => Boolean(value),
  );
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return secrets.some(
    (secret) => bearer === secret || request.headers.get("x-crm-sync-secret") === secret,
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let payload: { activities?: SyncActivity[]; provider?: string };
  try {
    payload = (await request.json()) as { activities?: SyncActivity[]; provider?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const activities = (payload.activities ?? []).slice(0, 200);
  if (activities.length === 0) {
    return NextResponse.json({ error: "No activities provided." }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  const errors: { externalId: string; error: string }[] = [];

  for (const input of activities) {
    const externalId = input.externalId?.trim();
    if (!externalId) {
      errors.push({ externalId: "", error: "externalId is required." });
      continue;
    }
    const existing = await prisma.crmActivity.findFirst({
      where: { tenantId: TENANT_ID, externalId },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const [lead, client, deal, user] = await Promise.all([
      input.leadId
        ? prisma.lead.findFirst({ where: { id: input.leadId, tenantId: TENANT_ID }, select: { id: true } })
        : null,
      input.clientId
        ? prisma.client.findFirst({ where: { id: input.clientId, tenantId: TENANT_ID }, select: { id: true } })
        : null,
      input.dealId
        ? prisma.deal.findFirst({ where: { id: input.dealId, tenantId: TENANT_ID }, select: { id: true } })
        : null,
      input.userId
        ? prisma.user.findFirst({ where: { id: input.userId, tenantId: TENANT_ID }, select: { id: true } })
        : null,
    ]);
    if (input.leadId && !lead) {
      errors.push({ externalId, error: "Lead not found." });
      continue;
    }
    if (input.clientId && !client) {
      errors.push({ externalId, error: "Client not found." });
      continue;
    }
    if (input.dealId && !deal) {
      errors.push({ externalId, error: "Deal not found." });
      continue;
    }
    if (input.userId && !user) {
      errors.push({ externalId, error: "User not found." });
      continue;
    }
    if (!lead && !client && !deal) {
      errors.push({ externalId, error: "Link the activity to a lead, client, or deal." });
      continue;
    }

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      errors.push({ externalId, error: "Invalid occurredAt date." });
      continue;
    }

    try {
      await logCrmActivity({
        type: activityType(input),
        subject: input.subject ?? null,
        body: input.body ?? null,
        occurredAt,
        userId: user?.id ?? null,
        leadId: lead?.id ?? null,
        clientId: client?.id ?? null,
        dealId: deal?.id ?? null,
        externalId,
        source: input.provider?.trim() || payload.provider?.trim() || "sync",
        metadata: { provider: input.provider ?? payload.provider ?? null, externalId },
      });
      imported += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skipped += 1;
      } else {
        errors.push({
          externalId,
          error: error instanceof Error ? error.message : "Import failed.",
        });
        reportCrmIssue("error", "crm.sync.import", error, { externalId });
      }
    }
  }

  await logAudit({
    action: "CRM_SYNC_IMPORT",
    entity: "CrmActivity",
    entityId: payload.provider ?? "sync",
    actorId: null,
    reason: `Imported ${imported} CRM activity item(s)`,
    meta: { imported, skipped, errors: errors.length, provider: payload.provider ?? null },
  }).catch(() => null);

  return NextResponse.json({ imported, skipped, errors });
}
