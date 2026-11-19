import type { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import type { ReportConfig } from "./report-config";
import { aggregateReportPoints, type ReportPoint } from "./report-data";

export interface ReportResult {
  points: ReportPoint[];
  total: number;
  generatedAt: string;
}

type DealRow = {
  value: Prisma.Decimal;
  probability: number | null;
  expectedCloseDate: Date | null;
  createdAt: Date;
  stage: { label: string; probability: number };
  ownerId: string | null;
};

type LeadRow = {
  status: string | null;
  intake: Prisma.JsonValue;
  createdAt: Date;
};

function jsonSource(intake: Prisma.JsonValue): string {
  if (!intake || typeof intake !== "object" || Array.isArray(intake)) return "Direct";
  const value = (intake as Record<string, unknown>).source;
  return typeof value === "string" && value.trim() ? value.trim() : "Direct";
}

function monthLabel(date: Date | null): string {
  const value = date ?? new Date(0);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dealMetric(row: DealRow, metric: ReportConfig["metric"]): number {
  if (metric === "count") return 1;
  const value = Number(row.value);
  if (metric === "value") return value;
  const probability = row.probability ?? row.stage.probability;
  return value * (probability / 100);
}

export async function runReport(config: ReportConfig): Promise<ReportResult> {
  const users = await prisma.user.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const ownerLabels = new Map(
    users.map((user) => [
      user.id,
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || "Unknown owner",
    ]),
  );
  const ownerLabel = (id: string | null) => (id ? ownerLabels.get(id) ?? "Unknown owner" : "Unassigned");

  let rows: ReportPoint[] = [];

  if (config.dataset === "leadsBySource") {
    const leads: LeadRow[] = await prisma.lead.findMany({
      where: { tenantId: TENANT_ID },
      select: { status: true, intake: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    rows = leads.map((lead) => ({
      label: config.dimension === "status" ? lead.status?.trim() || "Unspecified" : jsonSource(lead.intake),
      value: 1,
    }));
  } else {
    const deals: DealRow[] = await prisma.deal.findMany({
      where: { tenantId: TENANT_ID },
      select: {
        value: true,
        probability: true,
        expectedCloseDate: true,
        createdAt: true,
        stage: { select: { label: true, probability: true } },
        ownerId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    rows = deals.map((deal) => {
      let label: string;
      if (config.dataset === "revenueByMonth") {
        label = config.dimension === "owner" ? ownerLabel(deal.ownerId) : monthLabel(deal.expectedCloseDate ?? deal.createdAt);
      } else if (config.dataset === "dealsByOwner") {
        label = config.dimension === "stage" ? deal.stage.label : ownerLabel(deal.ownerId);
      } else {
        label = config.dimension === "owner" ? ownerLabel(deal.ownerId) : deal.stage.label;
      }
      return { label, value: dealMetric(deal, config.metric) };
    });
  }

  const points = aggregateReportPoints(rows);
  return {
    points,
    total: points.reduce((sum, point) => sum + point.value, 0),
    generatedAt: new Date().toISOString(),
  };
}
