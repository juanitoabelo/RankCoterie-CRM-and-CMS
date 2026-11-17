import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { getCrmStages } from "./stages";
import { getCrmSettings } from "./settings";
import { getCrmTimeline, type CrmActivityItem } from "./activity";

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

export async function getCrmStagesWithCounts() {
  const stages = await getCrmStages();
  const counts = await prisma.deal.groupBy({
    by: ["stageId"],
    where: { tenantId: TENANT_ID },
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

export async function getCrmPipeline(): Promise<{
  stages: CrmPipelineStage[];
  settings: Awaited<ReturnType<typeof getCrmSettings>>;
}> {
  const [stages, users, settings] = await Promise.all([
    getCrmStages(),
    getCrmUsers(),
    getCrmSettings(),
  ]);
  const userById = new Map(users.map((user) => [user.id, user]));
  const deals = await prisma.deal.findMany({
    where: { tenantId: TENANT_ID, stageId: { in: stages.map((stage) => stage.id) } },
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
  });

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
    const deal = deals.find((row) => row.id === card.id);
    if (!deal) continue;
    const list = byStage.get(deal.stageId) ?? [];
    list.push(card);
    byStage.set(deal.stageId, list);
  }

  return {
    settings,
    stages: stages.map((stage) => {
      const stageDeals = byStage.get(stage.id) ?? [];
      const totalValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
      return {
        id: stage.id,
        key: stage.key,
        label: stage.label,
        order: stage.order,
        probability: stage.probability,
        isWon: stage.isWon,
        isLost: stage.isLost,
        deals: stageDeals,
        totalValue,
        weightedValue: stageDeals.reduce(
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
}): Promise<{ items: CrmDealCard[]; total: number; totalPages: number }> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
  const search = input.search?.trim();
  const where: Prisma.DealWhereInput = {
    tenantId: TENANT_ID,
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

export async function getCrmDeal(dealId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID },
    include: {
      stage: true,
      lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
      tasks: { orderBy: [{ finishedAt: "asc" }, { dueAt: "asc" }, { createdAt: "asc" }] },
      _count: { select: { activities: true } },
    },
  });
  if (!deal) return null;
  const users = await getCrmUsers();
  return {
    ...deal,
    valueNumber: Number(deal.value),
    ownerName: deal.ownerId ? userName(users.find((user) => user.id === deal.ownerId)) : null,
    users,
  };
}

export async function getDealsForLead(leadId: string) {
  return prisma.deal.findMany({
    where: { tenantId: TENANT_ID, leadId },
    include: { stage: true },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getDealsForClient(clientId: string) {
  return prisma.deal.findMany({
    where: { tenantId: TENANT_ID, clientId },
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

export async function getCrmDashboard(): Promise<CrmDashboard> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
  const [settings, stages, deals, users, tasks, recentActivities, leadGroups, newLeadsThisMonth, convertedThisMonth, scoreAgg] =
    await Promise.all([
      getCrmSettings(),
      getCrmStages(),
      prisma.deal.findMany({
        where: { tenantId: TENANT_ID },
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
          OR: [
            { lead: { tenantId: TENANT_ID } },
            { client: { tenantId: TENANT_ID } },
            { deal: { tenantId: TENANT_ID } },
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
      getCrmTimeline({ pageSize: 8 }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { tenantId: TENANT_ID },
        _count: { _all: true },
      }),
      prisma.lead.count({ where: { tenantId: TENANT_ID, createdAt: { gte: monthStart } } }),
      prisma.lead.count({
        where: { tenantId: TENANT_ID, disposition: "CONVERTED", statusDate: { gte: monthStart } },
      }),
      prisma.lead.aggregate({ where: { tenantId: TENANT_ID }, _avg: { score: true } }),
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

export async function getCrmLinkOptions() {
  const [leads, clients] = await Promise.all([
    prisma.lead.findMany({
      where: { tenantId: TENANT_ID },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.client.findMany({
      where: { tenantId: TENANT_ID },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return { leads, clients };
}
