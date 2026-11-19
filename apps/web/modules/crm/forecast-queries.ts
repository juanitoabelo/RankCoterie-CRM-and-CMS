import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { getStageChangeActivities } from "./activity";
import { dealAccessWhere, type CrmAccess } from "./access";
import {
  buildAttribution,
  buildForecast,
  buildHistoricalTrend,
  buildLifecycleFunnel,
  buildStageFunnel,
  buildStageTransitions,
  buildWinRate,
  type ForecastDeal,
} from "./forecasting";
import { getCrmUsers } from "./queries";
import { getCrmSettings } from "./settings";

function readRawLeadSource(intake: Prisma.JsonValue | null): string | null {
  if (!intake || typeof intake !== "object" || Array.isArray(intake)) return null;
  const values = intake as Record<string, unknown>;
  for (const key of ["rawLeadSource", "leadSource", "source", "utm_source"]) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function getCrmForecastData(
  access?: CrmAccess,
  options: { months?: number } = {},
) {
  const [deals, users, settings, stages, activities] = await Promise.all([
    prisma.deal.findMany({
      where: { tenantId: TENANT_ID, ...dealAccessWhere(access) },
      select: {
        id: true,
        title: true,
        value: true,
        probability: true,
        expectedCloseDate: true,
        wonAt: true,
        createdAt: true,
        closedAt: true,
        source: true,
        leadId: true,
        clientId: true,
        ownerId: true,
        stage: {
          select: {
            id: true,
            key: true,
            label: true,
            order: true,
            probability: true,
            isWon: true,
            isLost: true,
          },
        },
        lead: {
          select: {
            campaignId: true,
            publisherId: true,
            subId: true,
            clickId: true,
            landingPageId: true,
            intake: true,
          },
        },
        client: {
          select: {
            campaignId: true,
            publisherId: true,
            subId: true,
            clickId: true,
            landingPageId: true,
          },
        },
      },
      orderBy: { expectedCloseDate: "asc" },
    }),
    getCrmUsers(),
    getCrmSettings(),
    prisma.crmStage.findMany({
      where: { tenantId: TENANT_ID, active: true },
      select: { id: true, key: true, label: true, order: true, isWon: true, isLost: true },
      orderBy: { order: "asc" },
    }),
    getStageChangeActivities(access),
  ]);

  const userById = new Map(users.map((user) => [user.id, user]));
  const attributionSource = (deal: (typeof deals)[number]) => deal.lead ?? deal.client;
  const forecastDeals: ForecastDeal[] = deals.map((deal) => {
    const owner = deal.ownerId ? userById.get(deal.ownerId) : undefined;
    const source = attributionSource(deal);
    return {
      id: deal.id,
      title: deal.title,
      value: Number(deal.value),
      probability: deal.probability,
      stageProbability: deal.stage.probability,
      isWon: deal.stage.isWon,
      isLost: deal.stage.isLost,
      expectedCloseDate: deal.expectedCloseDate,
      wonAt: deal.wonAt,
      createdAt: deal.createdAt,
      closedAt: deal.closedAt,
      source: deal.source,
      campaignId: source?.campaignId ?? null,
      publisherId: source?.publisherId ?? null,
      subId: source?.subId ?? null,
      clickId: source?.clickId ?? null,
      landingPageId: source?.landingPageId ?? null,
      rawLeadSource: readRawLeadSource(deal.lead?.intake ?? null),
      ownerId: deal.ownerId,
      ownerLabel: owner
        ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email
        : null,
      stageId: deal.stage.id,
      stageKey: deal.stage.key,
      leadId: deal.leadId,
      clientId: deal.clientId,
    };
  });

  const stageLabelById = new Map(stages.map((stage) => [stage.id, stage.label]));
  const stageTransitions = buildStageTransitions(activities).map((transition) => ({
    ...transition,
    fromLabel: stageLabelById.get(transition.from) ?? transition.from,
    toLabel: stageLabelById.get(transition.to) ?? transition.to,
  }));

  return {
    currency: settings.defaultCurrency,
    forecast: buildForecast(forecastDeals, { months: options.months ?? 6 }),
    attribution: buildAttribution(forecastDeals),
    winRate: buildWinRate(forecastDeals),
    trend: buildHistoricalTrend(forecastDeals, { months: 12 }),
    stageFunnel: buildStageFunnel(
      forecastDeals,
      stages.map((stage) => ({
        id: stage.id,
        key: stage.key,
        label: stage.label,
        order: stage.order,
        isWon: stage.isWon,
        isLost: stage.isLost,
      })),
    ),
    lifecycleFunnel: buildLifecycleFunnel(forecastDeals),
    stageTransitions,
  };
}
