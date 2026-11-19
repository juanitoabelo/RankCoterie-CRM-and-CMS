"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { validateReportConfig } from "./report-config";
import { deleteSavedReport, saveDashboard, saveReport } from "./saved";

function back(path: string, key: "ok" | "error", message: string): never {
  revalidatePath(path);
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

export async function reportSaveForm(formData: FormData): Promise<void> {
  const actor = await requireSection("reports");
  const parsed = validateReportConfig({
    dataset: String(formData.get("dataset") ?? ""),
    metric: String(formData.get("metric") ?? ""),
    dimension: String(formData.get("dimension") ?? ""),
    visualization: String(formData.get("visualization") ?? ""),
  });
  if (!parsed.ok) back("/admin/crm/reports/builder", "error", parsed.error);

  const result = await saveReport({
    ownerId: actor.id,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    config: parsed.config,
    shared: formData.get("shared") === "on",
  });
  if (!result.ok) back("/admin/crm/reports/builder", "error", result.error);
  await logAudit({ action: "REPORT_SAVE", entity: "SavedReport", entityId: result.id, actorId: actor.id });
  back("/admin/crm/reports/builder", "ok", "Report saved.");
}

export async function reportDeleteForm(formData: FormData): Promise<void> {
  const actor = await requireSection("reports");
  const id = String(formData.get("reportId") ?? "");
  const result = await deleteSavedReport(id);
  if (!result.ok) back("/admin/crm/reports/builder", "error", result.error);
  await logAudit({ action: "REPORT_DELETE", entity: "SavedReport", entityId: id, actorId: actor.id });
  back("/admin/crm/reports/builder", "ok", "Report deleted.");
}

export async function dashboardSaveForm(formData: FormData): Promise<void> {
  const actor = await requireSection("reports");
  const reportIds = formData.getAll("reportIds").map(String).filter(Boolean);
  const result = await saveDashboard({
    ownerId: actor.id,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    shared: formData.get("shared") === "on",
    reportIds,
  });
  if (!result.ok) back("/admin/crm/reports/dashboards", "error", result.error);
  await logAudit({ action: "DASHBOARD_SAVE", entity: "SavedDashboard", entityId: result.id, actorId: actor.id });
  back("/admin/crm/reports/dashboards", "ok", "Dashboard saved.");
}
