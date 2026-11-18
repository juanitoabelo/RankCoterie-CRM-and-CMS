import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logCrmActivity } from "./activity";

export type MergeResult = {
  ok: boolean;
  error?: string;
  moved?: Record<string, number>;
};

function personName(person: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.email || "record";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mergeArrays(primary: unknown, secondary: unknown): Prisma.InputJsonValue {
  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const entry of [...asArray(primary), ...asArray(secondary)]) {
    const key = JSON.stringify(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged as Prisma.InputJsonValue;
}

export async function mergeLeads(
  sourceId: string,
  targetId: string,
  actorId: string,
): Promise<MergeResult> {
  if (sourceId === targetId) return { ok: false, error: "Choose two different leads." };
  const [source, target] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: sourceId, tenantId: TENANT_ID },
      include: { client: { select: { id: true } } },
    }),
    prisma.lead.findFirst({
      where: { id: targetId, tenantId: TENANT_ID },
      include: { client: { select: { id: true } } },
    }),
  ]);
  if (!source || !target) return { ok: false, error: "Lead not found." };

  const moved = await prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {};
    const updateMany = async (key: string, run: () => Promise<{ count: number }>) => {
      const result = await run();
      counts[key] = result.count;
    };
    await updateMany("notes", () => tx.leadNote.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }));
    await updateMany("tasks", () => tx.toDo.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }));
    await updateMany("deals", () => tx.deal.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }));
    await updateMany("activities", () => tx.crmActivity.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }));
    await updateMany("attachments", () => tx.crmAttachment.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }));
    await updateMany("formSubmissions", () => tx.customFormSubmission.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }));
    await updateMany("listingLeads", () => tx.listingLead.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }));

    if (source.client && !target.client) {
      await tx.client.update({ where: { id: source.client.id }, data: { leadId: targetId } });
      counts.clients = 1;
    }

    const mergedIntake = {
      ...asObject(source.intake),
      ...asObject(target.intake),
    } as Prisma.InputJsonValue;

    await tx.lead.update({
      where: { id: targetId },
      data: {
        firstName: target.firstName ?? source.firstName,
        lastName: target.lastName ?? source.lastName,
        email: target.email ?? source.email,
        phones: mergeArrays(target.phones, source.phones),
        addresses: mergeArrays(target.addresses, source.addresses),
        intake: mergedIntake,
        campaignId: target.campaignId ?? source.campaignId,
        productId: target.productId ?? source.productId,
        publisherId: target.publisherId ?? source.publisherId,
        subId: target.subId ?? source.subId,
        clickId: target.clickId ?? source.clickId,
        landingPageId: target.landingPageId ?? source.landingPageId,
      },
    });
    await tx.lead.delete({ where: { id: sourceId } });
    await logCrmActivity({
      type: "SYSTEM",
      subject: "Lead merged",
      body: `${personName(source)} merged into ${personName(target)}.`,
      userId: actorId,
      leadId: targetId,
      metadata: { sourceId, targetId, moved: counts },
      client: tx,
    });
    return counts;
  });

  return { ok: true, moved };
}

export async function mergeClients(
  sourceId: string,
  targetId: string,
  actorId: string,
): Promise<MergeResult> {
  if (sourceId === targetId) return { ok: false, error: "Choose two different clients." };
  const [source, target] = await Promise.all([
    prisma.client.findFirst({ where: { id: sourceId, tenantId: TENANT_ID } }),
    prisma.client.findFirst({ where: { id: targetId, tenantId: TENANT_ID } }),
  ]);
  if (!source || !target) return { ok: false, error: "Client not found." };

  const moved = await prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {};
    const updateMany = async (key: string, run: () => Promise<{ count: number }>) => {
      const result = await run();
      counts[key] = result.count;
    };
    await updateMany("invoices", () => tx.invoice.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }));
    await updateMany("notes", () => tx.clientNote.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }));
    await updateMany("deals", () => tx.deal.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }));
    await updateMany("activities", () => tx.crmActivity.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }));
    await updateMany("tasks", () => tx.toDo.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }));
    await updateMany("attachments", () => tx.crmAttachment.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }));

    if (source.leadId && !target.leadId) {
      await tx.client.update({ where: { id: targetId }, data: { leadId: source.leadId } });
      counts.leadLinks = 1;
    }

    await tx.client.update({
      where: { id: targetId },
      data: {
        firstName: target.firstName ?? source.firstName,
        lastName: target.lastName ?? source.lastName,
        email: target.email ?? source.email,
        phones: mergeArrays(target.phones, source.phones),
        addresses: mergeArrays(target.addresses, source.addresses),
        maskedCard: target.maskedCard ?? source.maskedCard,
        campaignId: target.campaignId ?? source.campaignId,
        productId: target.productId ?? source.productId,
        publisherId: target.publisherId ?? source.publisherId,
        subId: target.subId ?? source.subId,
        clickId: target.clickId ?? source.clickId,
        landingPageId: target.landingPageId ?? source.landingPageId,
      },
    });
    await tx.client.delete({ where: { id: sourceId } });
    await logCrmActivity({
      type: "SYSTEM",
      subject: "Client merged",
      body: `${personName(source)} merged into ${personName(target)}.`,
      userId: actorId,
      clientId: targetId,
      metadata: { sourceId, targetId, moved: counts },
      client: tx,
    });
    return counts;
  });

  return { ok: true, moved };
}
