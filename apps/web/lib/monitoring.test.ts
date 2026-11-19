import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportCrmIssue } from "./monitoring";

const WEBHOOK = "https://alerts.example.test/crm-hook";

function parsedWarnings(warn: ReturnType<typeof vi.spyOn>) {
  return warn.mock.calls
    .map((call) => {
      try {
        return JSON.parse(String(call[0])) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((record): record is Record<string, unknown> => record?.context === "crm.alert.webhook");
}

describe("reportCrmIssue webhook delivery", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("CRM_ALERT_WEBHOOK_URL", WEBHOOK);
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("posts the alert with a five-second abort signal", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    reportCrmIssue("error", "crm.test", new Error("boom"), { connection: "google" });

    expect(timeoutSpy).toHaveBeenCalledWith(5000);
    expect(error).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(String(error.mock.calls[0][0]));
    expect(logged).toMatchObject({
      level: "error",
      service: "canopy-crm",
      context: "crm.test",
      message: "boom",
      meta: { connection: "google" },
    });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(WEBHOOK);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toMatchObject({
      text: "[Canopy CRM] crm.test: boom",
      level: "error",
      context: "crm.test",
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("logs a warning once when the webhook replies with a non-ok status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    reportCrmIssue("warning", "crm.test", "degraded");

    await vi.waitFor(() => expect(parsedWarnings(warn)).toHaveLength(1));
    expect(parsedWarnings(warn)[0].message).toContain("503");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("logs a warning once when delivery throws and never recurses", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    reportCrmIssue("error", "crm.test", "primary failure");

    await vi.waitFor(() => expect(parsedWarnings(warn)).toHaveLength(1));
    expect(parsedWarnings(warn)[0].message).toContain("network down");
    expect(parsedWarnings(warn)[0].level).toBe("warning");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("skips the network entirely when no webhook is configured", () => {
    vi.stubEnv("CRM_ALERT_WEBHOOK_URL", "");

    reportCrmIssue("warning", "crm.test", "no webhook");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
