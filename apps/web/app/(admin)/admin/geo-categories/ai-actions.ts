"use server";

import { requireSection } from "@/modules/auth";
import {
  buildAiAlternateIntroPrompt,
  validateAiAlternateIntro,
  validateAiAlternateIntroInput,
  type AiAlternateIntroResult,
} from "@/lib/admin/geo-category-alt-intro-ai";
import { generateAiText } from "@/modules/ai/client";

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

  const prompt = buildAiAlternateIntroPrompt(inputValidation.input);

  const request = async (revisionRequest?: string) => {
    const result = await generateAiText({
      system: prompt.system,
      user: revisionRequest
        ? `${prompt.user}\n\nRevision request: ${revisionRequest}`
        : prompt.user,
      maxTokens: 1200,
      timeoutMs: 60000,
    });
    return result.text;
  };

  let generatedText: string;
  try {
    generatedText = await request();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "AI generation failed. Check the provider configuration and try again.",
    };
  }

  let outputValidation = validateAiAlternateIntro(generatedText);
  if (!outputValidation.ok) {
    let revisedText: string;
    try {
      revisedText = await request(outputValidation.error);
    } catch {
      return { ok: false, error: "AI revision failed. Try again." };
    }
    outputValidation = validateAiAlternateIntro(revisedText);
  }
  if (!outputValidation.ok) return { ok: false, error: outputValidation.error };

  return { ok: true, html: outputValidation.output.html, wordCount: outputValidation.output.wordCount };
}
