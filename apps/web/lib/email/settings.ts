/**
 * Email provider settings — stored in Tenant.theme.emailSettings (JSON), same
 * pattern as General Settings. Three transports, each optional, each with a
 * priority number; sendEmail walks enabled providers in priority order and
 * falls through on failure/quota ("No email for now" = master switch off).
 */

export type EmailProviderKey = "resend" | "brevo" | "smtp";

export type EmailProviderSettings = {
  enabled: boolean;
  /** Lower number runs first when several providers are enabled. */
  priority: number;
  /** API key (resend, brevo). */
  apiKey: string;
  /** From header. Empty = provider default. */
  from: string;
  /** SMTP-only fields. */
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

export type EmailSettings = {
  /** Master switch — false = "No email for now". */
  enabled: boolean;
  providers: Record<EmailProviderKey, EmailProviderSettings>;
};

/** provider → ISO timestamp until which sends are skipped (quota exhausted). */
export type EmailCooldowns = Partial<Record<EmailProviderKey, string>>;

export type EmailLastFailure = { at: string; error: string } | null;

const DEFAULT_PROVIDER: EmailProviderSettings = {
  enabled: false,
  priority: 1,
  apiKey: "",
  from: "",
  host: "",
  port: 465,
  secure: true,
  user: "",
  pass: "",
};

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: true,
  providers: {
    resend: { ...DEFAULT_PROVIDER, priority: 1 },
    brevo: { ...DEFAULT_PROVIDER, priority: 2 },
    smtp: { ...DEFAULT_PROVIDER, priority: 3 },
  },
};

export const EMAIL_PROVIDER_LABELS: Record<EmailProviderKey, string> = {
  resend: "Resend",
  brevo: "Brevo (ex-Sendinblue)",
  smtp: "SMTP (existing mailbox)",
};

/** Deep-merge stored JSON over the defaults so new fields always exist. */
export function normalizeEmailSettings(raw: unknown): EmailSettings {
  const stored = (raw ?? {}) as Partial<EmailSettings>;
  const providers = {} as Record<EmailProviderKey, EmailProviderSettings>;
  for (const key of ["resend", "brevo", "smtp"] as const) {
    providers[key] = {
      ...DEFAULT_PROVIDER,
      ...(stored.providers?.[key] ?? {}),
      priority: Number(stored.providers?.[key]?.priority) || DEFAULT_EMAIL_SETTINGS.providers[key].priority,
      port: Number(stored.providers?.[key]?.port) || DEFAULT_PROVIDER.port,
    };
  }
  return {
    enabled: stored.enabled !== false,
    providers,
  };
}

/** Enabled providers, lowest priority number first. */
export function enabledProviderChain(
  settings: EmailSettings,
): EmailProviderKey[] {
  return (["resend", "brevo", "smtp"] as const)
    .filter((k) => settings.providers[k].enabled)
    .sort((a, b) => settings.providers[a].priority - settings.providers[b].priority);
}

/** Is the provider cooling down after a quota hit? */
export function isOnCooldown(
  cooldowns: EmailCooldowns,
  provider: EmailProviderKey,
  now = new Date(),
): boolean {
  const until = cooldowns[provider];
  return Boolean(until && new Date(until).getTime() > now.getTime());
}
