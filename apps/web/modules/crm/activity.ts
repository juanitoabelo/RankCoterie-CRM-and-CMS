import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import type { CrmActivityType } from "./constants";
import { activityAccessWhere, type CrmAccess } from "./access";

export type CrmActivityItem = {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  occurredAt: Date;
  userId: string | null;
  leadId: string | null;
  clientId: string | null;
  dealId: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  userName: string | null;
  leadName: string | null;
  clientName: string | null;
  dealTitle: string | null;
};

export type StageChangeActivity = {
  id: string;
  dealId: string | null;
  occurredAt: Date;
  metadata: Prisma.JsonValue;
};

function displayName(
  user: { firstName: string | null; lastName: string | null; email: string } | null,
): string | null {
  if (!user) return null;
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

function personName(
  person: { firstName: string | null; lastName: string | null; email: string | null } | null,
): string | null {
  if (!person) return null;
  return (
    `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.email || "Unnamed"
  );
}

export async function logCrmActivity(input: {
  type: CrmActivityType;
  subject?: string | null;
  body?: string | null;
  userId?: string | null;
  leadId?: string | null;
  clientId?: string | null;
  dealId?: string | null;
  occurredAt?: Date;
  metadata?: Prisma.InputJsonValue;
  externalId?: string | null;
  source?: string | null;
  client?: Prisma.TransactionClient;
}): Promise<{ id: string }> {
  const occurredAt = input.occurredAt ?? new Date();
  const db = input.client ?? prisma;
  const activity = await db.crmActivity.create({
    data: {
      tenantId: TENANT_ID,
      type: input.type,
      subject: input.subject?.trim() || null,
      body: input.body?.trim() || null,
      occurredAt,
      userId: input.userId ?? null,
      leadId: input.leadId ?? null,
      clientId: input.clientId ?? null,
      dealId: input.dealId ?? null,
      metadata: input.metadata ?? {},
      externalId: input.externalId?.trim() || null,
      source: input.source?.trim() || null,
    },
  });
  if (input.dealId) {
    await db.deal.update({
      where: { id: input.dealId },
      data: { lastActivityAt: occurredAt },
    });
  }
  return { id: activity.id };
}

export async function getStageChangeActivities(
  access?: CrmAccess,
): Promise<StageChangeActivity[]> {
  return prisma.crmActivity.findMany({
    where: {
      tenantId: TENANT_ID,
      type: "STAGE_CHANGE",
      AND: [activityAccessWhere(access)],
    },
    select: { id: true, dealId: true, occurredAt: true, metadata: true },
    orderBy: { occurredAt: "asc" },
  });
}

export async function getCrmTimeline(input: {
  leadId?: string;
  clientId?: string;
  dealId?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  access?: CrmAccess;
}): Promise<{ items: CrmActivityItem[]; total: number; totalPages: number }> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
  const where: Prisma.CrmActivityWhereInput = {
    tenantId: TENANT_ID,
    AND: [activityAccessWhere(input.access)],
    ...(input.leadId ? { leadId: input.leadId } : {}),
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.dealId ? { dealId: input.dealId } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(input.search
      ? {
          OR: [
            { subject: { contains: input.search, mode: "insensitive" } },
            { body: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, activities] = await Promise.all([
    prisma.crmActivity.count({ where }),
    prisma.crmActivity.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        deal: { select: { id: true, title: true } },
      },
    }),
  ]);

  const userIds = [...new Set(activities.map((a) => a.userId).filter(Boolean))] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds }, tenantId: TENANT_ID },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, displayName(u)]));

  const items = activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    subject: activity.subject,
    body: activity.body,
    occurredAt: activity.occurredAt,
    userId: activity.userId,
    leadId: activity.leadId,
    clientId: activity.clientId,
    dealId: activity.dealId,
    metadata: activity.metadata,
    createdAt: activity.createdAt,
    userName: activity.userId ? userById.get(activity.userId) ?? null : null,
    leadName: personName(activity.lead),
    clientName: personName(activity.client),
    dealTitle: activity.deal?.title ?? null,
  }));

  return { items, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
