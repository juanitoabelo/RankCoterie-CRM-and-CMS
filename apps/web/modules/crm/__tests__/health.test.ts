import { afterEach, describe, expect, it, vi } from "vitest";
import {
  evaluateCrmHealthAlerts,
  type CrmHealth,
  type CrmHealthAlert,
} from "../health";

const NOW = new Date("2026-11-19T12:00:00.000Z");
const MINUTE = 60_000;

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * MINUTE);
}

const healthy: CrmHealth = {
  status: "ok",
  checkedAt: NOW,
  counts: {
    leads: 1,
    clients: 1,
    deals: 1,
    openTasks: 0,
    unreadNotifications: 0,
    attachments: 0,
    mailConnections: 1,
  },
  config: {
    attachmentStorage: "vercel-blob",
    tokenEncryption: true,
    reminderAuth: true,
    syncAuth: true,
    cronSecret: true,
    googleOAuth: true,
    microsoftOAuth: true,
    ownedRecordsOnly: true,
  },
  lastSyncAt: minutesAgo(5),
  lastReminderAt: minutesAgo(5),
  lastAuditAt: minutesAgo(5),
  syncErrors: [],
  warnings: [],
  alerts: [],
};

function withHealth(patch: Partial<CrmHealth>): CrmHealth {
  return { ...healthy, ...patch };
}

