import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  decryptToken: vi.fn(),
  encryptToken: vi.fn(),
}));

vi.mock("@/modules/shared", () => ({
  TENANT_ID: "tenant-test",
  prisma: {
    crmIntegrationSetting: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

vi.mock("../oauth-crypto", () => ({
  decryptToken: mocks.decryptToken,
  encryptToken: mocks.encryptToken,
}));

import {
  getCrmIntegrationSettingsView,
  resolveCrmIntegrationSecret,
  saveCrmIntegrationSettings,
} from "../integration-settings";

describe("CRM integration settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.encryptToken.mockImplementation((value: string) => `encrypted:${value}`);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses environment values when no saved override exists", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "env-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "env-client-secret");

    const view = await getCrmIntegrationSettingsView();

    expect(view.googleClientId).toEqual({ value: "env-client-id", source: "environment" });
    expect(view.googleClientSecret).toEqual({ configured: true, source: "environment" });
    await expect(resolveCrmIntegrationSecret("googleClientSecret")).resolves.toBe(
      "env-client-secret",
    );
  });

  it("prefers encrypted saved values over environment values", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "env-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "env-client-secret");
    mocks.findUnique.mockResolvedValue({
      googleClientId: "saved-client-id",
      googleClientSecretEncrypted: "ciphertext",
    });
    mocks.decryptToken.mockReturnValue("saved-client-secret");

    const view = await getCrmIntegrationSettingsView();

    expect(view.googleClientId).toEqual({ value: "saved-client-id", source: "saved" });
    expect(view.googleClientSecret).toEqual({ configured: true, source: "saved" });
    await expect(resolveCrmIntegrationSecret("googleClientSecret")).resolves.toBe(
      "saved-client-secret",
    );
  });

  it("encrypts secrets and clears blank fields when saving", async () => {
    await saveCrmIntegrationSettings({
      googleClientId: null,
      googleClientSecret: "new-client-secret",
    });

    expect(mocks.encryptToken).toHaveBeenCalledWith("new-client-secret");
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { tenantId: "tenant-test" },
      create: expect.objectContaining({
        tenantId: "tenant-test",
        googleClientId: null,
        googleClientSecretEncrypted: "encrypted:new-client-secret",
      }),
      update: expect.objectContaining({
        googleClientId: null,
        googleClientSecretEncrypted: "encrypted:new-client-secret",
      }),
    });
  });
});
