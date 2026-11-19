import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { getCrmStages } from "./stages";
import { getCrmSettings } from "./settings";
import { getCrmTimeline, type CrmActivityItem } from "./activity";
import {
  emptyEmailEngagementSummary,
  isEmailEventType,
  summarizeEmailEvents,
  type EmailEventRecord,
} from "./email-tracking";
import {
  clientAccessWhere,
  dealAccessWhere,
  leadAccessWhere,
  taskAccessWhere,
  type CrmAccess,
} from "./access";

export type CrmUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

export type CrmTask = {
  id: string;
  text: string;
  priority: string;
  dueAt: Date | null;
  finishedAt: Date | null;
  status: string;
  assigneeId: string | null;
};

export type CrmDealCard = {
  id: string;
  title: string;
  stageId: string;
  stageLabel: string;
  stageIsWon: boolean;
  stageIsLost: boolean;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date | null;
  ownerName: string | null;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  source: string | null;
  lastActivityAt: Date | null;
  stageChangedAt: Date;
  createdAt: Date;
  nextTask: CrmTask | null;
  activityCount: number;
  leadId: string | null;
  clientId: string | null;
};

export type CrmPipelineStage = {
  id: string;
  key: string;
  label: string;
  order: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  deals: CrmDealCard[];
  totalCount: number;
  truncated: boolean;
  totalValue: number;
  weightedValue: number;
};

