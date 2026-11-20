import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { logCrmActivity } from "./activity";
import { getDefaultCrmStage, getCrmStages } from "./stages";
import {
  mapHubspotContacts,
  mapHubspotDeals,
  mapHubspotEngagements,
  recordsFromCsv,
  toHubspotCsv,
} from "./hubspot";

export type HubspotImportResult = {
  ok: boolean;
  error?: string;
  message?: string;
  contacts: number;
  deals: number;
  engagements: number;
  skipped: number;
};

function jsonRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateCrm(): void {
  revalidatePath("/admin/leads");
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/deals");
  revalidatePath("/admin/crm/activities");
  revalidatePath("/admin/crm/import-export");
}

export async function importHubspotCsv(type: string, csv: string): Promise<HubspotImportResult> {
  const user = await requireSection("crm");
  const result: HubspotImportResult = {
    ok: true,
    contacts: 0,
    deals: 0,
    engagements: 0,
    skipped: 0,
  };

  if (!["contacts", "deals", "engagements"].includes(type)) {
    return { ...result, ok: false, error: "Unknown HubSpot object type." };
  }
  const records = recordsFromCsv(csv);
  if (records.length === 0) return { ...result, ok: false, error: "CSV file is empty." };

  if (type === "contacts") {
    for (const contact of mapHubspotContacts(records)) {
      if (!contact.email) {
        result.skipped += 1;
        continue;
      }
      const existing = await prisma.lead.findFirst({
        where: { tenantId: TENANT_ID, email: { equals: contact.email, mode: "insensitive" } },
        select: { id: true, intake: true, phones: true },
      });
      const intake = {
        ...jsonRecord(existing?.intake),
        ...(contact.companyName ? { hubspotCompany: contact.companyName } : {}),
      };
      const phones = {
        ...jsonRecord(existing?.phones),
        ...(contact.phone ? { mobile: contact.phone } : {}),
      };
      if (existing) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            firstName: contact.firstName || undefined,
            lastName: contact.lastName || undefined,
            intake: intake as Prisma.InputJsonValue,
            phones: phones as Prisma.InputJsonValue,
          },
        });
      } else {
        await prisma.lead.create({
          data: {
            tenantId: TENANT_ID,
            firstName: contact.firstName || null,
            lastName: contact.lastName || null,
            email: contact.email,
            intake: intake as Prisma.InputJsonValue,
            phones: phones as Prisma.InputJsonValue,
          },
        });
      }
      result.contacts += 1;
    }
  }

  if (type === "deals") {
    const stages = await getCrmStages();
    const defaultStage = await getDefaultCrmStage();
    for (const row of mapHubspotDeals(records)) {
      const stage =
        stages.find((item) => item.label.toLowerCase() === row.stageLabel?.toLowerCase()) ??
        defaultStage;
      if (!stage) {
        result.skipped += 1;
        continue;
      }
      const owner = row.ownerEmail
        ? await prisma.user.findFirst({
            where: {
              tenantId: TENANT_ID,
              email: { equals: row.ownerEmail, mode: "insensitive" },
            },
            select: { id: true },
          })
        : null;
      await prisma.deal.create({
        data: {
          tenantId: TENANT_ID,
          title: row.title,
          value: new Prisma.Decimal(row.value.toFixed(2)),
          currency: row.currency.toUpperCase().slice(0, 3) || "USD",
          stageId: stage.id,
          pipelineId: stage.pipelineId,
          probability: stage.probability,
          expectedCloseDate: parseDate(row.expectedCloseDate),
          source: "HubSpot import",
          ownerId: owner?.id ?? null,
          companyName: row.companyName,
        },
      });
      result.deals += 1;
    }
  }

  if (type === "engagements") {
    for (const row of mapHubspotEngagements(records)) {
      const lead = row.email
        ? await prisma.lead.findFirst({
            where: { tenantId: TENANT_ID, email: { equals: row.email, mode: "insensitive" } },
            select: { id: true },
          })
        : null;
      const externalId = row.externalId ? `hubspot:${row.externalId}` : null;
      try {
        await logCrmActivity({
          type: row.type,
          subject: row.subject || "HubSpot engagement",
          body: row.body || null,
          occurredAt: parseDate(row.occurredAt) ?? undefined,
          leadId: lead?.id ?? null,
          externalId,
          source: "hubspot",
        });
        result.engagements += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          result.skipped += 1;
        } else {
          throw error;
        }
      }
    }
  }

  await logAudit({
    action: "CRM_IMPORT",
    entity: "CrmImport",
    entityId: type,
    actorId: user.id,
    reason: `Imported HubSpot ${type}`,
    meta: result,
  });
  revalidateCrm();
  return {
    ...result,
    message: `Imported ${result.contacts} contacts, ${result.deals} deals, and ${result.engagements} engagements.`,
  };
}

export async function getHubspotExportCsv(type: string): Promise<{ filename: string; csv: string }> {
  if (type === "contacts") {
    const leads = await prisma.lead.findMany({
      where: { tenantId: TENANT_ID },
      select: { firstName: true, lastName: true, email: true, status: true, intake: true, phones: true },
      orderBy: { lastModified: "desc" },
    });
    return {
      filename: "hubspot-contacts.csv",
      csv: toHubspotCsv(
        leads,
        [
          { key: "firstName", label: "First Name" },
          { key: "lastName", label: "Last Name" },
          { key: "email", label: "Email" },
          {
            key: "company",
            label: "Company",
            value: (row) => String(jsonRecord(row.intake).hubspotCompany ?? ""),
          },
          {
            key: "phone",
            label: "Phone",
            value: (row) => String(jsonRecord(row.phones).mobile ?? ""),
          },
          { key: "status", label: "Lifecycle Stage", value: (row) => row.status.toLowerCase() },
        ],
      ),
    };
  }

  if (type === "deals") {
    const deals = await prisma.deal.findMany({
      where: { tenantId: TENANT_ID },
      include: { stage: { select: { label: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      filename: "hubspot-deals.csv",
      csv: toHubspotCsv(
        deals,
        [
          { key: "title", label: "Deal Name" },
          { key: "value", label: "Amount", value: (row) => Number(row.value).toFixed(2) },
          { key: "stage", label: "Stage", value: (row) => row.stage.label },
          {
            key: "closeDate",
            label: "Close Date",
            value: (row) => row.expectedCloseDate?.toISOString().slice(0, 10) ?? "",
          },
          { key: "companyName", label: "Associated Company" },
          { key: "source", label: "Source" },
        ],
      ),
    };
  }

  if (type === "engagements") {
    const activities = await prisma.crmActivity.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { occurredAt: "desc" },
      take: 5000,
    });
    return {
      filename: "hubspot-engagements.csv",
      csv: toHubspotCsv(
        activities,
        [
          { key: "type", label: "Type" },
          { key: "subject", label: "Subject" },
          { key: "body", label: "Body" },
          { key: "occurredAt", label: "Date", value: (row) => row.occurredAt.toISOString() },
          { key: "externalId", label: "External ID" },
        ],
      ),
    };
  }

  throw new Error("Unknown HubSpot object type.");
}
