import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAiText } from "../client";
import { getAiRuntimeSettings, resolveAiProviderConfig } from "../settings";

vi.mock("../settings", () => ({
  getAiRuntimeSettings: vi.fn(),
  resolveAiProviderConfig: vi.fn(),
}));

const runtimeMock = vi.mocked(getAiRuntimeSettings);
const configMock = vi.mocked(resolveAiProviderConfig);
const request = { system: "system", user: "user" };

function response(ok: boolean, body: unknown) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

describe("generateAiText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeMock.mockResolvedValue({ primaryProvider: "anthropic", fallbackEnabled: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws a friendly error when no provider has a key", async () => {
    configMock.mockResolvedValue({
      apiKey: null,
      model: "model",
      enabled: true,
      source: null,
    });

    await expect(generateAiText(request)).rejects.toThrow("No AI provider is configured");
  });

  it("uses a fallback provider when the primary request fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(false, {}))
      .mockResolvedValueOnce(
        response(true, {
          candidates: [{ content: { parts: [{ text: "Fallback result" }] } }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    configMock.mockImplementation(async (provider) => ({
      apiKey: `${provider}-key`,
      model: `${provider}-model`,
      enabled: true,
      source: "saved",
    }));

    const result = await generateAiText(request);

    expect(result).toEqual({
      text: "Fallback result",
      provider: "gemini",
      model: "gemini-model",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("generativelanguage.googleapis.com");
  });

  it("does not try other providers when fallback is disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(false, {}));
    vi.stubGlobal("fetch", fetchMock);
    runtimeMock.mockResolvedValue({ primaryProvider: "anthropic", fallbackEnabled: false });
    configMock.mockResolvedValue({
      apiKey: "anthropic-key",
      model: "claude-sonnet-5.5",
      enabled: true,
      source: "saved",
    });

    await expect(generateAiText(request)).rejects.toThrow("AI generation failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("skips disabled providers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(true, { content: [{ type: "text", text: "Anthropic result" }] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    configMock.mockImplementation(async (provider) => ({
      apiKey: `${provider}-key`,
      model: `${provider}-model`,
      enabled: provider === "anthropic",
      source: "saved",
    }));

    await expect(generateAiText(request)).resolves.toMatchObject({ provider: "anthropic" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
