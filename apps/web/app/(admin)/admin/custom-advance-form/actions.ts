"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import {
  normalizeCustomFormSettings,
  validateCustomFormFields,
} from "@/modules/custom-forms/types";

export type FormActionResult = { ok: true; id?: string } | { ok: false; error: string };

function fieldsJson(fields: NonNullable<ReturnType<typeof validateCustomFormFields>["fields"]>): Prisma.InputJsonArray {
  return fields.map((field): Prisma.InputJsonObject => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    width: field.width,
    ...(field.placeholder ? { placeholder: field.placeholder } : {}),
    ...(field.helpText ? { helpText: field.helpText } : {}),
    ...(field.customCss ? { customCss: field.customCss } : {}),
    ...(field.options ? { options: field.options } : {}),
  }));
}

function settingsJson(settings: ReturnType<typeof normalizeCustomFormSettings>): Prisma.InputJsonObject {
  const leadFields: Prisma.InputJsonObject = {};
  for (const key of ["firstName", "lastName", "email", "phone", "message"] as const) {
    const value = settings.leadFields[key];
    if (value) leadFields[key] = value;
  }
  return {
    notifyTo: settings.notifyTo,
    from: settings.from,
    subject: settings.subject,
    body: settings.body,
    confirmationEnabled: settings.confirmationEnabled,
    confirmationEmailField: settings.confirmationEmailField,
    confirmationSubject: settings.confirmationSubject,
    confirmationBody: settings.confirmationBody,
    createLead: settings.createLead,
    leadFields,
  };
}

export async function createCustomForm(formData: FormData): Promise<FormActionResult> {
  const actor = await requireSection("general");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) return { ok: false, error: "Form name must be between 1 and 120 characters." };
  try {
    const form = await prisma.customForm.create({
      data: {
        tenantId: TENANT_ID,
        name,
        fields: [
          { key: "name", label: "Name", type: "text", required: true, width: "half" },
          { key: "email", label: "Email", type: "email", required: true, width: "half" },
          { key: "message", label: "Message", type: "textarea", required: true, width: "full" },
        ],
        settings: settingsJson(normalizeCustomFormSettings(null)),
      },
    });
    await logAudit({ actorId: actor.id, action: "CUSTOM_FORM_CREATE", entity: "CustomForm", entityId: form.id, reason: name });
    revalidatePath("/admin/custom-advance-form");
    return { ok: true, id: form.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not create the form." };
  }
}

export async function saveCustomForm(id: string, formData: FormData): Promise<FormActionResult> {
  const actor = await requireSection("general");
  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "DRAFT");
  if (!name || name.length > 120) return { ok: false, error: "Form name must be between 1 and 120 characters." };
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) return { ok: false, error: "Invalid form status." };
  let fieldsValue: unknown;
  let settingsValue: unknown;
  try {
    fieldsValue = JSON.parse(String(formData.get("fields") ?? "[]"));
    settingsValue = JSON.parse(String(formData.get("settings") ?? "{}"));
  } catch {
    return { ok: false, error: "Form fields or settings contain invalid JSON." };
  }
  const validatedFields = validateCustomFormFields(fieldsValue);
  if (!validatedFields.fields) return { ok: false, error: validatedFields.error ?? "Invalid form fields." };
  const settings = normalizeCustomFormSettings(settingsValue);
  if (settings.notifyTo.length > 10 || settings.notifyTo.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { ok: false, error: "Enter valid email addresses for notification recipients." };
  }
  const fromEmail = settings.from.match(/<([^>]+)>/)?.[1] ?? settings.from;
  if (settings.from.length > 254 || (settings.from && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail.trim()))) {
    return { ok: false, error: "Enter a valid From email address." };
  }
  if (settings.subject.length > 200 || settings.body.length > 20_000 || settings.confirmationSubject.length > 200 || settings.confirmationBody.length > 20_000) {
    return { ok: false, error: "Email subjects or content exceed the allowed length." };
  }
  const fieldKeys = new Set(validatedFields.fields.map((field) => field.key));
  const confirmationField = validatedFields.fields.find((field) => field.key === settings.confirmationEmailField);
  if (settings.confirmationEmailField && confirmationField?.type !== "email") {
    return { ok: false, error: "Choose an email-type field for the submitter email setting." };
  }
  if (settings.confirmationEnabled && (!confirmationField || !confirmationField.required)) {
    return { ok: false, error: "Choose an email-type field for the submitter confirmation email." };
  }
  if (settings.createLead) {
    const emailKey = settings.leadFields.email;
    const leadEmailField = validatedFields.fields.find((field) => field.key === emailKey);
    if (!leadEmailField || leadEmailField.type !== "email" || !leadEmailField.required) {
      return { ok: false, error: "Map a required form email field to Lead email before enabling Lead integration." };
    }
  }
  for (const key of Object.values(settings.leadFields)) {
    if (key && !fieldKeys.has(key)) return { ok: false, error: "Every Lead field mapping must point to a form field." };
  }
  if (settings.leadFields.email && !validatedFields.fields.some((field) => field.key === settings.leadFields.email && field.type === "email")) {
    return { ok: false, error: "The Lead email mapping must use an email-type form field." };
  }
  try {
    const result = await prisma.customForm.updateMany({
      where: { id, tenantId: TENANT_ID },
      data: {
        name,
        status,
        fields: fieldsJson(validatedFields.fields),
        settings: settingsJson(settings),
      },
    });
    if (!result.count) return { ok: false, error: "Form not found." };
    await logAudit({ actorId: actor.id, action: "CUSTOM_FORM_UPDATE", entity: "CustomForm", entityId: id, reason: `${name} (${status})` });
    revalidatePath("/admin/custom-advance-form");
    revalidatePath(`/admin/custom-advance-form/${id}`);
    revalidatePath(`/admin/custom-advance-form/${id}/submissions`);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save the form." };
  }
}

