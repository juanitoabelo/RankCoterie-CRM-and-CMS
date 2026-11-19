import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deliveryFindFirst: vi.fn(),
  deliveryFindMany: vi.fn(),
  deliveryUpdate: vi.fn(),
  endpointUpdate: vi.fn(),
  sign: vi.fn(() => "sha256=test-signature"),
  fetch: vi.fn(),
}));

vi.mock("@/modules/shared", () => ({
  TENANT_ID: "tenant_test",
  prisma: {
    webhookDelivery: {
      findFirst: mocks.deliveryFindFirst,
      findMany: mocks.deliveryFindMany,
      update: mocks.deliveryUpdate,
      create: vi.fn(),
    },
    webhookEndpoint: {
      findMany: vi.fn(),
      update: mocks.endpointUpdate,
    },
  },
}));

vi.mock("./signature", () => ({ signWebhookPayload: mocks.sign }));

import { deliverWebhookDelivery, dispatchPendingWebhooks, retryWebhookDelivery } from "./dispatch";

const createdAt = new Date("2026-01-02T03:04:05.000Z");

function endpoint(overrides: Record<string, unknown> = {}) {
  return {
    id: "ep_1",
    tenantId: "tenant_test",
    name: "CRM",
    url: "https://example.com/webhook",
    secret: "legacy-secret",
    secretKey: "hmac-secret",
    isActive: true,
    maxRetries: 3,
    retryDelay: 60,
    events: ["lead.created"],
    ...overrides,
  };
}

function delivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "del_1",
    tenantId: "tenant_test",
    endpointId: "ep_1",
    listingId: null,
    event: "lead.created",
    payload: { leadId: "lead_1" },
    responseStatus: null,
    responseBody: null,
    attempt: 1,
    status: "PENDING",
    nextRetryAt: null,
    deliveredAt: null,
    createdAt,
    updatedAt: createdAt,
    endpoint: endpoint(),
    ...overrides,
  };
}

function fetchOk() {
  mocks.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });
}

function fetchFailure(status = 500) {
  mocks.fetch.mockResolvedValue({ ok: false, status, text: async () => "failed" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("webhook delivery", () => {
  it("delivers a pending delivery with the signed headers and marks it successful", async () => {
    mocks.deliveryFindFirst.mockResolvedValue(delivery());
    fetchOk();

    const result = await deliverWebhookDelivery("del_1");

    expect(result).toMatchObject({ ok: true, status: "SUCCESS", responseStatus: 200 });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const init = mocks.fetch.mock.calls[0][1] as { headers: Record<string, string>; body: string };
    expect(init.headers["X-Canopy-Event"]).toBe("lead.created");
    expect(init.headers["X-Canopy-Signature"]).toBe("sha256=test-signature");
    expect(JSON.parse(init.body)).toMatchObject({ id: "del_1", event: "lead.created" });
    expect(mocks.sign).toHaveBeenCalledWith("hmac-secret", init.body);
    expect(mocks.deliveryUpdate).toHaveBeenCalledWith({
      where: { id: "del_1" },
      data: expect.objectContaining({ status: "SUCCESS", responseStatus: 200 }),
    });
    expect(mocks.endpointUpdate).toHaveBeenCalledWith({
      where: { id: "ep_1" },
      data: expect.objectContaining({ successCount: { increment: 1 } }),
    });
  });

  it("schedules a retry on failure and gives up after the retry budget", async () => {
    mocks.deliveryFindFirst.mockResolvedValue(delivery());
    fetchFailure();

    const retried = await deliverWebhookDelivery("del_1");
    expect(retried.status).toBe("PENDING");
    expect(mocks.deliveryUpdate).toHaveBeenCalledWith({
      where: { id: "del_1" },
      data: expect.objectContaining({ status: "PENDING", attempt: 2 }),
    });

    mocks.deliveryFindFirst.mockResolvedValue(delivery({ attempt: 3 }));
    const givenUp = await deliverWebhookDelivery("del_1");
    expect(givenUp.status).toBe("GIVEN_UP");
    const lastUpdate = mocks.deliveryUpdate.mock.calls.at(-1)?.[0];
    expect(lastUpdate.data).toMatchObject({ status: "GIVEN_UP", nextRetryAt: null, attempt: 4 });
  });

  it("retries a given-up delivery with a fresh attempt budget", async () => {
    mocks.deliveryFindFirst
      .mockResolvedValueOnce({ id: "del_1", status: "GIVEN_UP", attempt: 3 })
      .mockResolvedValueOnce(delivery({ status: "PENDING", attempt: 1 }));
    fetchOk();

    const result = await retryWebhookDelivery("del_1");

    expect(result.ok).toBe(true);
    expect(mocks.deliveryUpdate.mock.calls[0][0]).toMatchObject({
      where: { id: "del_1" },
      data: expect.objectContaining({ status: "PENDING", attempt: 1, nextRetryAt: null }),
    });
    expect(mocks.deliveryUpdate.mock.calls.at(-1)?.[0].data).toMatchObject({
      status: "SUCCESS",
    });
  });

  it("skips inactive endpoints when dispatching pending deliveries", async () => {
    mocks.deliveryFindMany.mockResolvedValue([
      delivery({ endpoint: endpoint({ isActive: false }) }),
    ]);

    const summary = await dispatchPendingWebhooks();

    expect(summary).toEqual({ processed: 0, delivered: 0, failed: 0, retried: 0 });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
