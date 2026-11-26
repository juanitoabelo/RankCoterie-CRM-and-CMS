"use server";

import { requireSection } from "@/modules/auth";
import {
  buildAiAlternateIntroPrompt,
  validateAiAlternateIntro,
  validateAiAlternateIntroInput,
  type AiAlternateIntroResult,
} from "@/lib/admin/geo-category-alt-intro-ai";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-0";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const recentRequests = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (recentRequests.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recentRequests.size > 1000) {
    for (const [key, timestamps] of recentRequests) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)) {
        recentRequests.delete(key);
      }
    }
  }

  if (recent.length >= RATE_LIMIT_MAX) {
    recentRequests.set(userId, recent);
    return true;
  }

  recent.push(now);
  recentRequests.set(userId, recent);
  return false;
}

export async function generateAlternateIntroWithAi(
  input: unknown,
): Promise<AiAlternateIntroResult> {
  const actor = await requireSection("categories");

  if (isRateLimited(actor.id)) {
    return { ok: false, error: "Too many AI generation requests. Please wait a minute and try again." };
  }

  const inputValidation = validateAiAlternateIntroInput(input);
  if (!inputValidation.ok) return { ok: false, error: inputValidation.error };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI generation is not configured. Add ANTHROPIC_API_KEY to the web app environment." };
  }

  const prompt = buildAiAlternateIntroPrompt(inputValidation.input);

  const request = async (revisionRequest?: string) => {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 1200,
        system: prompt.system,
        messages: [
          {
            role: "user",
            content: revisionRequest
              ? `${prompt.user}\n\nRevision request: ${revisionRequest}`
              : prompt.user,
          },
        ],
      }),
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false as const, error: `Anthropic API request failed (${response.status}).` };
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim();

    if (!text) return { ok: false as const, error: "AI returned no text." };
    return { ok: true as const, text };
  };

  let generated;
  try {
    generated = await request();
  } catch {
    return { ok: false, error: "AI generation failed. Check the API configuration and try again." };
  }
  if (!generated.ok) return { ok: false, error: generated.error };

  let outputValidation = validateAiAlternateIntro(generated.text);
  if (!outputValidation.ok) {
    let revised;
    try {
      revised = await request(outputValidation.error);
    } catch {
      return { ok: false, error: "AI revision failed. Try again." };
    }
    if (!revised.ok) return { ok: false, error: revised.error };
    outputValidation = validateAiAlternateIntro(revised.text);
  }
  if (!outputValidation.ok) return { ok: false, error: outputValidation.error };

  return { ok: true, html: outputValidation.output.html, wordCount: outputValidation.output.wordCount };
}
