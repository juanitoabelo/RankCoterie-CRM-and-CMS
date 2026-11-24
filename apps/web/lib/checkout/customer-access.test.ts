import { describe, expect, it } from "vitest";
import {
  toDownloadGrantView,
  toOrderLookupView,
  withReissuedDownloadToken,
} from "./customer-access";

const now = new Date("2026-01-20T00:00:00.000Z");

describe("customer order access views", () => {
  it("exposes only safe order fields", () => {
    const view = toOrderLookupView({
      id: "o1",
      orderNumber: "ORD-1",
      paymentStatus: "PAID",
      status: "COMPLETED",
      total: 42.5,
      currency: "USD",
      createdAt: now,
      items: [
        { id: "i1", name: "Ebook", quantity: 1, lineTotal: 42.5 },
      ],
    });
    expect(view).toEqual({
      orderNumber: "ORD-1",
      paymentStatus: "PAID",
      status: "COMPLETED",
      total: 42.5,
      currency: "USD",
      placedAt: now.toISOString(),
      items: [{ id: "i1", name: "Ebook", quantity: 1, lineTotal: 42.5 }],
    });
    expect(JSON.stringify(view)).not.toContain("buyer@example.com");
  });

  it("computes download usage and expiry", () => {
    const grant = {
      id: "g1",
      token: "tok_1",
      name: "Ebook PDF",
      expiresAt: new Date("2026-02-01T00:00:00.000Z"),
      downloadLimit: 3,
      downloadsUsed: 1,
    };
    expect(toDownloadGrantView(grant, now)).toEqual({
      id: "g1",
      name: "Ebook PDF",
      remaining: 2,
      expiresAt: "2026-02-01T00:00:00.000Z",
      expired: false,
      available: true,
      downloadPath: "/api/downloads/tok_1",
    });
    expect(toDownloadGrantView({ ...grant, downloadsUsed: 3 }, now).available).toBe(false);
    expect(
      toDownloadGrantView({ ...grant, expiresAt: new Date("2026-01-01T00:00:00.000Z") }, now).expired,
    ).toBe(true);
    expect(toDownloadGrantView({ ...grant, downloadLimit: null }, now).remaining).toBeNull();
  });

  it("rotates the link token and clears usage on reissue", () => {
    const grant = {
      id: "g1",
      token: "old-token",
      name: "Ebook PDF",
      expiresAt: null,
      downloadLimit: 3,
      downloadsUsed: 3,
    };
    const reissued = withReissuedDownloadToken(grant, "new-token");
    expect(reissued.token).toBe("new-token");
    expect(reissued.downloadsUsed).toBe(0);
    expect(reissued.expiresAt).toBeNull();
    expect(toDownloadGrantView(reissued, now).available).toBe(true);
  });
});