function userName(user: CrmUser | undefined): string | null {
  if (!user) return null;
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

export async function getCrmUsers(): Promise<CrmUser[]> {
  return prisma.user.findMany({
    where: { tenantId: TENANT_ID, active: true },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export async function getCrmStagesWithCounts(access?: CrmAccess) {
  const stages = await getCrmStages();
  const counts = await prisma.deal.groupBy({
    by: ["stageId"],
    where: { tenantId: TENANT_ID, ...dealAccessWhere(access) },
    _count: { _all: true },
    _sum: { value: true },
  });
  const byStage = new Map(counts.map((row) => [row.stageId, row]));
  return stages.map((stage) => ({
    ...stage,
    dealCount: byStage.get(stage.id)?._count._all ?? 0,
    totalValue: Number(byStage.get(stage.id)?._sum.value ?? 0),
  }));
}

export async function getCrmPipeline(
  access?: CrmAccess,
  options: { perStageLimit?: number } = {},
): Promise<{
  stages: CrmPipelineStage[];
  settings: Awaited<ReturnType<typeof getCrmSettings>>;
}> {
  const perStageLimit = Math.max(1, Math.min(500, options.perStageLimit ?? 100));
  const [stages, users, settings] = await Promise.all([
    getCrmStages(),
    getCrmUsers(),
    getCrmSettings(),
  ]);
  const userById = new Map(users.map((user) => [user.id, user]));
  const stageDeals = await Promise.all(
    stages.map((stage) =>
      prisma.deal.findMany({
        where: { tenantId: TENANT_ID, stageId: stage.id, ...dealAccessWhere(access) },
        include: {
          stage: true,
          tasks: {
            where: { finishedAt: null },
            orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
            take: 1,
          },
          _count: { select: { activities: true } },
        },
        orderBy: [{ value: "desc" }, { createdAt: "desc" }],
        take: perStageLimit + 1,
      }),
    ),
  );
  const counts = await prisma.deal.groupBy({
    by: ["stageId"],
    where: {
      tenantId: TENANT_ID,
      stageId: { in: stages.map((stage) => stage.id) },
      ...dealAccessWhere(access),
    },
    _count: { _all: true },
    _sum: { value: true },
  });
  const countByStage = new Map(counts.map((row) => [row.stageId, row]));
  const deals = stageDeals.flatMap((rows) => rows.slice(0, perStageLimit));

  const cards = deals.map((deal) => {
    const probability = deal.probability ?? deal.stage.probability;
    return {
      id: deal.id,
      title: deal.title,
      stageId: deal.stageId,
      stageLabel: deal.stage.label,
      stageIsWon: deal.stage.isWon,
      stageIsLost: deal.stage.isLost,
      value: Number(deal.value),
      currency: deal.currency,
      probability,
      expectedCloseDate: deal.expectedCloseDate,
      ownerName: deal.ownerId ? userName(userById.get(deal.ownerId)) : null,
      companyName: deal.companyName,
      contactName: deal.contactName,
      contactEmail: deal.contactEmail,
      contactPhone: deal.contactPhone,
      source: deal.source,
      lastActivityAt: deal.lastActivityAt,
      stageChangedAt: deal.stageChangedAt,
      createdAt: deal.createdAt,
      nextTask: deal.tasks[0] ?? null,
      activityCount: deal._count.activities,
      leadId: deal.leadId,
      clientId: deal.clientId,
    } satisfies CrmDealCard;
  });

  const byStage = new Map<string, CrmDealCard[]>();
  for (const card of cards) {
    const list = byStage.get(card.stageId) ?? [];
    list.push(card);
    byStage.set(card.stageId, list);
  }

  return {
    settings,
    stages: stages.map((stage) => {
      const stageCards = byStage.get(stage.id) ?? [];
      const totalCount = countByStage.get(stage.id)?._count._all ?? stageCards.length;
      return {
        id: stage.id,
        key: stage.key,
        label: stage.label,
        order: stage.order,
        probability: stage.probability,
        isWon: stage.isWon,
        isLost: stage.isLost,
        deals: stageCards,
        totalCount,
        truncated: totalCount > stageCards.length,
        totalValue: Number(countByStage.get(stage.id)?._sum.value ?? 0),
        weightedValue: stageCards.reduce(
          (sum, deal) => sum + deal.value * (deal.probability / 100),
          0,
        ),
      };
    }),
  };
}

export async function getCrmDeals(input: {
  search?: string;
  stageId?: string;
  ownerId?: string;
  page?: number;
  pageSize?: number;
  access?: CrmAccess;
}): Promise<{ items: CrmDealCard[]; total: number; totalPages: number }> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
  const search = input.search?.trim();
  const where: Prisma.DealWhereInput = {
    tenantId: TENANT_ID,
    ...dealAccessWhere(input.access),
    ...(input.stageId ? { stageId: input.stageId } : {}),
    ...(input.ownerId ? { ownerId: input.ownerId } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
            { contactName: { contains: search, mode: "insensitive" } },
            { contactEmail: { contains: search, mode: "insensitive" } },
            { contactPhone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, deals, users] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
      include: {
        stage: true,
        tasks: {
          where: { finishedAt: null },
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
        _count: { select: { activities: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    getCrmUsers(),
  ]);
  const userById = new Map(users.map((user) => [user.id, user]));
  const items = deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    stageId: deal.stageId,
    stageLabel: deal.stage.label,
    stageIsWon: deal.stage.isWon,
    stageIsLost: deal.stage.isLost,
    value: Number(deal.value),
    currency: deal.currency,
    probability: deal.probability ?? deal.stage.probability,
    expectedCloseDate: deal.expectedCloseDate,
    ownerName: deal.ownerId ? userName(userById.get(deal.ownerId)) : null,
    companyName: deal.companyName,
    contactName: deal.contactName,
    contactEmail: deal.contactEmail,
    contactPhone: deal.contactPhone,
    source: deal.source,
    lastActivityAt: deal.lastActivityAt,
    stageChangedAt: deal.stageChangedAt,
    createdAt: deal.createdAt,
    nextTask: deal.tasks[0] ?? null,
    activityCount: deal._count.activities,
    leadId: deal.leadId,
    clientId: deal.clientId,
  })) satisfies CrmDealCard[];
  return { items, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCrmDeal(dealId: string, access?: CrmAccess) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID, ...dealAccessWhere(access) },
    include: {
      stage: true,
      lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
      tasks: { orderBy: [{ finishedAt: "asc" }, { dueAt: "asc" }, { createdAt: "asc" }] },
      lineItems: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { product: true } },
      attachments: { orderBy: { createdAt: "desc" } },
      _count: { select: { activities: true } },
    },
  });
  if (!deal) return null;
  const users = await getCrmUsers();
  const messages = await prisma.crmEmailMessage.findMany({
    where: { tenantId: TENANT_ID, dealId },
    select: {
      id: true,
      toEmail: true,
      subject: true,
      status: true,
      providerMessageId: true,
      sentAt: true,
      deliveredAt: true,
      openCount: true,
      firstOpenedAt: true,
      lastOpenedAt: true,
      clickCount: true,
      firstClickedAt: true,
      lastClickedAt: true,
      bouncedAt: true,
      bounceType: true,
      bounceReason: true,
      unsubscribedAt: true,
      failedAt: true,
      failureCode: true,
      trackingEnabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const eventRows = messages.length
    ? await prisma.crmEmailEvent.findMany({
        where: { tenantId: TENANT_ID, messageId: { in: messages.map((message) => message.id) } },
        select: {
          messageId: true,
          type: true,
          occurredAt: true,
          url: true,
          recipient: true,
          providerEventId: true,
          metadata: true,
        },
        orderBy: { occurredAt: "desc" },
        take: 5000,
      })
    : [];
  const eventDetails = eventRows.flatMap((row) => {
    if (!isEmailEventType(row.type)) return [];
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const event: EmailEventRecord & { messageId: string } = {
      messageId: row.messageId,
      type: row.type,
      occurredAt: row.occurredAt,
      url: row.url,
      recipient: row.recipient,
      providerEventId: row.providerEventId,
      bounceType: typeof metadata.bounceType === "string" ? metadata.bounceType : null,
      bounceReason: typeof metadata.bounceReason === "string" ? metadata.bounceReason : null,
      failureCode: typeof metadata.failureCode === "string" ? metadata.failureCode : null,
    };
    return [event];
  });
  const summarized = summarizeEmailEvents(eventDetails, emptyEmailEngagementSummary());
  const emailEngagement = {
    ...summarized,
    sentAt: summarized.sentAt ?? messages.find((message) => message.sentAt)?.sentAt ?? null,
    status: summarized.status ?? messages[0]?.status ?? null,
    openCount: summarized.openCount || messages.reduce((total, message) => total + message.openCount, 0),
    clickCount: summarized.clickCount || messages.reduce((total, message) => total + message.clickCount, 0),
    firstOpenedAt:
      summarized.firstOpenedAt ??
      messages.find((message) => message.firstOpenedAt)?.firstOpenedAt ??
      null,
    lastOpenedAt:
      summarized.lastOpenedAt ??
      [...messages].reverse().find((message) => message.lastOpenedAt)?.lastOpenedAt ??
      null,
    firstClickedAt:
      summarized.firstClickedAt ??
      messages.find((message) => message.firstClickedAt)?.firstClickedAt ??
      null,
    lastClickedAt:
      summarized.lastClickedAt ??
      [...messages].reverse().find((message) => message.lastClickedAt)?.lastClickedAt ??
      null,
    deliveredAt: summarized.deliveredAt ?? messages.find((message) => message.deliveredAt)?.deliveredAt ?? null,
    bouncedAt: summarized.bouncedAt ?? messages.find((message) => message.bouncedAt)?.bouncedAt ?? null,
    unsubscribedAt:
      summarized.unsubscribedAt ??
      messages.find((message) => message.unsubscribedAt)?.unsubscribedAt ??
      null,
    failedAt: summarized.failedAt ?? messages.find((message) => message.failedAt)?.failedAt ?? null,
  };
  const emailMessages = messages.map((message) => ({
    ...message,
    events: eventDetails
      .filter((event) => event.messageId === message.id)
      .slice(0, 10)
      .map((event) => ({
        type: event.type,
        occurredAt: event.occurredAt,
        url: event.url,
        recipient: event.recipient,
        providerEventId: event.providerEventId,
        bounceType: event.bounceType,
        bounceReason: event.bounceReason,
        failureCode: event.failureCode,
      })),
  }));
  return {
    ...deal,
    valueNumber: Number(deal.value),
    ownerName: deal.ownerId ? userName(users.find((user) => user.id === deal.ownerId)) : null,
    users,
    emailEngagement,
    emailMessages,
  };
}

export async function getDealsForLead(leadId: string, access?: CrmAccess) {
  return prisma.deal.findMany({
    where: { tenantId: TENANT_ID, leadId, ...dealAccessWhere(access) },
    include: { stage: true },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getDealsForClient(clientId: string, access?: CrmAccess) {
  return prisma.deal.findMany({
    where: { tenantId: TENANT_ID, clientId, ...dealAccessWhere(access) },
    include: { stage: true },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export type CrmDashboard = {
  settings: Awaited<ReturnType<typeof getCrmSettings>>;
  stages: Awaited<ReturnType<typeof getCrmStages>>;
  openDeals: number;
  pipelineValue: number;
  weightedForecast: number;
  wonThisMonth: number;
  lostThisMonth: number;
  wonValueThisMonth: number;
  winRate: number;
  averageWonDeal: number;
  staleDeals: CrmDealCard[];
  tasksDue: Array<CrmTask & { leadName: string | null; clientName: string | null; dealTitle: string | null }>;
  tasksUpcoming: Array<CrmTask & { leadName: string | null; clientName: string | null; dealTitle: string | null }>;
  recentActivities: CrmActivityItem[];
  leadCounts: Record<string, number>;
  newLeadsThisMonth: number;
  convertedThisMonth: number;
  averageLeadScore: number;
  dealsByStage: Array<{
    id: string;
    label: string;
    count: number;
    value: number;
    weightedValue: number;
    isWon: boolean;
    isLost: boolean;
  }>;
};

export async function getCrmDashboard(access?: CrmAccess): Promise<CrmDashboard> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
  const leadScope = leadAccessWhere(access);
  const [settings, stages, deals, users, tasks, recentActivities, leadGroups, newLeadsThisMonth, convertedThisMonth, scoreAgg] =
    await Promise.all([
      getCrmSettings(),
      getCrmStages(),
      prisma.deal.findMany({
        where: { tenantId: TENANT_ID, ...dealAccessWhere(access) },
        include: {
          stage: true,
          tasks: {
            where: { finishedAt: null },
            orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
            take: 1,
          },
          _count: { select: { activities: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      getCrmUsers(),
      prisma.toDo.findMany({
        where: {
          finishedAt: null,
          dueAt: { not: null },
          AND: [
            {
              OR: [
                { lead: { tenantId: TENANT_ID } },
                { client: { tenantId: TENANT_ID } },
                { deal: { tenantId: TENANT_ID } },
              ],
            },
            ...(access ? [taskAccessWhere(access)] : []),
          ],
        },
        include: {
          lead: { select: { firstName: true, lastName: true, email: true } },
          client: { select: { firstName: true, lastName: true, email: true } },
          deal: { select: { title: true } },
        },
        orderBy: [{ dueAt: "asc" }],
        take: 100,
      }),
      getCrmTimeline({ pageSize: 8, access }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { tenantId: TENANT_ID, ...leadScope },
        _count: { _all: true },
      }),
      prisma.lead.count({
        where: { tenantId: TENANT_ID, ...leadScope, createdAt: { gte: monthStart } },
      }),
      prisma.lead.count({
        where: {
          tenantId: TENANT_ID,
          ...leadScope,
          disposition: "CONVERTED",
          statusDate: { gte: monthStart },
        },
      }),
      prisma.lead.aggregate({
        where: { tenantId: TENANT_ID, ...leadScope },
        _avg: { score: true },
      }),
    ]);

  const userById = new Map(users.map((user) => [user.id, user]));
  const cards = deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    stageId: deal.stageId,
    stageLabel: deal.stage.label,
    stageIsWon: deal.stage.isWon,
    stageIsLost: deal.stage.isLost,
    value: Number(deal.value),
    currency: deal.currency,
    probability: deal.probability ?? deal.stage.probability,
    expectedCloseDate: deal.expectedCloseDate,
    ownerName: deal.ownerId ? userName(userById.get(deal.ownerId)) : null,
    companyName: deal.companyName,
    contactName: deal.contactName,
    contactEmail: deal.contactEmail,
    contactPhone: deal.contactPhone,
    source: deal.source,
    lastActivityAt: deal.lastActivityAt,
    stageChangedAt: deal.stageChangedAt,
    createdAt: deal.createdAt,
    nextTask: deal.tasks[0] ?? null,
    activityCount: deal._count.activities,
    leadId: deal.leadId,
    clientId: deal.clientId,
  })) satisfies CrmDealCard[];

  const openCards = cards.filter((card) => {
    const stage = stages.find((row) => row.id === deals.find((deal) => deal.id === card.id)?.stageId);
    return stage ? !stage.isWon && !stage.isLost : false;
  });
  const wonThisMonthCards = cards.filter((card) => {
    const deal = deals.find((row) => row.id === card.id);
    return deal?.stage.isWon && deal.wonAt && deal.wonAt >= monthStart;
  });
  const lostThisMonthCards = cards.filter((card) => {
    const deal = deals.find((row) => row.id === card.id);
    return deal?.stage.isLost && deal.closedAt && deal.closedAt >= monthStart;
  });
  const staleBefore = new Date(now.getTime() - settings.staleDealDays * 86_400_000);
  const staleDeals = openCards.filter(
    (card) => (card.lastActivityAt ?? card.stageChangedAt ?? card.createdAt) < staleBefore,
  );
  const pipelineValue = openCards.reduce((sum, card) => sum + card.value, 0);
  const weightedForecast = openCards.reduce(
    (sum, card) => sum + card.value * (card.probability / 100),
    0,
  );
  const wonValueThisMonth = wonThisMonthCards.reduce((sum, card) => sum + card.value, 0);
  const decided = wonThisMonthCards.length + lostThisMonthCards.length;

  const taskRows = tasks.map((task) => ({
    id: task.id,
    text: task.text,
    priority: task.priority,
    dueAt: task.dueAt,
    finishedAt: task.finishedAt,
    status: task.status,
    assigneeId: task.assigneeId,
    leadName: task.lead
      ? `${task.lead.firstName ?? ""} ${task.lead.lastName ?? ""}`.trim() || task.lead.email
      : null,
    clientName: task.client
      ? `${task.client.firstName ?? ""} ${task.client.lastName ?? ""}`.trim() || task.client.email
      : null,
    dealTitle: task.deal?.title ?? null,
  }));
  const tasksDue = taskRows.filter((task) => task.dueAt && task.dueAt <= now);
  const tasksUpcoming = taskRows.filter(
    (task) => task.dueAt && task.dueAt > now && task.dueAt <= weekEnd,
  );

  const dealsByStage = stages.map((stage) => {
    const stageCards = cards.filter((card) => {
      const deal = deals.find((row) => row.id === card.id);
      return deal?.stageId === stage.id;
    });
    return {
      id: stage.id,
      label: stage.label,
      count: stageCards.length,
      value: stageCards.reduce((sum, card) => sum + card.value, 0),
      weightedValue: stageCards.reduce(
        (sum, card) => sum + card.value * (card.probability / 100),
        0,
      ),
      isWon: stage.isWon,
      isLost: stage.isLost,
    };
  });

  return {
    settings,
    stages,
    openDeals: openCards.length,
    pipelineValue,
    weightedForecast,
    wonThisMonth: wonThisMonthCards.length,
    lostThisMonth: lostThisMonthCards.length,
    wonValueThisMonth,
    winRate: decided > 0 ? (wonThisMonthCards.length / decided) * 100 : 0,
    averageWonDeal: wonThisMonthCards.length > 0 ? wonValueThisMonth / wonThisMonthCards.length : 0,
    staleDeals,
    tasksDue,
    tasksUpcoming,
    recentActivities: recentActivities.items,
    leadCounts: Object.fromEntries(leadGroups.map((row) => [row.status, row._count._all])),
    newLeadsThisMonth,
    convertedThisMonth,
    averageLeadScore: scoreAgg._avg.score ?? 0,
    dealsByStage,
  };
}

export async function getCrmLinkOptions(access?: CrmAccess) {
  const [leads, clients] = await Promise.all([
    prisma.lead.findMany({
      where: { tenantId: TENANT_ID, ...leadAccessWhere(access) },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.client.findMany({
      where: { tenantId: TENANT_ID, ...clientAccessWhere(access) },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return { leads, clients };
}

export async function getCrmProducts(includeInactive = false) {
  return prisma.crmProduct.findMany({
    where: { tenantId: TENANT_ID, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getCrmUnreadNotifications(userId: string) {
  return prisma.crmNotification.findMany({
    where: { tenantId: TENANT_ID, userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export type CrmReportRow = {
  key: string;
  label: string;
  count: number;
  value: number;
  wonCount: number;
  wonValue: number;
};

export async function getCrmReports(access?: CrmAccess) {
  const [stages, users, all, won] = await Promise.all([
    getCrmStagesWithCounts(access),
    getCrmUsers(),
    prisma.deal.groupBy({
      by: ["source"],
      where: { tenantId: TENANT_ID, ...dealAccessWhere(access) },
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.deal.findMany({
      where: {
        tenantId: TENANT_ID,
        ...dealAccessWhere(access),
        stage: { isWon: true },
      },
      select: { source: true, ownerId: true, value: true },
    }),
  ]);
  const userById = new Map(users.map((user) => [user.id, user]));
  const ownerGroups = await prisma.deal.groupBy({
    by: ["ownerId"],
    where: { tenantId: TENANT_ID, ...dealAccessWhere(access) },
    _count: { _all: true },
    _sum: { value: true },
  });

  const wonBySource = new Map<string, { count: number; value: number }>();
  const wonByOwner = new Map<string, { count: number; value: number }>();
  for (const deal of won) {
    const source = deal.source ?? "—";
    const sourceRow = wonBySource.get(source) ?? { count: 0, value: 0 };
    sourceRow.count += 1;
    sourceRow.value += Number(deal.value);
    wonBySource.set(source, sourceRow);
    const owner = deal.ownerId ?? "—";
    const ownerRow = wonByOwner.get(owner) ?? { count: 0, value: 0 };
    ownerRow.count += 1;
    ownerRow.value += Number(deal.value);
    wonByOwner.set(owner, ownerRow);
  }

  const sources: CrmReportRow[] = all
    .map((row) => {
      const source = row.source ?? "—";
      const wonRow = wonBySource.get(source);
      return {
        key: source,
        label: source,
        count: row._count._all,
        value: Number(row._sum.value ?? 0),
        wonCount: wonRow?.count ?? 0,
        wonValue: wonRow?.value ?? 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  const owners: CrmReportRow[] = ownerGroups
    .map((row) => {
      const ownerId = row.ownerId ?? "—";
      const wonRow = wonByOwner.get(ownerId);
      const user = row.ownerId ? userById.get(row.ownerId) : undefined;
      return {
        key: ownerId,
        label: user
          ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
          : "Unassigned",
        count: row._count._all,
        value: Number(row._sum.value ?? 0),
        wonCount: wonRow?.count ?? 0,
        wonValue: wonRow?.value ?? 0,
      };
    })
    .sort((a, b) => b.wonValue - a.wonValue);

  return {
    stages: stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      count: stage.dealCount,
      value: stage.totalValue,
      probability: stage.probability,
      isWon: stage.isWon,
      isLost: stage.isLost,
    })),
    sources,
    owners,
    totalDeals: sources.reduce((sum, row) => sum + row.count, 0),
    totalValue: sources.reduce((sum, row) => sum + row.value, 0),
    wonValue: sources.reduce((sum, row) => sum + row.wonValue, 0),
  };
}
