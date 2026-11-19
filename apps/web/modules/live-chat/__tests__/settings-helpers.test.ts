import { describe, expect, it } from "vitest";
import { DEFAULT_LIVE_CHAT_SETTINGS, normalizeLiveChatSettings, validateLiveChatSettings } from "../settings-helpers";

describe("normalizeLiveChatSettings", () => {
  it("normalizes safe public widget settings", () => {
    const result = normalizeLiveChatSettings({
      enabled: true,
      title: "  Chat with us  ",
      greeting: "  How can we help?  ",
      position: "top-right",
      accentColor: "#06b6d4",
      leadSource: "  live-chat ",
    });

    expect(result).toEqual({
      enabled: true,
      title: "Chat with us",
      greeting: "How can we help?",
      position: "bottom-right",
      accentColor: "#06b6d4",
      leadSource: "live-chat",
    });
  });

  it("falls back when the accent color is unsafe", () => {
    const result = normalizeLiveChatSettings({ accentColor: "url(javascript:alert(1))" });
    expect(result.accentColor).toBe(DEFAULT_LIVE_CHAT_SETTINGS.accentColor);
  });
});

describe("validateLiveChatSettings", () => {
  it("returns no errors for valid settings", () => {
    expect(validateLiveChatSettings(DEFAULT_LIVE_CHAT_SETTINGS)).toEqual([]);
  });

  it("rejects overlong text and invalid colors", () => {
    const errors = validateLiveChatSettings({
      ...DEFAULT_LIVE_CHAT_SETTINGS,
      title: "x".repeat(81),
      greeting: "y".repeat(401),
      accentColor: "red; background-image:url(x)",
    });

    expect(errors).toContain("Title must be 80 characters or fewer.");
    expect(errors).toContain("Greeting must be 400 characters or fewer.");
    expect(errors).toContain("Accent color must be a 6-digit hex color.");
  });
});
