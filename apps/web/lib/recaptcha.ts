import { prisma, TENANT_ID } from "@/modules/shared";

export interface RecaptchaConfig {
  enabled: boolean;
  siteKey: string;
  secretKey: string;
  minScore: number;
}

const RECAPTCHA_FIELDS = {
  recaptchaEnabled: false,
  recaptchaSiteKey: "",
  recaptchaSecretKey: "",
  recaptchaMinScore: 0.5,
} as const;

type GeneralSettingsWithRecaptcha = Partial<{
  recaptchaEnabled: boolean;
  recaptchaSiteKey: string;
  recaptchaSecretKey: string;
  recaptchaMinScore: number;
}>;

/** Read the reCAPTCHA v3 config stored under the tenant's general settings. */
export async function getRecaptchaConfig(): Promise<RecaptchaConfig> {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as { generalSettings?: GeneralSettingsWithRecaptcha };
  const g = theme.generalSettings ?? {};
  return {
    enabled: Boolean(g.recaptchaEnabled ?? RECAPTCHA_FIELDS.recaptchaEnabled),
    siteKey: String(g.recaptchaSiteKey ?? ""),
    secretKey: String(g.recaptchaSecretKey ?? ""),
    minScore: typeof g.recaptchaMinScore === "number" ? g.recaptchaMinScore : RECAPTCHA_FIELDS.recaptchaMinScore,
  };
}

/** True only when reCAPTCHA is switched on AND a secret key is present. */
export function isRecaptchaActive(config: RecaptchaConfig): boolean {
  return config.enabled && config.secretKey.trim().length > 0;
}

export interface RecaptchaResult {
  ok: boolean;
  score?: number;
  reason?: string;
}

/**
 * Verify a reCAPTCHA v3 token against Google's siteverify endpoint.
 * When reCAPTCHA is not configured the check is a no-op that allows the request,
 * so enabling it is fully reversible.
 */
export async function verifyRecaptchaToken(
  token: string,
  ip: string,
  config?: RecaptchaConfig,
): Promise<RecaptchaResult> {
  const cfg = config ?? (await getRecaptchaConfig());
  if (!isRecaptchaActive(cfg)) return { ok: true };
  if (!token) return { ok: false, reason: "missing-token" };

  try {
    const body = new URLSearchParams({ secret: cfg.secretKey, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success: boolean;
      score?: number;
      "error-codes"?: string[];
    };
    if (!json.success) {
      return { ok: false, reason: (json["error-codes"] ?? []).join(",") || "verification-failed" };
    }
    if (typeof json.score === "number" && json.score < cfg.minScore) {
      return { ok: false, score: json.score, reason: "low-score" };
    }
    return { ok: true, score: json.score };
  } catch {
    return { ok: false, reason: "verify-error" };
  }
}
