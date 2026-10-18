/**
 * Transactional email sending — multi-provider with priority fallback.
 *
 * Providers (Admin → System Tools → Email Settings, stored in
 * Tenant.theme.emailSettings): Resend, Brevo, SMTP. Enable any combination;
 * when several are enabled they are tried in priority order (lowest number
 * first). A provider that hits its daily/monthly quota (HTTP 429) is put on a
 * 24h cooldown (persisted) and the next provider takes over. If every enabled
 * provider fails the send errors loudly and an EMAIL_ALERT audit row + a
 * last-failure record (shown on the settings page) tell the admin to add or
 * fix a provider.
 *
 * Legacy/env path: when no provider is configured in settings but
 * RESEND_API_KEY is set, the old env-only Resend behaviour still applies.
 */

import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import {
  DEFAULT_EMAIL_SETTINGS,
  EMAIL_PROVIDER_LABELS,
  enabledProviderChain,
  isOnCooldown,
  normalizeEmailSettings,
  type EmailCooldowns,
  type EmailLastFailure,
  type EmailProviderKey,
  type EmailProviderSettings,
  type EmailSettings,
} from "./settings";

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  ok: boolean;
  error?: string;
  /** Which transport actually delivered the message. */
  provider?: EmailProviderKey;
};

type TransportResult = { ok: true } | { ok: false; error: string; quota?: boolean };

const QUOTA_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ config */

type EmailRuntimeConfig = {
  settings: EmailSettings;
  cooldowns: EmailCooldowns;
  lastFailure: EmailLastFailure;
};

export async function loadEmailRuntime(): Promise<EmailRuntimeConfig> {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
    const theme = (tenant?.theme ?? {}) as Record<string, unknown>;
    return {
      settings: normalizeEmailSettings(theme.emailSettings),
      cooldowns: (theme.emailCooldowns as EmailCooldowns | undefined) ?? {},
      lastFailure: (theme.emailLastFailure as EmailLastFailure | undefined) ?? null,
    };
  } catch {
    // Settings table unreachable → behave like unconfigured.
    return {
      settings: normalizeEmailSettings(null),
      cooldowns: {},
      lastFailure: null,
    };
  }
}

async function patchTheme(data: Record<string, unknown>): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: "Canopy", domainKey: "canopy.local" },
  });
  const theme = { ...((tenant.theme ?? {}) as Record<string, unknown>), ...data };
  await prisma.tenant.update({
    where: { id: TENANT_ID },
    data: { theme: theme as Prisma.InputJsonValue },
  });
}

/** Persist a quota cooldown so the exhausted provider is skipped until reset. */
async function markQuotaCooldown(provider: EmailProviderKey): Promise<void> {
  try {
    const until = new Date(Date.now() + QUOTA_COOLDOWN_MS).toISOString();
    const { cooldowns } = await loadEmailRuntime();
    await patchTheme({ emailCooldowns: { ...cooldowns, [provider]: until } });
  } catch (e) {
    console.warn(`[email] could not persist cooldown for ${provider}:`, e);
  }
}

/** Every enabled provider failed — alert the admin (audit + settings banner). */
async function recordTotalFailure(error: string): Promise<void> {
  try {
    const at = new Date().toISOString();
    await patchTheme({ emailLastFailure: { at, error } });
    await logAudit({
      action: "EMAIL_ALERT",
      entity: "Email",
      entityId: "email",
      reason: error,
    });
  } catch (e) {
    console.warn("[email] could not record failure alert:", e);
  }
}

/* -------------------------------------------------------------- transports */

export function parseFrom(from: string): { email: string; name?: string } | null {
  const m = from.match(/^\s*(?:(.+?)\s*)?<([^>]+)>\s*$/) ?? from.match(/^\s*([^<\s]+@[^<\s]+)\s*$/);
  if (!m) return null;
  const email = m[2] ?? m[1];
  const name = m[2] ? (m[1] || undefined) : undefined;
  return { email, name };
}

