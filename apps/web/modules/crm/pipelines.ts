import { prisma, TENANT_ID } from "@/modules/shared";
import { isValidPipelineKey } from "./deal-template-helpers";

export const DEFAULT_PIPELINE_KEY = "default-sales";

export async function ensureCrmPipelines() {
  const existing = await prisma.crmPipeline.findFirst({
    where: { tenantId: TENANT_ID, isDefault: true, active: true },
    orderBy: { createdAt: "asc" },
  });
  const pipeline = existing ?? await prisma.crmPipeline.upsert({
    where: { tenantId_key: { tenantId: TENANT_ID, key: DEFAULT_PIPELINE_KEY } },
    create: {
      tenantId: TENANT_ID,
      name: "Default sales",
      key: DEFAULT_PIPELINE_KEY,
      isDefault: true,
      active: true,
    },
    update: { isDefault: true, active: true },
  });

  await prisma.crmStage.updateMany({
    where: { tenantId: TENANT_ID, pipelineId: null },
    data: { pipelineId: pipeline.id },
  });
  await prisma.deal.updateMany({
    where: { tenantId: TENANT_ID, pipelineId: null },
    data: { pipelineId: pipeline.id },
  });

  return pipeline;
}

export async function getCrmPipelines() {
  await ensureCrmPipelines();
  return prisma.crmPipeline.findMany({
    where: { tenantId: TENANT_ID, active: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: {
      stages: {
        where: { active: true },
        orderBy: { order: "asc" },
        select: { id: true, label: true },
      },
      _count: { select: { stages: true, deals: true } },
    },
  });
}

export async function createCrmPipeline(name: string, key: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cleanName = name.trim().slice(0, 120);
  const cleanKey = key.trim().toLowerCase();
  if (!cleanName) return { ok: false, error: "Pipeline name is required." };
  if (!isValidPipelineKey(cleanKey)) return { ok: false, error: "Pipeline key must be a lowercase slug." };

  const duplicate = await prisma.crmPipeline.findFirst({
    where: { tenantId: TENANT_ID, key: cleanKey },
    select: { id: true },
  });
  if (duplicate) return { ok: false, error: "A pipeline with that key already exists." };

  const pipeline = await prisma.crmPipeline.create({
    data: { tenantId: TENANT_ID, name: cleanName, key: cleanKey, isDefault: false, active: true },
  });
  return { ok: true, id: pipeline.id };
}

export async function createCrmStage(
  pipelineId: string,
  label: string,
  key: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cleanLabel = label.trim().slice(0, 120);
  const cleanKey = key.trim().toLowerCase();
  if (!cleanLabel) return { ok: false, error: "Stage name is required." };
  if (!isValidPipelineKey(cleanKey)) return { ok: false, error: "Stage key must be a lowercase slug." };

  const pipeline = await prisma.crmPipeline.findFirst({
    where: { id: pipelineId, tenantId: TENANT_ID, active: true },
    select: { id: true },
  });
  if (!pipeline) return { ok: false, error: "Pipeline not found." };

  const existing = await prisma.crmStage.findFirst({
    where: { tenantId: TENANT_ID, pipelineId, key: cleanKey },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "A stage with that key already exists in this pipeline." };

  const last = await prisma.crmStage.findFirst({
    where: { tenantId: TENANT_ID, pipelineId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const stage = await prisma.crmStage.create({
    data: {
      tenantId: TENANT_ID,
      pipelineId,
      key: cleanKey,
      label: cleanLabel,
      order: (last?.order ?? 0) + 1,
      probability: 0,
    },
  });
  return { ok: true, id: stage.id };
}

export async function setDefaultCrmPipeline(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const pipeline = await prisma.crmPipeline.findFirst({
    where: { id, tenantId: TENANT_ID, active: true },
    select: { id: true },
  });
  if (!pipeline) return { ok: false, error: "Pipeline not found." };

  await prisma.$transaction([
    prisma.crmPipeline.updateMany({ where: { tenantId: TENANT_ID }, data: { isDefault: false } }),
    prisma.crmPipeline.update({ where: { id: pipeline.id }, data: { isDefault: true } }),
  ]);
  return { ok: true };
}

export async function getDefaultCrmPipeline() {
  return ensureCrmPipelines();
}