export async function replyToCustomSubmission(submissionId: string, formData: FormData): Promise<FormActionResult> {
  const actor = await requireSection("general");
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { ok: false, error: "Reply cannot be empty." };
  if (message.length > 20_000) return { ok: false, error: "Reply must be 20,000 characters or fewer." };
  const submission = await prisma.customFormSubmission.findFirst({
    where: { id: submissionId, tenantId: TENANT_ID },
    include: { form: true },
  });
  if (!submission) return { ok: false, error: "Submission not found." };
  const fields = validateCustomFormFields(submission.form.fields).fields ?? [];
  const settings = normalizeCustomFormSettings(submission.form.settings);
  const values = submission.data && typeof submission.data === "object"
    ? submission.data as Record<string, unknown>
    : {};
  const emailKey = settings.confirmationEmailField || fields.find((field) => field.type === "email")?.key;
  const to = emailKey ? String(values[emailKey] ?? "").trim() : "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "The submission has no valid email address to reply to." };
  }
  const result = await sendEmail({
    to,
    subject: `Re: ${submission.form.name}`,
    html: message.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char).replace(/\r?\n/g, "<br>"),
    text: message,
    from: settings.from || undefined,
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Could not send reply." };
  await prisma.customFormSubmission.update({
    where: { id: submission.id },
    data: { reply: message, repliedAt: new Date(), status: "REPLIED" },
  });
  await logAudit({ actorId: actor.id, action: "CUSTOM_FORM_REPLY", entity: "CustomFormSubmission", entityId: submission.id });
  revalidatePath(`/admin/custom-advance-form/${submission.formId}/submissions`);
  revalidatePath(`/admin/custom-advance-form/${submission.formId}/submissions/${submission.id}`);
  return { ok: true };
}

export async function markCustomSubmissionRead(submissionId: string): Promise<void> {
  const actor = await requireSection("general");
  const result = await prisma.customFormSubmission.updateMany({
    where: { id: submissionId, tenantId: TENANT_ID, status: "NEW" },
    data: { status: "READ" },
  });
  if (result.count) {
    await logAudit({ actorId: actor.id, action: "CUSTOM_FORM_READ", entity: "CustomFormSubmission", entityId: submissionId });
    const submission = await prisma.customFormSubmission.findFirst({
      where: { id: submissionId, tenantId: TENANT_ID },
      select: { formId: true },
    });
    if (submission) revalidatePath(`/admin/custom-advance-form/${submission.formId}/submissions`);
  }
}
