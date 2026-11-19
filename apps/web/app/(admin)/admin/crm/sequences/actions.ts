"use server";

import { redirect } from "next/navigation";
import {
  addCrmSequenceStep,
  createCrmEmailSequence,
  enrollCrmSequence,
  setCrmSequenceStatus,
} from "@/modules/crm/sequences";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function fail(path: string, result: { error?: string }): never {
  redirect(`${path}?error=${encodeURIComponent(result.error ?? "Operation failed.")}`);
}

export async function createSequenceForm(formData: FormData): Promise<void> {
  const result = await createCrmEmailSequence({
    name: value(formData, "name"),
    description: value(formData, "description"),
    subject: value(formData, "subject"),
    body: value(formData, "body"),
    status: value(formData, "status") || "DRAFT",
  });
  if (!result.ok) fail("/admin/crm/sequences", result);
  redirect(`/admin/crm/sequences/${result.id}`);
}

export async function addSequenceStepForm(formData: FormData): Promise<void> {
  const sequenceId = value(formData, "sequenceId");
  const result = await addCrmSequenceStep({
    sequenceId,
    subject: value(formData, "subject"),
    body: value(formData, "body"),
    delayMinutes: value(formData, "delayMinutes") || "0",
  });
  if (!result.ok) fail(`/admin/crm/sequences/${sequenceId}`, result);
}

export async function setSequenceStatusForm(formData: FormData): Promise<void> {
  const sequenceId = value(formData, "sequenceId");
  const status = value(formData, "status");
  if (status !== "DRAFT" && status !== "ACTIVE" && status !== "PAUSED") {
    fail(`/admin/crm/sequences/${sequenceId}`, { error: "Invalid status." });
  }
  const result = await setCrmSequenceStatus(sequenceId, status);
  if (!result.ok) fail(`/admin/crm/sequences/${sequenceId}`, result);
}

export async function enrollSequenceForm(formData: FormData): Promise<void> {
  const sequenceId = value(formData, "sequenceId");
  const result = await enrollCrmSequence({
    sequenceId,
    connectionId: value(formData, "connectionId"),
    toEmail: value(formData, "toEmail"),
    leadId: value(formData, "leadId"),
    clientId: value(formData, "clientId"),
    dealId: value(formData, "dealId"),
    firstName: value(formData, "firstName"),
    lastName: value(formData, "lastName"),
  });
  if (!result.ok) fail(`/admin/crm/sequences/${sequenceId}`, result);
}
