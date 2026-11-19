import { beforeEach, describe, expect, it } from "vitest";
import {
  buildClickTrackingUrl,
  buildOpenPixelUrl,
  buildUnsubscribeUrl,
  emailEventKey,
  normalizeEmail,
  prepareTrackedEmail,
  signClickTarget,
  summarizeEmailEvents,
  verifyClickTarget,
  type EmailEventRecord,
  type EmailEngagementSummary,
} from "../email-tracking";

const TOKEN = "tracking-token-123";

const emptySummary: EmailEngagementSummary = {
  sentAt: null,
  deliveredAt: null,
  openCount: 0,
  firstOpenedAt: null,
  lastOpenedAt: null,
  clickCount: 0,
  firstClickedAt: null,
  lastClickedAt: null,
  bouncedAt: null,
  bounceType: null,
  bounceReason: null,
  unsubscribedAt: null,
  failedAt: null,
  failureCode: null,
  status: null,
};

beforeEach(() => {
  process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough";
  process.env.SITE_URL = "https://crm.example.com";
  delete process.env.CRM_TOKEN_ENCRYPTION_KEY;
});

describe("click target signing", () => {
  it("verifies a correctly signed http(s) target", () => {
    const target = "https://example.com/pricing?plan=pro&ref=email";
    const url = new URL(buildClickTrackingUrl(TOKEN, target));
    expect(verifyClickTarget(url.searchParams.get("target"), url.searchParams.get("sig"), TOKEN)).toBe(
      target,
    );
  });

  it("rejects unsigned, tampered and wrong-token signatures", () => {
    const target = "https://example.com/pricing";
    const url = new URL(buildClickTrackingUrl(TOKEN, target));
    const sig = url.searchParams.get("sig");
    expect(verifyClickTarget(target, sig, TOKEN)).toBe(target);
    expect(verifyClickTarget(target, null, TOKEN)).toBeNull();
    expect(verifyClickTarget(target, "deadbeef", TOKEN)).toBeNull();
    expect(verifyClickTarget(`${target}#tampered`, sig, TOKEN)).toBeNull();
    expect(verifyClickTarget(target, sig, "another-token")).toBeNull();
  });

  it("never allows an open redirect to a non-http(s) target", () => {
    for (const target of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "//evil.example/path",
      "ftp://example.com/file",
      "/admin/crm",
    ]) {
      expect(verifyClickTarget(target, signClickTarget(target, TOKEN), TOKEN)).toBeNull();
    }
    expect(
      verifyClickTarget("http://example.com/ok", signClickTarget("http://example.com/ok", TOKEN), TOKEN),
    ).toBe("http://example.com/ok");
  });
});

describe("tracked email preparation", () => {
  it("rewrites only safe http(s) links and leaves mailto, tel and unsubscribe links alone", () => {
    const unsubscribeUrl = buildUnsubscribeUrl(TOKEN);
    const html = [
      '<p><a href="https://example.com/offer">Offer</a>',
      '<a href="mailto:hello@example.com">Mail</a>',
      '<a href="tel:+15551234">Call</a>',
      `<a href="${unsubscribeUrl}">Unsubscribe</a></p>`,
    ].join(" ");
    const result = prepareTrackedEmail({ body: "text", htmlBody: html, token: TOKEN });

    expect(result.htmlBody).toContain(buildClickTrackingUrl(TOKEN, "https://example.com/offer"));
    expect(result.htmlBody).toContain('href="mailto:hello@example.com"');
    expect(result.htmlBody).toContain('href="tel:+15551234"');
    expect(result.htmlBody).toContain(`href="${unsubscribeUrl}"`);
    expect(result.htmlBody.indexOf(buildUnsubscribeUrl(TOKEN))).toBeGreaterThan(-1);
  });

  it("generates HTML from text and injects the 1x1 open pixel and footer", () => {
    const result = prepareTrackedEmail({ body: "Hello\nWorld", token: TOKEN });
    expect(result.htmlBody).toContain("Hello<br />World");
    expect(result.htmlBody).toContain(`src="${buildOpenPixelUrl(TOKEN)}"`);
    expect(result.htmlBody).toContain('width="1"');
    expect(result.htmlBody).toContain('height="1"');
    expect(result.htmlBody).toContain(buildUnsubscribeUrl(TOKEN));
  });
});

describe("suppression and event summaries", () => {
  it("normalizes email addresses for suppression keys", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM  ")).toBe("jane.doe@example.com");
    expect(normalizeEmail("<John@EXAMPLE.com>")).toBe("john@example.com");
  });

  it("deduplicates equal events and applies summary fields once", () => {
    const occurredAt = new Date("2026-01-01T12:00:00.000Z");
    const open: EmailEventRecord = {
      type: "OPEN",
      occurredAt,
      recipient: "jane@example.com",
      providerEventId: "provider-open-1",
    };
    const click: EmailEventRecord = {
      type: "CLICK",
      occurredAt: new Date(occurredAt.getTime() + 1000),
      recipient: "jane@example.com",
      url: "https://example.com/offer",
    };
    expect(emailEventKey(open)).toBe(emailEventKey({ ...open }));
    expect(emailEventKey(open)).not.toBe(emailEventKey(click));

    const summary = summarizeEmailEvents([open, { ...open }, click], emptySummary);
    expect(summary.openCount).toBe(1);
    expect(summary.firstOpenedAt?.toISOString()).toBe(occurredAt.toISOString());
    expect(summary.lastOpenedAt?.toISOString()).toBe(occurredAt.toISOString());
    expect(summary.clickCount).toBe(1);
    expect(summary.firstClickedAt?.toISOString()).toBe(click.occurredAt.toISOString());

    const bounce: EmailEventRecord = {
      type: "BOUNCE",
      occurredAt,
      recipient: "jane@example.com",
      bounceType: "hard",
      bounceReason: "mailbox does not exist",
    };
    const unsubscribe: EmailEventRecord = { type: "UNSUBSCRIBE", occurredAt, recipient: "jane@example.com" };
    const failure: EmailEventRecord = {
      type: "FAILURE",
      occurredAt,
      recipient: "jane@example.com",
      failureCode: "SMTP_550",
    };
    const final = summarizeEmailEvents([open, bounce, unsubscribe, failure], summary);
    expect(final.openCount).toBe(1);
    expect(final.bouncedAt?.toISOString()).toBe(occurredAt.toISOString());
    expect(final.bounceType).toBe("hard");
    expect(final.unsubscribedAt?.toISOString()).toBe(occurredAt.toISOString());
    expect(final.failedAt?.toISOString()).toBe(occurredAt.toISOString());
    expect(final.failureCode).toBe("SMTP_550");
    expect(final.status).toBe("FAILED");
  });
});
