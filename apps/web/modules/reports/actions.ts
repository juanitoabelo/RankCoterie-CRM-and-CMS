"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { logAudit } from "@/lib/audit";
import { validateReportConfig } from "./report-config";
import { deleteSavedDashboard, deleteSavedReport, saveDashboard, saveReport } from "./saved";

function back(path: string, key: "ok" | "error", message: string): never {
  revalidatePath(path);
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

async function reportActor() {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  return { user, viewer: { userId: user.id, isAdmin: access.isAdmin } };
}

export async function reportSaveForm(formData: FormData): Promise<void> {
  const { user } = await reportActor();
  const parsed = validateReportConfig({
    dataset: String(formData.get("dataset") ?? ""),
    metric: String(formData.get("metric") ?? ""),
    dimension: String(formData.get("dimension") ?? ""),
    visualization: String(formData.get("visualization") ?? ""),
  });
  if (!parsed.ok) back("/admin/crm/reports/builder", "error", parsed.error);

  const result = await saveReport({
    ownerId: user.id,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    config: parsed.config,
    shared: formData.get("shared") === "on",
  });
  if (!result.ok) back("/admin/crm/reports/builder", "error", result.error);
  await logAudit({ action: "REPORT_SAVE", entity: "SavedReport", entityId: result.id, actorId: user.id });
  back("/admin/crm/reports/builder", "ok", "Report saved.");
}

export async function reportDeleteForm(formData: FormData): Promise<void> {
  const { user, viewer } = await reportActor();
  const id = String(formData.get("reportId") ?? "");
  const result = await deleteSavedReport(id, viewer);
  if (!result.ok) back("/admin/crm/reports/builder", "error", result.error);
  await logAudit({ action: "REPORT_DELETE", entity: "SavedReport", entityId: id, actorId: user.id });
  back("/admin/crm/reports/builder", "ok", "Report deleted.");
}

export async function dashboardSaveForm(formData: FormData): Promise<void> {
  const { user, viewer } = await reportActor();
  const reportIds = formData.getAll("reportIds").map(String).filter(Boolean);
  const result = await saveDashboard({
    ownerId: user.id,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    shared: formData.get("shared") === "on",
    reportIds,
    viewer,
  });
  if (!result.ok) back("/admin/crm/reports/dashboards", "error", result.error);
  await logAudit({ action: "DASHBOARD_SAVE", entity: "SavedDashboard", entityId: result.id, actorId: user.id });
  back("/admin/crm/reports/dashboards", "ok", "Dashboard saved.");
}

export async function dashboardDeleteForm(formData: FormData): Promise<void> {
  const { user, viewer } = await reportActor();
  const id = String(formData.get("dashboardId") ?? "");
  const result = await deleteSavedDashboard(id, viewer);
  if (!result.ok) back("/admin/crm/reports/dashboards", "error", result.error);
  await logAudit({ action: "DASHBOARD_DELETE", entity: "SavedDashboard", entityId: id, actorId: user.id });
  back("/admin/crm/reports/dashboards", "ok", "Dashboard deleted.");
}
