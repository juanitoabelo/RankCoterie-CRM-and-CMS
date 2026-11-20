import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { applyLeadAutomation } from "@/modules/crm/automation";
import {
  leadDedupeWhere,
  mergeCapturedLeadData,
  normalizeLeadCapture,
  type LeadCaptureInput,
} from "./capture-helpers";

export type CaptureLeadResult = {
  lead: { id: string };
  created: boolean;
  deduped: boolean;
  assignedToId: string | null;
  score: number | null;
};

function intakeFor(input: ReturnType<typeof normalizeLeadCapture>): Record<string, Prisma.InputJsonValue> {
  return {
    source: input.source,
    ...(input.company ? { company: input.company } : {}),
    ...(input.subject ? { subject: input.subject } : {}),
    ...(input.message ? { lastMessage: input.message } : {}),
    ...(input.formId ? { customFormId: input.formId } : {}),
    ...(input.submissionId ? { submissionId: input.submissionId } : {}),
    ...(input.listingId ? { landingPageId: input.listingId } : {}),
    dedupeEmails: input.email ? [input.email] : [],
    dedupePhones: input.phoneDigits ? [input.phoneDigits] : [],
    ...input.intakeExtras,
  };
}

function mergeDedupeIntake(
  previous: Record<string, Prisma.JsonValue>,
  next: Record<string, Prisma.InputJsonValue>,
): Record<string, Prisma.InputJsonValue> {
  const merged = { ...previous } as Record<string, Prisma.InputJsonValue>;
  for (const key of ["dedupeEmails", "dedupePhones"] as const) {
    const values = [previous[key], next[key]].flatMap((value): string[] => {
      if (!Array.isArray(value)) return [];
      return value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry));
    });
    merged[key] = Array.from(new Set(values)).slice(0, 20);
  }
  return { ...merged, ...next, ...Object.fromEntries(
    ["dedupeEmails", "dedupePhones"].map((key) => [key, merged[key]]),
  ) };
}

export async function captureLead(input: LeadCaptureInput): Promise<CaptureLeadResult> {
  const normalized = normalizeLeadCapture({ ...input, tenantId: input.tenantId || TENANT_ID });
  const where = leadDedupeWhere(normalized);
  const existingIntake: Record<string, Prisma.JsonValue> = {};

  const result = await prisma.$transaction(async (tx) => {
    const existing = where
      ? await tx.lead.findFirst({
        where: where as Prisma.LeadWhereInput,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phones: true,
          intake: true,
        },
      })
      : null;

    const previousIntake = existing?.intake && typeof existing.intake === "object" && !Array.isArray(existing.intake)
      ? existing.intake as Record<string, Prisma.JsonValue>
      : existingIntake;
    const intake = mergeDedupeIntake(previousIntake, intakeFor(normalized)) as Prisma.InputJsonValue;

    const lead = existing
      ? await tx.lead.update({
        where: { id: existing.id },
        data: {
          ...mergeCapturedLeadData(existing, normalized),
          intake,
          ...(normalized.assignedToId ? { assignedToId: normalized.assignedToId } : {}),
        },
      })
      : await tx.lead.create({
        data: {
          tenantId: normalized.tenantId,
          firstName: normalized.firstName || null,
          lastName: normalized.lastName || null,
          email: normalized.email || null,
          phones: normalized.phone ? [{ number: normalized.phone, kind: "unknown" }] : [],
          status: "NEW",
          disposition: "NEW_INQUIRY",
          initialDisposition: "NEW_INQUIRY",
          statusDate: new Date(),
          assignedToId: normalized.assignedToId,
          intake,
        },
      });

    if (normalized.message) {
      await tx.leadNote.create({
        data: { leadId: lead.id, note: normalized.message.slice(0, 4000) },
      });
    }

    return { lead, created: !existing, deduped: Boolean(existing) };
  });

  const automation = await applyLeadAutomation(result.lead.id, {
    autoAssign: !normalized.assignedToId,
  });

  return {
    lead: { id: result.lead.id },
    created: result.created,
    deduped: result.deduped,
    assignedToId: automation.assignedToId,
    score: automation.score,
  };
}
