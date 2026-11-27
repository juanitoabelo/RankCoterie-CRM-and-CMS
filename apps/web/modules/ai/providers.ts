export const AI_PROVIDER_IDS = ["anthropic", "gemini", "groq", "openrouter"] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type AiProviderValueSource = "saved" | "environment" | null;

export interface AiProviderDefinition {
  label: string;
  envKeyNames: readonly string[];
  envModelNames: readonly string[];
  defaultModel: string;
  freeTierNote: string;
}

export const AI_PROVIDERS: Record<AiProviderId, AiProviderDefinition> = {
  anthropic: {
    label: "Anthropic Claude",
    envKeyNames: ["ANTHROPIC_API_KEY"],
    envModelNames: ["ANTHROPIC_MODEL"],
    defaultModel: "claude-sonnet-5.5",
    freeTierNote: "Paid API. Claude Pro chat does not include API access.",
  },
  gemini: {
    label: "Google Gemini",
    envKeyNames: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    envModelNames: ["GEMINI_MODEL"],
    defaultModel: "gemini-3.8-flash",
    freeTierNote: "Free tier available. Free-tier content may be used to improve Google products.",
  },
  groq: {
    label: "Groq",
    envKeyNames: ["GROQ_API_KEY"],
    envModelNames: ["GROQ_MODEL"],
    defaultModel: "qwen/qwen3.8-27b",
    freeTierNote: "Free tier available with per-minute and daily token limits.",
  },
  openrouter: {
    label: "OpenRouter",
    envKeyNames: ["OPENROUTER_API_KEY"],
    envModelNames: ["OPENROUTER_MODEL"],
    defaultModel: "openrouter/free",
    freeTierNote: "Free models available with 50 requests/day until $10 credits are purchased.",
  },
};

export const DEFAULT_AI_PROVIDER: AiProviderId = "anthropic";

export interface AiTextRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface AiProviderConfig {
  apiKey: string;
  model: string;
}

export interface AiTextResponse {
  text: string;
  provider: AiProviderId;
  model: string;
}

export interface ProviderHttpRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export function isAiProviderId(value: unknown): value is AiProviderId {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

export function buildProviderRequest(
  provider: AiProviderId,
  config: AiProviderConfig,
  request: AiTextRequest,
): ProviderHttpRequest {
  const maxTokens = request.maxTokens ?? 1200;
  const temperature = request.temperature ?? 0.7;

  if (provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: config.model,
        max_tokens: maxTokens,
        system: request.system,
        messages: [{ role: "user", content: request.user }],
      },
    };
  }

  if (provider === "gemini") {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
      headers: { "content-type": "application/json" },
      body: {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.user }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      },
    };
  }

  const url =
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

  return {
    url,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textParts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((part) => {
      const record = asRecord(part);
      return typeof record.text === "string" ? record.text : "";
    })
    .filter(Boolean);
}

export function parseProviderResponse(provider: AiProviderId, data: unknown): string {
  const root = asRecord(data);

  if (provider === "anthropic") {
    const content = Array.isArray(root.content) ? root.content : [];
    return content
      .map((block) => {
        const record = asRecord(block);
        return record.type === "text" && typeof record.text === "string" ? record.text : "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (provider === "gemini") {
    const candidates = Array.isArray(root.candidates) ? root.candidates : [];
    for (const candidate of candidates) {
      const record = asRecord(candidate);
      const content = asRecord(record.content);
      const text = textParts(content.parts).join("\n").trim();
      if (text) return text;
    }
    return "";
  }

  const choices = Array.isArray(root.choices) ? root.choices : [];
  const first = asRecord(choices[0]);
  const message = asRecord(first.message);
  return typeof message.content === "string" ? message.content.trim() : "";
}
