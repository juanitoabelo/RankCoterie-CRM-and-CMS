import { resetAnalyticsConfigCache } from "@/lib/analytics/config";
import { clearIndexGateCache } from "@/lib/directory/indexGate";
import { invalidateFontCache } from "@/lib/custom-fonts.server";
import { clearSiteLayoutCache } from "@/lib/site-layout-cache";
import { invalidateThemeStylesCache } from "@/lib/theme-styles.server";

export function clearApplicationCaches() {
  clearSiteLayoutCache();
  invalidateThemeStylesCache();
  resetAnalyticsConfigCache();
  invalidateFontCache();
  clearIndexGateCache();
}
