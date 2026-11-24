export const WISHLIST_STORAGE_KEY = "canopy:wishlist";
export const WISHLIST_CHANGED_EVENT = "canopy:wishlist-changed";
const MAX_ITEMS = 100;

export function parseWishlistIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
  } catch {
    return [];
  }
}

/** Server items win for ordering of shared ids; local-only items are appended. */
export function mergeWishlistIds(localIds: string[], serverIds: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const id of [...localIds, ...serverIds]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= MAX_ITEMS) break;
  }
  return result;
}
