import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeEmailSettings, type EmailSettings } from "./settings";

const h = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  tenantUpsert: vi.fn(),
  tenantUpdate: vi.fn(),
  logAudit: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock("@/modules/shared", () => ({
  prisma: {
    tenant: {
      findUnique: h.tenantFindUnique,
      upsert: h.tenantUpsert,
      update: h.tenantUpdate,
    },
  },
  TENANT_ID: "tenant-test",
}));
vi.mock("@/lib/audit", () => ({ logAudit: h.logAudit }));
vi.mock("nodemailer", () => ({
  default: { createTransport: h.createTransport },
  createTransport: h.createTransport,
}));

import { sendEmail, sendTestEmail } from "./send";

const fetchMock = vi.fn();

function settings(partial: {
  enabled?: boolean;
  providers?: Partial<Record<"resend" | "brevo" | "smtp", Partial<EmailSettings["providers"]["resend"]>>>;
}): EmailSettings {
  return normalizeEmailSettings({
    enabled: partial.enabled,
    providers: partial.providers,
  });
}

function themeWith(s: EmailSettings, extra: Record<string, unknown> = {}) {
  return { theme: { emailSettings: s, ...extra } };
}

const INPUT = { to: "client@example.com", subject: "Invoice", html: "<p>hi</p>" };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  h.tenantFindUnique.mockReset().mockResolvedValue({ theme: null });
  h.tenantUpsert.mockReset().mockResolvedValue({ theme: null });
  h.tenantUpdate.mockReset().mockResolvedValue({});
  h.logAudit.mockReset().mockResolvedValue(undefined);
  h.createTransport.mockReset().mockReturnValue({ sendMail: vi.fn().mockResolvedValue({}) });
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sendEmail — configuration states", () => {
  it("errors clearly when nothing is configured", async () => {
    const r = await sendEmail(INPUT);
    expect(r).toEqual({ ok: false, error: "Email provider not configured." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("respects the No-email-for-now master switch", async () => {
    h.tenantFindUnique.mockResolvedValue(
      themeWith(settings({ enabled: false, providers: { resend: { enabled: true, apiKey: "re_x" } } })),
    );
    const r = await sendEmail(INPUT);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/disabled/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to env RESEND_API_KEY when no provider is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_env");
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const r = await sendEmail(INPUT);
    expect(r).toEqual({ ok: true, provider: "resend" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer re_env" }) }),
    );
  });
});

describe("sendEmail — priority chain", () => {
  it("uses the single enabled provider", async () => {
    h.tenantFindUnique.mockResolvedValue(
      themeWith(settings({ providers: { brevo: { enabled: true, apiKey: "xk", from: "Rank Coterie <hi@x.com>" } } })),
    );
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const r = await sendEmail(INPUT);
    expect(r).toEqual({ ok: true, provider: "brevo" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        headers: expect.objectContaining({ "api-key": "xk" }),
      }),
    );
  });

  it("walks providers in priority order and falls through on failure", async () => {
    h.tenantFindUnique.mockResolvedValue(
      themeWith(
        settings({
          providers: {
            resend: { enabled: true, priority: 1, apiKey: "re_1" },
            brevo: { enabled: true, priority: 2, apiKey: "bk" },
          },
        }),
      ),
    );
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve("boom") })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const r = await sendEmail(INPUT);
    expect(r).toEqual({ ok: true, provider: "brevo" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.brevo.com/v3/smtp/email");
  });

  it("honours priority numbers, not provider order", async () => {
    h.tenantFindUnique.mockResolvedValue(
      themeWith(
        settings({
          providers: {
            resend: { enabled: true, priority: 5, apiKey: "re_1" },
            brevo: { enabled: true, priority: 1, apiKey: "bk" },
          },
        }),
      ),
    );
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const r = await sendEmail(INPUT);
    expect(r.provider).toBe("brevo");
  });

  it("skips providers on cooldown", async () => {
    const until = new Date(Date.now() + 60_000).toISOString();
    h.tenantFindUnique.mockResolvedValue(
      themeWith(
        settings({
          providers: {
            resend: { enabled: true, priority: 1, apiKey: "re_1" },
            brevo: { enabled: true, priority: 2, apiKey: "bk" },
          },
        }),
        { emailCooldowns: { resend: until } },
      ),
    );
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const r = await sendEmail(INPUT);
    expect(r.provider).toBe("brevo");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.brevo.com/v3/smtp/email");
  });
});

describe("sendEmail — quota handling", () => {
  it("puts a 429 provider on cooldown and falls through", async () => {
    h.tenantFindUnique.mockResolvedValue(
      themeWith(
        settings({
          providers: {
            resend: { enabled: true, priority: 1, apiKey: "re_1" },
            brevo: { enabled: true, priority: 2, apiKey: "bk" },
          },
        }),
      ),
    );
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve("daily quota") })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const r = await sendEmail(INPUT);
    expect(r).toEqual({ ok: true, provider: "brevo" });

    // Cooldown persisted for resend.
    const updateCall = h.tenantUpdate.mock.calls[0];
    expect(updateCall).toBeTruthy();
    const theme = (updateCall![0] as { data: { theme: Record<string, unknown> } }).data.theme;
    expect((theme.emailCooldowns as Record<string, string>).resend).toBeTruthy();
  });

  it("alerts when every enabled provider is out of quota", async () => {
    h.tenantFindUnique.mockResolvedValue(
      themeWith(
        settings({
          providers: {
            resend: { enabled: true, priority: 1, apiKey: "re_1" },
            brevo: { enabled: true, priority: 2, apiKey: "bk" },
          },
        }),
      ),
    );
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve("quota") });

    const r = await sendEmail(INPUT);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/quota reached on all/i);
    expect(r.error).toMatch(/Email Settings/);
    expect(h.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "EMAIL_ALERT" }),
    );
  });

  it("errors when all configured providers are already cooling down", async () => {
    const until = new Date(Date.now() + 60_000).toISOString();
    h.tenantFindUnique.mockResolvedValue(
      themeWith(
        settings({ providers: { resend: { enabled: true, apiKey: "re_1" } } }),
        { emailCooldowns: { resend: until } },
      ),
    );
    const r = await sendEmail(INPUT);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/quota cooldown/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sendEmail — SMTP transport", () => {
  it("sends via nodemailer with the stored connection settings", async () => {
    h.tenantFindUnique.mockResolvedValue(
      themeWith(
        settings({
          providers: {
            smtp: {
              enabled: true,
              priority: 1,
              host: "smtp.example.com",
              port: 587,
              secure: false,
              user: "mailer@example.com",
              pass: "secret",
              from: "Rank Coterie <billing@example.com>",
            },
          },
        }),
      ),
    );
    const sendMail = vi.fn().mockResolvedValue({});
    h.createTransport.mockReturnValue({ sendMail });

    const r = await sendEmail(INPUT);
    expect(r).toEqual({ ok: true, provider: "smtp" });
    expect(h.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: { user: "mailer@example.com", pass: "secret" },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Rank Coterie <billing@example.com>", to: "client@example.com" }),
    );
  });
});

describe("sendTestEmail", () => {
  it("validates the address and reports the delivering provider", async () => {
    expect(await sendTestEmail("nope")).toEqual({ ok: false, error: "Enter a valid email address." });
    h.tenantFindUnique.mockResolvedValue(
      themeWith(settings({ providers: { resend: { enabled: true, apiKey: "re_1" } } })),
    );
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const r = await sendTestEmail("admin@example.com");
    expect(r).toEqual({ ok: true, provider: "resend" });
  });
});
