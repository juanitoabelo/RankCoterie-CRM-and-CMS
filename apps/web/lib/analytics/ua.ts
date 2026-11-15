export type ParsedUserAgent = {
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  os: string;
};

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  const ua = userAgent ?? "";
  const lower = ua.toLowerCase();

  const deviceType: ParsedUserAgent["deviceType"] = /ipad|tablet|kindle|silk/i.test(ua)
    ? "tablet"
    : /mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)
      ? "mobile"
      : ua
        ? "desktop"
        : "unknown";

  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /chrome|crios/i.test(ua)
        ? "Chrome"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /safari/i.test(ua)
            ? "Safari"
            : /msie|trident/i.test(ua)
              ? "Internet Explorer"
              : "Other";

  const os = /windows/i.test(ua)
    ? "Windows"
    : /android/i.test(ua)
      ? "Android"
      : /iphone|ipad|ipod/i.test(ua)
        ? "iOS"
        : /mac os|macintosh/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : lower
              ? "Other"
              : "Unknown";

  return { deviceType, browser, os };
}
