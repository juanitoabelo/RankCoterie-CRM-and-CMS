/**
 * Email Settings (Admin) — types re-exported from the lib source of truth.
 */
export {
  DEFAULT_EMAIL_SETTINGS,
  EMAIL_PROVIDER_LABELS,
  normalizeEmailSettings,
  type EmailCooldowns,
  type EmailLastFailure,
  type EmailProviderKey,
  type EmailProviderSettings,
  type EmailSettings,
} from "@/lib/email/settings";

export type EmailActionResult = { ok: boolean; error?: string };

export type TestEmailResult = {
  ok: boolean;
  error?: string;
  provider?: string;
};

export type EmailStatus = {
  settings: import("@/lib/email/settings").EmailSettings;
  cooldowns: import("@/lib/email/settings").EmailCooldowns;
  lastFailure: import("@/lib/email/settings").EmailLastFailure;
  /** Server-side snapshot used for cooldown display. */
  now: number;
};
