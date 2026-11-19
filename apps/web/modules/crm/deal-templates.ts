import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import {
  normalizeDealTemplateDefaults,
  type DealTemplateDefaults,
} from "./deal-template-helpers";

export type DealTemplateRecord = {
  id: string;
  name: string;
  description: string | null;
  defaults: DealTemplateDefaults;
  active: boolean;
  updatedAt: Date;
};

function toRecord(row: {
  id: string;
  name: string;
  description: string | null;
  defaults: unknown;
  active: boolean;
  updatedAt: Date;
}): DealTemplateRecord {
  return { ...row, defaults: normalizeDealTemplateDefaults(row.defaults) };
}

export async function listDealTemplates(): Promise<DealTemplateRecord[]> {
  const rows = await prisma.crmDealTemplate.findMany({
    where: { tenantId: TENANT_ID, active: true },
    orderBy: { name: "asc" },
  });
  return rows.map(toRecord);
}

export async function getDealTemplate(id: string): Promise<DealTemplateRecord | null> {
  const row = await prisma.crmDealTemplate.findFirst({
    where: { id, tenantId: TENANT_ID, active: true },
  });
  return row ? toRecord(row) : null;
}

export async function getDealTemplateDefaults(id: string): Promise<DealTemplateDefaults | null> {
  const template = await getDealTemplate(id);
  return template?.defaults ?? null;
}

export async function createDealTemplate(
  name: string,
  description: string,
  defaultsJson: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cleanName = name.trim().slice(0, 120);
  if (!cleanName) return { ok: false, error: "Template name is required." };

  let parsed: unknown;
  try {
    parsed = defaultsJson.trim() ? JSON.parse(defaultsJson) : {};
  } catch {
    return { ok: false, error: "Template defaults must be valid JSON." };
  }
  const defaults = normalizeDealTemplateDefaults(parsed);
  const duplicate = await prisma.crmDealTemplate.findFirst({
    where: { tenantId: TENANT_ID, name: cleanName },
    select: { id: true },
  });
  if (duplicate) return { ok: false, error: "A template with that name already exists." };

  const template = await prisma.crmDealTemplate.create({
    data: {
      tenantId: TENANT_ID,
      name: cleanName,
      description: description.trim().slice(0, 500) || null,
      defaults: defaults as unknown as Prisma.InputJsonValue,
      active: true,
    },
  });
  return { ok: true, id: template.id };
}

export async function deleteDealTemplate(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const template = await prisma.crmDealTemplate.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!template) return { ok: false, error: "Template not found." };
  await prisma.crmDealTemplate.update({ where: { id }, data: { active: false } });
  return { ok: true };
}
