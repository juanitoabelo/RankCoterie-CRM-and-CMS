import { prisma, TENANT_ID } from "@/modules/shared";
import { DEFAULT_CRM_STAGES } from "./constants";
import { ensureCrmPipelines } from "./pipelines";

export async function ensureCrmStages() {
  const pipeline = await ensureCrmPipelines();
  await Promise.all(
    DEFAULT_CRM_STAGES.map((stage) =>
      prisma.crmStage.upsert({
        where: {
          tenantId_pipelineId_key: {
            tenantId: TENANT_ID,
            pipelineId: pipeline.id,
            key: stage.key,
          },
        },
        update: {},
        create: {
          tenantId: TENANT_ID,
          pipelineId: pipeline.id,
          key: stage.key,
          label: stage.label,
          order: stage.order,
          probability: stage.probability,
          isWon: stage.isWon ?? false,
          isLost: stage.isLost ?? false,
        },
      }),
    ),
  );
  return prisma.crmStage.findMany({
    where: { tenantId: TENANT_ID, active: true },
    orderBy: [{ order: "asc" }, { label: "asc" }],
  });
}

export async function getCrmStages() {
  return ensureCrmStages();
}

export async function getDefaultCrmStage() {
  const stages = await getCrmStages();
  return stages[0] ?? null;
}

export async function getCrmStageByKey(key: string) {
  const pipeline = await ensureCrmPipelines();
  await ensureCrmStages();
  return prisma.crmStage.findFirst({
    where: { tenantId: TENANT_ID, pipelineId: pipeline.id, key },
  });
}
