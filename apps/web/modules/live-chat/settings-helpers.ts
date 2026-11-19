export interface LiveChatSettings {
  enabled: boolean;
  title: string;
  greeting: string;
  position: "bottom-right" | "bottom-left";
  accentColor: string;
  leadSource: string;
}

export const DEFAULT_LIVE_CHAT_SETTINGS: LiveChatSettings = {
  enabled: false,
  title: "Chat with us",
  greeting: "How can we help?",
  position: "bottom-right",
  accentColor: "#2563eb",
  leadSource: "live-chat",
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizeLiveChatSettings(value: unknown): LiveChatSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_LIVE_CHAT_SETTINGS };
  const raw = value as Record<string, unknown>;
  const color = text(raw.accentColor, 7);
  const position = raw.position === "bottom-left" ? "bottom-left" : "bottom-right";

  return {
    enabled: raw.enabled === true,
    title: text(raw.title, 80) || DEFAULT_LIVE_CHAT_SETTINGS.title,
    greeting: text(raw.greeting, 400) || DEFAULT_LIVE_CHAT_SETTINGS.greeting,
    position,
    accentColor: HEX_COLOR.test(color) ? color : DEFAULT_LIVE_CHAT_SETTINGS.accentColor,
    leadSource: text(raw.leadSource, 80) || DEFAULT_LIVE_CHAT_SETTINGS.leadSource,
  };
}

export function validateLiveChatSettings(settings: LiveChatSettings): string[] {
  const errors: string[] = [];
  if (settings.title.length > 80) errors.push("Title must be 80 characters or fewer.");
  if (settings.greeting.length > 400) errors.push("Greeting must be 400 characters or fewer.");
  if (!HEX_COLOR.test(settings.accentColor)) errors.push("Accent color must be a 6-digit hex color.");
  if (settings.position !== "bottom-right" && settings.position !== "bottom-left") {
    errors.push("Position must be bottom-right or bottom-left.");
  }
  return errors;
}
