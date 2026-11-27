import {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  buildProviderRequest,
  parseProviderResponse,
  type AiProviderId,
  type AiTextRequest,
  type AiTextResponse,
} from "./providers";
import { getAiRuntimeSettings, resolveAiProviderConfig } from "./settings";

function candidateOrder(
  primary: AiProviderId,
  fallbackEnabled: boolean,
): AiProviderId[] {
  if (!fallbackEnabled) return [primary];
  return [primary, ...AI_PROVIDER_IDS.filter((provider) => provider !== primary)];
}

export async function generateAiText(request: AiTextRequest): Promise<AiTextResponse> {
  const runtime = await getAiRuntimeSettings();
  const failures: string[] = [];

  for (const provider of candidateOrder(runtime.primaryProvider, runtime.fallbackEnabled)) {
    const config = await resolveAiProviderConfig(provider);
    const apiKey = config.apiKey;
    if (!config.enabled || !apiKey) continue;

    try {
      const http = buildProviderRequest(provider, { ...config, apiKey }, request);
      const response = await fetch(http.url, {
        method: "POST",
        headers: http.headers,
        body: JSON.stringify(http.body),
        signal: AbortSignal.timeout(request.timeoutMs ?? 60000),
        cache: "no-store",
      });

      if (!response.ok) {
        failures.push(`${AI_PROVIDERS[provider].label} returned ${response.status}`);
        continue;
      }

      const text = parseProviderResponse(provider, await response.json());
      if (text) return { text, provider, model: config.model };
      failures.push(`${AI_PROVIDERS[provider].label} returned no text`);
    } catch {
      failures.push(`${AI_PROVIDERS[provider].label} request failed`);
    }
  }

  if (!failures.length) {
    throw new Error(
      "No AI provider is configured. Add an API key under Admin → System Tools → AI Providers.",
    );
  }

  throw new Error(`AI generation failed: ${failures.join("; ")}`);
}
