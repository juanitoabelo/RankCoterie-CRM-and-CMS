import { prisma, TENANT_ID } from "@/modules/shared";
import { DEFAULT_CRM_STAGES } from "./constants";

export async function ensureCrmStages() {
  await Promise.all(
    DEFAULT_CRM_STAGES.map((stage) =>
      prisma.crmStage.upsert({
        where: { tenantId_key: { tenantId: TENANT_ID, key: stage.key } },
        update: {},
        create: {
          tenantId: TENANT_ID,
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
  await ensureCrmStages();
  return prisma.crmStage.findUnique({
    where: { tenantId_key: { tenantId: TENANT_ID, key } },
  });
}