async function tryResend(cfg: EmailProviderSettings, input: EmailInput): Promise<TransportResult> {
  if (!cfg.apiKey) return { ok: false, error: "no API key" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: cfg.from || "Canopy <onboarding@resend.dev>",
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const quota = res.status === 429 || /quota|limit/i.test(body);
      return { ok: false, error: `(${res.status}) ${body.slice(0, 200)}`, quota };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

async function tryBrevo(cfg: EmailProviderSettings, input: EmailInput): Promise<TransportResult> {
  if (!cfg.apiKey) return { ok: false, error: "no API key" };
  const parsed = cfg.from ? parseFrom(cfg.from) : null;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": cfg.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: parsed ? { email: parsed.email, name: parsed.name ?? "Canopy" } : undefined,
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const quota = res.status === 429 || /quota|limit|daily/i.test(body);
      return { ok: false, error: `(${res.status}) ${body.slice(0, 200)}`, quota };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

async function trySmtp(cfg: EmailProviderSettings, input: EmailInput): Promise<TransportResult> {
  if (!cfg.host || !cfg.user) return { ok: false, error: "SMTP host/user not set" };
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: Number(cfg.port) || 465,
      secure: cfg.secure !== false,
      auth: cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    await transport.sendMail({
      from: cfg.from || cfg.user,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

async function sendVia(
  provider: EmailProviderKey,
  cfg: EmailProviderSettings,
  input: EmailInput,
): Promise<TransportResult> {
  switch (provider) {
    case "resend":
      return tryResend(cfg, input);
    case "brevo":
      return tryBrevo(cfg, input);
    case "smtp":
      return trySmtp(cfg, input);
  }
}

/* ------------------------------------------------------------------- entry */

export async function sendEmail(input: EmailInput): Promise<SendEmailResult> {
  const { settings, cooldowns } = await loadEmailRuntime();

  if (!settings.enabled) {
    return { ok: false, error: "Email sending is disabled (No email for now)." };
  }

  const configured = enabledProviderChain(settings);
  if (configured.length === 0) {
    // Legacy env path: RESEND_API_KEY alone still works.
    if (process.env.RESEND_API_KEY) {
      const r = await tryResend(
        {
          ...DEFAULT_EMAIL_SETTINGS.providers.resend,
          apiKey: process.env.RESEND_API_KEY,
          from: process.env.EMAIL_FROM ?? "Canopy <onboarding@resend.dev>",
        },
        input,
      );
      if (r.ok) return { ok: true, provider: "resend" };
      const quota = "quota" in r && r.quota;
      const error = `Email send failed via resend: ${r.error}`;
      if (quota) await recordTotalFailure(error);
      return { ok: false, error };
    }
    return { ok: false, error: "Email provider not configured." };
  }

  const chain = configured.filter((p) => !isOnCooldown(cooldowns, p));
  if (chain.length === 0) {
    const cooling = configured.map((p) => EMAIL_PROVIDER_LABELS[p]).join(", ");
    const error = `All email providers are on quota cooldown (${cooling}). Enable or fix another provider (e.g. SMTP) in Admin → Email Settings.`;
    await recordTotalFailure(error);
    return { ok: false, error };
  }

  const failures: string[] = [];
  let quotaHit = false;

  for (const provider of chain) {
    const cfg = settings.providers[provider];
    const label = EMAIL_PROVIDER_LABELS[provider];
    const result = await sendVia(provider, cfg, input);
    if (result.ok) return { ok: true, provider };
    if (result.quota) {
      quotaHit = true;
      await markQuotaCooldown(provider);
      failures.push(`${label}: quota reached (${result.error})`);
    } else {
      failures.push(`${label}: ${result.error}`);
    }
  }

  const error = quotaHit
    ? `Email quota reached on all available providers — ${failures.join("; ")}. Configure another provider (e.g. SMTP) in Admin → Email Settings.`
    : `Could not send email — ${failures.join("; ")}.`;
  await recordTotalFailure(error);
  return { ok: false, error };
}

/** Test-send helper used by Admin → Email Settings ("Send test email"). */
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  const email = String(to ?? "").trim();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return sendEmail({
    to: email,
    subject: "Canopy test email",
    html: "<p>This is a test email from Canopy. If you received it, your provider chain works.</p>",
    text: "This is a test email from Canopy. If you received it, your provider chain works.",
  });
}
