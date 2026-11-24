import { describe, expect, it, vi } from "vitest";

const resetAnalyticsConfigCache = vi.fn();
const clearIndexGateCache = vi.fn();
const invalidateFontCache = vi.fn();
const clearSiteLayoutCache = vi.fn();
const invalidateThemeStylesCache = vi.fn();

vi.mock("@/lib/analytics/config", () => ({ resetAnalyticsConfigCache }));
vi.mock("@/lib/directory/indexGate", () => ({ clearIndexGateCache }));
vi.mock("@/lib/custom-fonts.server", () => ({ invalidateFontCache }));
vi.mock("@/lib/site-layout-cache", () => ({ clearSiteLayoutCache }));
vi.mock("@/lib/theme-styles.server", () => ({ invalidateThemeStylesCache }));

describe("clearApplicationCaches", () => {
  it("clears every process-wide cache used by public pages", async () => {
    const { clearApplicationCaches } = await import("./cache-purge");

    clearApplicationCaches();

    expect(resetAnalyticsConfigCache).toHaveBeenCalledOnce();
    expect(clearIndexGateCache).toHaveBeenCalledOnce();
    expect(invalidateFontCache).toHaveBeenCalledOnce();
    expect(clearSiteLayoutCache).toHaveBeenCalledOnce();
    expect(invalidateThemeStylesCache).toHaveBeenCalledOnce();
  });
});
