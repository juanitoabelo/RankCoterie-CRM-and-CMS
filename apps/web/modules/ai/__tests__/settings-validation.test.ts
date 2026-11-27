import { describe, expect, it } from "vitest";
import { validateAiProviderSettingsInput } from "../settings";

describe("validateAiProviderSettingsInput", () => {
  it("accepts an empty update", () => {
    const result = validateAiProviderSettingsInput({});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input).toEqual({});
  });

  it("accepts provider overrides", () => {
    const result = validateAiProviderSettingsInput({
      primaryProvider: "gemini",
      fallbackEnabled: true,
      providers: {
        gemini: { apiKey: "key", model: "gemini-3.8-flash", enabled: true },
        groq: { clearKey: true, enabled: false },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.primaryProvider).toBe("gemini");
      expect(result.input.fallbackEnabled).toBe(true);
      expect(result.input.providers?.gemini).toEqual({
        apiKey: "key",
        model: "gemini-3.8-flash",
        enabled: true,
      });
    }
  });

  it("rejects invalid primary providers", () => {
    expect(validateAiProviderSettingsInput({ primaryProvider: "chatgpt" })).toMatchObject({
      ok: false,
    });
  });

  it("rejects invalid provider fields", () => {
    expect(validateAiProviderSettingsInput({ providers: { anthropic: { enabled: "yes" } } })).toMatchObject({
      ok: false,
    });
    expect(validateAiProviderSettingsInput({ providers: { unknown: { enabled: true } } })).toMatchObject({
      ok: false,
    });
    expect(
      validateAiProviderSettingsInput({ providers: { anthropic: { apiKey: "x".repeat(1001) } } }),
    ).toMatchObject({ ok: false });
  });

  it("rejects non-object input", () => {
    expect(validateAiProviderSettingsInput(null)).toMatchObject({ ok: false });
    expect(validateAiProviderSettingsInput([])).toMatchObject({ ok: false });
  });
});
