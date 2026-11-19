"use server";

import { redirect } from "next/navigation";
import {
  createCrmWorkflow,
  deleteCrmWorkflow,
  setCrmWorkflowEnabled,
} from "@/modules/crm/workflow-runner";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function fail(path: string, result: { error?: string }): never {
  redirect(`${path}?error=${encodeURIComponent(result.error ?? "Operation failed.")}`);
}

export async function createWorkflowForm(formData: FormData): Promise<void> {
  const conditionField = value(formData, "conditionField");
  const conditionOperator = value(formData, "conditionOperator");
  const conditionValue = value(formData, "conditionValue");
  const actionType = value(formData, "actionType");
  const actionText = value(formData, "actionText");
  const conditions = conditionField
    ? [
        {
          field: conditionField,
          operator: conditionOperator || "equals",
          ...(conditionValue ? { value: conditionValue } : {}),
        },
      ]
    : [];
  const actions = actionText
    ? [
        {
          type: actionType || "log_note",
          text: actionText,
          ...(value(formData, "actionAssigneeId")
            ? { assigneeId: value(formData, "actionAssigneeId") }
            : {}),
        },
      ]
    : [];
  const result = await createCrmWorkflow({
    name: value(formData, "name"),
    description: value(formData, "description"),
    event: value(formData, "event"),
    conditions,
    actions,
  });
  if (!result.ok) fail("/admin/crm/workflows", result);
}

export async function toggleWorkflowForm(formData: FormData): Promise<void> {
  const id = value(formData, "id");
  const result = await setCrmWorkflowEnabled(id, value(formData, "enabled") === "true");
  if (!result.ok) fail("/admin/crm/workflows", result);
}

export async function deleteWorkflowForm(formData: FormData): Promise<void> {
  const id = value(formData, "id");
  const result = await deleteCrmWorkflow(id);
  if (!result.ok) fail("/admin/crm/workflows", result);
}