function findAlert(alerts: CrmHealthAlert[], id: string): CrmHealthAlert | undefined {
  return alerts.find((alert) => alert.id === id);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("evaluateCrmHealthAlerts", () => {
  it("returns no alerts for a healthy production snapshot", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(evaluateCrmHealthAlerts(healthy, NOW)).toEqual([]);
  });

  it("never emits a sync alert when there are no active mail connections", () => {
    const alerts = evaluateCrmHealthAlerts(
      withHealth({ counts: { ...healthy.counts, mailConnections: 0 }, lastSyncAt: null }),
      NOW,
    );
    expect(findAlert(alerts, "crm.sync.stale")).toBeUndefined();
  });

  it("warns at 45 minutes and errors at 120 minutes for stale sync", () => {
    const at44 = evaluateCrmHealthAlerts(withHealth({ lastSyncAt: minutesAgo(44) }), NOW);
    expect(findAlert(at44, "crm.sync.stale")).toBeUndefined();

    const at45 = evaluateCrmHealthAlerts(withHealth({ lastSyncAt: minutesAgo(45) }), NOW);
    expect(findAlert(at45, "crm.sync.stale")?.level).toBe("warning");

    const at119 = evaluateCrmHealthAlerts(withHealth({ lastSyncAt: minutesAgo(119) }), NOW);
    expect(findAlert(at119, "crm.sync.stale")?.level).toBe("warning");

    const at120 = evaluateCrmHealthAlerts(withHealth({ lastSyncAt: minutesAgo(120) }), NOW);
    expect(findAlert(at120, "crm.sync.stale")?.level).toBe("error");
    expect(findAlert(at120, "crm.sync.stale")?.details).toContain("120");

    const never = evaluateCrmHealthAlerts(withHealth({ lastSyncAt: null }), NOW);
    expect(findAlert(never, "crm.sync.stale")?.level).toBe("error");
  });

  it("warns at 120 minutes and errors at 360 minutes for stale reminders", () => {
    const at119 = evaluateCrmHealthAlerts(withHealth({ lastReminderAt: minutesAgo(119) }), NOW);
    expect(findAlert(at119, "crm.reminders.stale")).toBeUndefined();

    const at120 = evaluateCrmHealthAlerts(withHealth({ lastReminderAt: minutesAgo(120) }), NOW);
    expect(findAlert(at120, "crm.reminders.stale")?.level).toBe("warning");

    const at359 = evaluateCrmHealthAlerts(withHealth({ lastReminderAt: minutesAgo(359) }), NOW);
    expect(findAlert(at359, "crm.reminders.stale")?.level).toBe("warning");

    const at360 = evaluateCrmHealthAlerts(withHealth({ lastReminderAt: minutesAgo(360) }), NOW);
    expect(findAlert(at360, "crm.reminders.stale")?.level).toBe("error");
    expect(findAlert(at360, "crm.reminders.stale")?.details).toContain("360");

    const never = evaluateCrmHealthAlerts(withHealth({ lastReminderAt: null }), NOW);
    expect(findAlert(never, "crm.reminders.stale")?.level).toBe("error");
  });

  it("escalates sync errors from warning to error at three connections", () => {
    const one = evaluateCrmHealthAlerts(
      withHealth({
        syncErrors: [{ provider: "google", email: "ops@example.test", error: "invalid_grant" }],
      }),
      NOW,
    );
    expect(findAlert(one, "crm.sync.errors")?.level).toBe("warning");
    expect(findAlert(one, "crm.sync.errors")?.details).toContain("google");
    expect(findAlert(one, "crm.sync.errors")?.details).toContain("invalid_grant");

    const two = evaluateCrmHealthAlerts(
      withHealth({
        syncErrors: [
          { provider: "google", email: "a@example.test", error: "e1" },
          { provider: "microsoft", email: "b@example.test", error: "e2" },
        ],
      }),
      NOW,
    );
    expect(findAlert(two, "crm.sync.errors")?.level).toBe("warning");

    const three = evaluateCrmHealthAlerts(
      withHealth({
        syncErrors: [
          { provider: "google", email: "a@example.test", error: "e1" },
          { provider: "microsoft", email: "b@example.test", error: "e2" },
          { provider: "google", email: "c@example.test", error: "e3" },
        ],
      }),
      NOW,
    );
    expect(findAlert(three, "crm.sync.errors")?.level).toBe("error");
    expect(findAlert(three, "crm.sync.errors")?.details).toContain("3");
  });

  it("emits one stable warning alert per configuration warning", () => {
    const warnings = ["Example env var is missing.", "Another env var is missing."];
    const alerts = evaluateCrmHealthAlerts(withHealth({ warnings }), NOW);
    const configAlerts = alerts.filter((alert) => alert.id.startsWith("crm.config."));

    expect(configAlerts).toHaveLength(2);
    expect(configAlerts.map((alert) => alert.id)).toEqual(["crm.config.0", "crm.config.1"]);
    expect(configAlerts.every((alert) => alert.level === "warning")).toBe(true);
    expect(configAlerts.map((alert) => alert.details)).toEqual(warnings);
  });

  it("errors when production attachment storage falls back to the database", () => {
    const database: CrmHealth = {
      ...healthy,
      config: { ...healthy.config, attachmentStorage: "database" },
    };

    vi.stubEnv("NODE_ENV", "production");
    const productionAlerts = evaluateCrmHealthAlerts(database, NOW);
    expect(findAlert(productionAlerts, "crm.storage.database")?.level).toBe("error");

    vi.stubEnv("NODE_ENV", "test");
    const testAlerts = evaluateCrmHealthAlerts(database, NOW);
    expect(findAlert(testAlerts, "crm.storage.database")).toBeUndefined();
  });

  it("is deterministic, does not mutate its input, and honours the injected clock", () => {
    vi.stubEnv("NODE_ENV", "test");
    const degraded = withHealth({
      lastSyncAt: minutesAgo(130),
      lastReminderAt: minutesAgo(400),
      warnings: ["Example warning."],
      syncErrors: [{ provider: "google", email: "a@example.test", error: "e1" }],
    });
    const before = JSON.stringify(degraded);

    const first = evaluateCrmHealthAlerts(degraded, NOW);
    const second = evaluateCrmHealthAlerts(degraded, NOW);

    expect(second).toEqual(first);
    expect(second.map((alert) => alert.id)).toEqual(first.map((alert) => alert.id));
    expect(JSON.stringify(degraded)).toBe(before);
    for (const alert of first) {
      expect(alert.id.length).toBeGreaterThan(0);
      expect(["warning", "error"]).toContain(alert.level);
      expect(alert.title.length).toBeGreaterThan(0);
      expect(alert.details.length).toBeGreaterThan(0);
    }

    const earlier = evaluateCrmHealthAlerts(degraded, minutesAgo(30));
    expect(findAlert(earlier, "crm.sync.stale")?.level).toBe("warning");
    expect(findAlert(first, "crm.sync.stale")?.level).toBe("error");
  });
});
