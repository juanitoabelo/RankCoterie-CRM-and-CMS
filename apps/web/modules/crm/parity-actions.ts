"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { requireCrmAdmin } from "./access";
import { createCrmPipeline, createCrmStage, setDefaultCrmPipeline } from "./pipelines";
import { createDealTemplate, deleteDealTemplate } from "./deal-templates";

function back(path: string, key: "ok" | "error", message: string): never {
  revalidatePath(path);
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

export async function crmPipelineCreateForm(formData: FormData): Promise<void> {
  const { user: actor } = await requireCrmAdmin();
  const result = await createCrmPipeline(
    String(formData.get("name") ?? ""),
    String(formData.get("key") ?? ""),
  );
  if (!result.ok) back("/admin/crm/pipelines", "error", result.error);
  await logAudit({
    action: "CRM_PIPELINE_CREATE",
    entity: "CrmPipeline",
    entityId: result.id,
    actorId: actor.id,
  });
  back("/admin/crm/pipelines", "ok", "Pipeline created.");
}

export async function crmStageCreateForm(formData: FormData): Promise<void> {
  const { user: actor } = await requireCrmAdmin();
  const result = await createCrmStage(
    String(formData.get("pipelineId") ?? ""),
    String(formData.get("label") ?? ""),
    String(formData.get("key") ?? ""),
  );
  if (!result.ok) back("/admin/crm/pipelines", "error", result.error);
  await logAudit({
    action: "CRM_STAGE_CREATE",
    entity: "CrmStage",
    entityId: result.id,
    actorId: actor.id,
  });
  back("/admin/crm/pipelines", "ok", "Stage created.");
}

export async function crmPipelineDefaultForm(formData: FormData): Promise<void> {
  const { user: actor } = await requireCrmAdmin();
  const result = await setDefaultCrmPipeline(String(formData.get("pipelineId") ?? ""));
  if (!result.ok) back("/admin/crm/pipelines", "error", result.error);
  await logAudit({
    action: "CRM_PIPELINE_DEFAULT",
    entity: "CrmPipeline",
    entityId: String(formData.get("pipelineId") ?? ""),
    actorId: actor.id,
  });
  back("/admin/crm/pipelines", "ok", "Default pipeline updated.");
}

export async function crmDealTemplateCreateForm(formData: FormData): Promise<void> {
  const { user: actor } = await requireCrmAdmin();
  const result = await createDealTemplate(
    String(formData.get("name") ?? ""),
    String(formData.get("description") ?? ""),
    String(formData.get("defaults") ?? ""),
  );
  if (!result.ok) back("/admin/crm/deal-templates", "error", result.error);
  await logAudit({
    action: "CRM_DEAL_TEMPLATE_CREATE",
    entity: "CrmDealTemplate",
    entityId: result.id,
    actorId: actor.id,
  });
  back("/admin/crm/deal-templates", "ok", "Deal template created.");
}

export async function crmDealTemplateDeleteForm(formData: FormData): Promise<void> {
  const { user: actor } = await requireCrmAdmin();
  const id = String(formData.get("templateId") ?? "");
  const result = await deleteDealTemplate(id);
  if (!result.ok) back("/admin/crm/deal-templates", "error", result.error);
  await logAudit({
    action: "CRM_DEAL_TEMPLATE_DELETE",
    entity: "CrmDealTemplate",
    entityId: id,
    actorId: actor.id,
  });
  back("/admin/crm/deal-templates", "ok", "Deal template archived.");
}
