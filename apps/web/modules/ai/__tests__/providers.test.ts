import { describe, expect, it } from "vitest";
import {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  buildProviderRequest,
  isAiProviderId,
  parseProviderResponse,
} from "../providers";

const request = {
  system: "System instructions",
  user: "Write the intro",
  maxTokens: 900,
  temperature: 0.4,
};

describe("AI provider definitions", () => {
  it("registers the supported providers", () => {
    expect(AI_PROVIDER_IDS).toEqual(["anthropic", "gemini", "groq", "openrouter"]);
    for (const provider of AI_PROVIDER_IDS) {
      expect(AI_PROVIDERS[provider].label).toBeTruthy();
      expect(AI_PROVIDERS[provider].defaultModel).toBeTruthy();
    }
  });

  it("validates provider IDs", () => {
    expect(isAiProviderId("gemini")).toBe(true);
    expect(isAiProviderId("openrouter")).toBe(true);
    expect(isAiProviderId("unknown")).toBe(false);
    expect(isAiProviderId(null)).toBe(false);
  });
});

describe("buildProviderRequest", () => {
  it("builds Anthropic messages requests", () => {
    const result = buildProviderRequest(
      "anthropic",
      { apiKey: "anthropic-key", model: "claude-sonnet-5.5" },
      request,
    );
    expect(result.url).toBe("https://api.anthropic.com/v1/messages");
    expect(result.headers).toMatchObject({
      "content-type": "application/json",
      "x-api-key": "anthropic-key",
      "anthropic-version": "2023-06-01",
    });
    expect(result.body).toEqual({
      model: "claude-sonnet-5.5",
      max_tokens: 900,
      system: "System instructions",
      messages: [{ role: "user", content: "Write the intro" }],
    });
  });

  it("builds Gemini requests with encoded key and model", () => {
    const result = buildProviderRequest(
      "gemini",
      { apiKey: "key/with symbols", model: "models/gemini 3" },
      request,
    );
    expect(result.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/models%2Fgemini%203:generateContent?key=key%2Fwith%20symbols",
    );
    expect(result.body).toEqual({
      systemInstruction: { parts: [{ text: "System instructions" }] },
      contents: [{ role: "user", parts: [{ text: "Write the intro" }] }],
      generationConfig: { maxOutputTokens: 900, temperature: 0.4 },
    });
  });

  it("builds OpenAI-compatible requests for Groq and OpenRouter", () => {
    for (const provider of ["groq", "openrouter"] as const) {
      const result = buildProviderRequest(
        provider,
        { apiKey: `${provider}-key`, model: `${provider}-model` },
        request,
      );
      expect(result.url).toContain(provider);
      expect(result.headers.authorization).toBe(`Bearer ${provider}-key`);
      expect(result.body).toEqual({
        model: `${provider}-model`,
        max_tokens: 900,
        temperature: 0.4,
        messages: [
          { role: "system", content: "System instructions" },
          { role: "user", content: "Write the intro" },
        ],
      });
    }
  });
});

describe("parseProviderResponse", () => {
  it("parses Anthropic text blocks", () => {
    expect(
      parseProviderResponse("anthropic", {
        content: [
          { type: "text", text: "First" },
          { type: "tool_use", text: "ignored" },
          { type: "text", text: "Second" },
        ],
      }),
    ).toBe("First\nSecond");
  });

  it("parses Gemini candidate text parts", () => {
    expect(
      parseProviderResponse("gemini", {
        candidates: [
          { content: { parts: [{ text: "First" }, { text: "Second" }] } },
        ],
      }),
    ).toBe("First\nSecond");
  });

  it("parses OpenAI-compatible message content", () => {
    expect(
      parseProviderResponse("groq", {
        choices: [{ message: { content: "Generated copy" } }],
      }),
    ).toBe("Generated copy");
  });

  it("returns an empty string for invalid responses", () => {
    expect(parseProviderResponse("openrouter", {})).toBe("");
    expect(parseProviderResponse("anthropic", null)).toBe("");
  });
});
