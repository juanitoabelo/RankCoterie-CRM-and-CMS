/**
 * Canopy V2 — resolve localized category content for a given page (legacy §6.5e rules).
 *
 * Priority per page type, faithful to the legacy GeoCategory resolution:
 *   State page:  categoryRegionContent(state,ALL) → region.custom1/custom2 → category.stateInit
 *                → category.description   (description = category.stateDesc when present)
 *   City page:   categoryRegionContent(state,areaPart) → city fallback chain
 *                → category.cityInit → category.description (description = category.cityDesc)
 * Returns raw text still containing tokens; call `renderLocalizedContent` afterwards.
 */

import type {
  CatalogCategory,
  CatalogRegion,
  CategoryRegionContent,
} from "./catalog";

export interface ResolvedCategoryContent {
  intro: string;
  description: string;
}

export function resolveCategoryContent(
  category: Pick<
    CatalogCategory,
    "description" | "stateInit" | "stateDesc" | "cityInit" | "cityDesc"
  >,
  region: CatalogRegion | null,
  contents: CategoryRegionContent[],
): ResolvedCategoryContent {
  // No region ("ALL" / parent page): strip tokens via empty regionContext + category defaults.
  if (!region) {
    return {
      intro: category.description ?? "",
      description: "",
    };
  }

  const isState = region.city === null;
  const stateContents = contents.filter((c) => c.state === region.state);

  if (isState) {
    const matched =
      stateContents.find((c) => c.areaPart === "ALL")?.text ??
      region.custom1 ??
      region.custom2 ??
      category.stateInit ??
      category.description ??
      "";
    return {
      intro: matched,
      description: category.stateDesc ?? "",
    };
  }

  // City page: match on state-area, then fall back to city content.
  const matched =
    stateContents.find((c) => c.areaPart === region.areaPart)?.text ??
    region.custom1 ??
    region.custom2 ??
    category.cityInit ??
    category.description ??
    "";
  return {
    intro: matched,
    description: category.cityDesc ?? "",
  };
}