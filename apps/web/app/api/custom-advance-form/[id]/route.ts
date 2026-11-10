import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import {
  escapeHtml,
  normalizeCustomFormFields,
  normalizeCustomFormSettings,
  validateSubmission,
} from "@/modules/custom-forms/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function renderTemplate(
  template: string,
  values: Record<string, string | boolean>,
  formName: string,
  fields: Array<{ key: string; label: string }> = [],
): string {
  const labels = new Map(fields.map((field) => [field.key, field.label]));
  return template
    .replaceAll("{{formName}}", escapeHtml(formName))
    .replaceAll("{{submission}}", Object.entries(values)
      .map(([key, value]) => `<p><strong>${escapeHtml(labels.get(key) ?? key)}</strong>: ${escapeHtml(String(value))}</p>`)
      .join(""))
    .replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (_match, key: string) =>
      escapeHtml(String(values[key] ?? "")))
    .replace(/\r?\n/g, "<br>");
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const form = await prisma.customForm.findFirst({
    where: { id, tenantId: TENANT_ID, status: "PUBLISHED" },
    select: { id: true, name: true, fields: true },
  });
  if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });
  return NextResponse.json({
    id: form.id,
    name: form.name,
    fields: normalizeCustomFormFields(form.fields),
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 256_000) {
    return NextResponse.json({ error: "Form submission is too large." }, { status: 413 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const limit = rateLimit(`customForm:${id}:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: `Too many submissions. Try again in ${limit.retryAfterSeconds}s.` }, { status: 429 });
  }

  let payload: unknown;
  try {
    const rawPayload = await request.text();
    if (rawPayload.length > 256_000) {
      return NextResponse.json({ error: "Form submission is too large." }, { status: 413 });
    }
    payload = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;
  if (typeof body.website === "string" && body.website) {
    return NextResponse.json({ ok: true });
  }

  const form = await prisma.customForm.findFirst({
    where: { id, tenantId: TENANT_ID, status: "PUBLISHED" },
  });
  if (!form) return NextResponse.json({ error: "This form is not available." }, { status: 404 });
  const fields = normalizeCustomFormFields(form.fields);
  const validated = validateSubmission(fields, body.values);
  if (!validated.data) return NextResponse.json({ error: validated.error }, { status: 400 });
  const settings = normalizeCustomFormSettings(form.settings);
  const values = validated.data;

  const submission = await prisma.$transaction(async (tx) => {
    let leadId: string | null = null;
    if (settings.createLead) {
      const readMappedValue = (key?: string) => key ? String(values[key] ?? "").trim() : "";
      const email = readMappedValue(settings.leadFields.email).toLowerCase();
      const firstName = readMappedValue(settings.leadFields.firstName);
      const lastName = readMappedValue(settings.leadFields.lastName);
      const phone = readMappedValue(settings.leadFields.phone);
      const message = readMappedValue(settings.leadFields.message);
      const existing = email
        ? await tx.lead.findFirst({ where: { tenantId: TENANT_ID, email }, orderBy: { createdAt: "desc" } })
        : null;
      const existingIntake = existing?.intake && typeof existing.intake === "object" && !Array.isArray(existing.intake)
        ? existing.intake as Record<string, Prisma.JsonValue>
        : {};
      const intake = {
        ...existingIntake,
        source: "custom-form",
        customFormId: form.id,
        customFormName: form.name,
        customFormData: values,
      } as Prisma.InputJsonValue;
      const lead = existing
        ? await tx.lead.update({
          where: { id: existing.id },
          data: {
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
            phones: phone ? [{ number: phone, kind: "unknown" }] : existing.phones as Prisma.InputJsonValue,
            intake,
          },
        })
        : await tx.lead.create({
          data: {
            tenantId: TENANT_ID,
            firstName: firstName || null,
            lastName: lastName || null,
            email: email || null,
            phones: phone ? [{ number: phone, kind: "unknown" }] : [],
            status: "NEW",
            disposition: "NEW_INQUIRY",
            initialDisposition: "NEW_INQUIRY",
            statusDate: new Date(),
            intake,
          },
        });
      leadId = lead.id;
      if (message) {
        await tx.leadNote.create({
          data: { leadId: lead.id, note: `Custom form "${form.name}": ${message}` },
        });
      }
    }

    return tx.customFormSubmission.create({
      data: {
        tenantId: TENANT_ID,
        formId: form.id,
        data: values as Prisma.InputJsonValue,
        leadId,
      },
    });
  });

  const errors: string[] = [];
  const notifyBody = renderTemplate(settings.body, values, form.name, fields);
  const replyToKey = settings.leadFields.email || fields.find((field) => field.type === "email")?.key;
  for (const to of settings.notifyTo) {
    const result = await sendEmail({
      to,
      subject: renderTemplate(settings.subject, values, form.name, fields).replace(/<[^>]*>/g, ""),
      html: notifyBody,
      from: settings.from || undefined,
      replyTo: replyToKey ? String(values[replyToKey] ?? "") || undefined : undefined,
    });
    if (!result.ok) errors.push(`Notification to ${to}: ${result.error ?? "send failed"}`);
  }

  if (settings.confirmationEnabled && settings.confirmationEmailField) {
    const to = String(values[settings.confirmationEmailField] ?? "");
    if (to) {
      const result = await sendEmail({
        to,
        subject: renderTemplate(settings.confirmationSubject, values, form.name, fields).replace(/<[^>]*>/g, ""),
        html: renderTemplate(settings.confirmationBody, values, form.name, fields),
        from: settings.from || undefined,
      });
      if (!result.ok) errors.push(`Confirmation email to submitter: ${result.error ?? "send failed"}`);
    }
  }

  if (errors.length) {
    await prisma.customFormSubmission.update({
      where: { id: submission.id },
      data: { notificationError: errors.join("\n").slice(0, 2000) },
    });
    console.error(`[custom-form] Email delivery failed for submission ${submission.id}:`, errors);
  }
  return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
}
