import { BOT_PATTERNS } from "@/modules/analytics/constants";

export function detectBot(userAgent: string | null | undefined): {
  isBot: boolean;
  botName: string | null;
} {
  if (!userAgent) return { isBot: true, botName: "Unknown" };
  for (const entry of BOT_PATTERNS) {
    if (entry.pattern.test(userAgent)) {
      return { isBot: true, botName: entry.name };
    }
  }
  return { isBot: false, botName: null };
}
