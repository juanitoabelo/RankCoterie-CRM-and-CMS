"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { sendTestEmail as sendTest } from "@/lib/email/send";
import {
  EMAIL_TEMPLATES,
  TEMPLATE_KEYS,
  isDefaultTemplate,
  isTemplateKey,
  normalizeTemplate,
  type EmailTemplate,
  type TemplateKey,
} from "@/lib/email/template-registry";
import {
  EMAIL_PROVIDER_LABELS,
  normalizeEmailSettings,
  type EmailProviderKey,
  type EmailSettings,
} from "@/lib/email/settings";
import type { EmailActionResult, EmailStatus, TestEmailResult } from "./types";

/** Read the tenant's email provider settings + delivery status. */
export async function getEmailStatus(): Promise<EmailStatus> {
  await requireSection("general");
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as Record<string, unknown>;
  return {
    settings: normalizeEmailSettings(theme.emailSettings),
    cooldowns: (theme.emailCooldowns as EmailStatus["cooldowns"] | undefined) ?? {},
    lastFailure: (theme.emailLastFailure as EmailStatus["lastFailure"] | undefined) ?? null,
    now: Date.now(),
  };
}

/** Save email provider settings (never touches cooldowns/last-failure). */
export async function saveEmailSettings(formData: FormData): Promise<EmailActionResult> {
  const actor = await requireSection("general");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const bool = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";
  const int = (k: string, fallback: number) => {
    const n = Number(str(k));
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
  };

  const providers = {} as EmailSettings["providers"];
  const keys: EmailProviderKey[] = ["resend", "brevo", "smtp"];
  for (const key of keys) {
    const defaults = normalizeEmailSettings(null).providers[key];
    providers[key] = {
      enabled: bool(`${key}_enabled`),
      priority: int(`${key}_priority`, defaults.priority),
      apiKey: str(`${key}_apiKey`),
      from: str(`${key}_from`),
      host: str(`${key}_host`),
      port: int(`${key}_port`, defaults.port),
      secure: bool(`${key}_secure`),
      user: str(`${key}_user`),
      pass: str(`${key}_pass`),
    };
  }
  const settings: EmailSettings = {
    enabled: bool("email_enabled"),
    providers,
  };

  try {
    const tenant = await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: "Rank Coterie", domainKey: "canopy.local" },
    });
    const theme = { ...((tenant.theme ?? {}) as Record<string, unknown>), emailSettings: settings };
    await prisma.tenant.update({ where: { id: TENANT_ID }, data: { theme } });

    const active = keys
      .filter((k) => providers[k].enabled)
      .map((k) => `${EMAIL_PROVIDER_LABELS[k]} (p${providers[k].priority})`);
    await logAudit({
      actorId: actor.id,
      action: "EMAIL_SETTINGS",
      entity: "Email",
      entityId: "email",
      reason: settings.enabled
        ? `Email sending enabled — chain: ${active.length ? active.join(" → ") : "none"}`
        : "Email sending disabled (No email for now)",
    });

    revalidatePath("/admin/email-settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save email settings." };
  }
}

/** Send a test message through the live provider chain. */
export async function sendTestEmailAction(to: string): Promise<TestEmailResult> {
  await requireSection("general");
  const email = String(to ?? "").trim();
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  const result = await sendTest(email);
  return { ok: result.ok, error: result.error, provider: result.provider };
}

/* --------------------------------------------------------- email templates */

async function readTheme(): Promise<Record<string, unknown>> {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  return ((tenant?.theme ?? {}) as Record<string, unknown>) ?? {};
}

async function writeThemePatch(patch: Record<string, unknown>): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: "Rank Coterie", domainKey: "canopy.local" },
  });
  const theme = { ...((tenant.theme ?? {}) as Record<string, unknown>), ...patch };
  await prisma.tenant.update({
    where: { id: TENANT_ID },
    data: { theme: theme as Prisma.InputJsonValue },
  });
}

export type EmailTemplateSnapshot = {
  key: TemplateKey;
  label: string;
  description: string;
  placeholders: readonly string[];
  template: EmailTemplate;
  isDefault: boolean;
};

/** Read every templated email (stored version + default status). */
export async function getEmailTemplates(): Promise<Record<TemplateKey, EmailTemplateSnapshot>> {
  await requireSection("general");
  const theme = await readTheme();
  const stored = (theme.emailTemplates ?? {}) as Record<string, unknown>;
  const out = {} as Record<TemplateKey, EmailTemplateSnapshot>;
  for (const key of TEMPLATE_KEYS) {
    const meta = EMAIL_TEMPLATES[key];
    const template = normalizeTemplate(stored[key], meta.defaultTemplate);
    out[key] = {
      key,
      label: meta.label,
      description: meta.description,
      placeholders: meta.placeholders,
      template,
      isDefault: isDefaultTemplate(stored[key], meta.defaultTemplate),
    };
  }
  return out;
}

/** Save a custom template (subject + body with placeholders). */
export async function saveEmailTemplate(formData: FormData): Promise<EmailActionResult> {
  const actor = await requireSection("general");
  const key = String(formData.get("templateKey") ?? "").trim();
  if (!isTemplateKey(key)) return { ok: false, error: "Unknown email template." };
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject) return { ok: false, error: "Subject cannot be empty." };
  if (!body) return { ok: false, error: "Message body cannot be empty." };

  try {
    const theme = await readTheme();
    const templates = {
      ...((theme.emailTemplates ?? {}) as Record<string, unknown>),
      [key]: { subject, body },
    };
    await writeThemePatch({ emailTemplates: templates });
    await logAudit({
      actorId: actor.id,
      action: "EMAIL_SETTINGS",
      entity: "Email",
      entityId: `template:${key}`,
      reason: `${EMAIL_TEMPLATES[key].label} template updated`,
    });
    revalidatePath("/admin/email-settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save template." };
  }
}

/** Revert a template to the built-in default. */
export async function resetEmailTemplate(templateKey: string): Promise<EmailActionResult> {
  const actor = await requireSection("general");
  const key = String(templateKey ?? "").trim();
  if (!isTemplateKey(key)) return { ok: false, error: "Unknown email template." };
  try {
    const theme = await readTheme();
    const templates = { ...((theme.emailTemplates ?? {}) as Record<string, unknown>) };
    delete templates[key];
    await writeThemePatch({
      emailTemplates: Object.keys(templates).length ? templates : Prisma.JsonNull,
    });
    await logAudit({
      actorId: actor.id,
      action: "EMAIL_SETTINGS",
      entity: "Email",
      entityId: `template:${key}`,
      reason: `${EMAIL_TEMPLATES[key].label} template reset to default`,
    });
    revalidatePath("/admin/email-settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reset template." };
  }
}
