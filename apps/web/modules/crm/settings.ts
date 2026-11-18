import { prisma, TENANT_ID } from "@/modules/shared";

export type CrmSettings = {
  autoAssignLeads: boolean;
  restrictSalesRepsToOwned: boolean;
  staleDealDays: number;
  defaultCurrency: string;
};

export const DEFAULT_CRM_SETTINGS: CrmSettings = {
  autoAssignLeads: false,
  restrictSalesRepsToOwned: true,
  staleDealDays: 14,
  defaultCurrency: "USD",
};

export async function getCrmSettings(): Promise<CrmSettings> {
  const row = await prisma.crmSetting.findUnique({ where: { tenantId: TENANT_ID } });
  if (!row) return DEFAULT_CRM_SETTINGS;
  return {
    autoAssignLeads: row.autoAssignLeads,
    restrictSalesRepsToOwned: row.restrictSalesRepsToOwned,
    staleDealDays: row.staleDealDays,
    defaultCurrency: row.defaultCurrency,
  };
}

export async function saveCrmSettings(input: Partial<CrmSettings>): Promise<CrmSettings> {
  const current = await getCrmSettings();
  const next: CrmSettings = {
    autoAssignLeads:
      typeof input.autoAssignLeads === "boolean" ? input.autoAssignLeads : current.autoAssignLeads,
    restrictSalesRepsToOwned:
      typeof input.restrictSalesRepsToOwned === "boolean"
        ? input.restrictSalesRepsToOwned
        : current.restrictSalesRepsToOwned,
    staleDealDays:
      typeof input.staleDealDays === "number" && Number.isFinite(input.staleDealDays)
        ? Math.max(1, Math.min(365, Math.round(input.staleDealDays)))
        : current.staleDealDays,
    defaultCurrency:
      input.defaultCurrency?.trim().toUpperCase().slice(0, 3) || current.defaultCurrency,
  };
  const row = await prisma.crmSetting.upsert({
    where: { tenantId: TENANT_ID },
    update: next,
    create: { tenantId: TENANT_ID, ...next },
  });
  return {
    autoAssignLeads: row.autoAssignLeads,
    restrictSalesRepsToOwned: row.restrictSalesRepsToOwned,
    staleDealDays: row.staleDealDays,
    defaultCurrency: row.defaultCurrency,
  };
}
