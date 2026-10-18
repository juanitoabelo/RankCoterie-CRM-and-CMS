import type { BlockStyleSchema } from "./element-style";
import { getStandardBlockStyleSchema } from "./standard-style-schemas";
import { getListingBlockStyleSchema } from "@/lib/listing-templates/style-schema";
import { getGeoBlockStyleSchema } from "@/lib/geo-category-template/style-schema";
import { getBlogBlockStyleSchema } from "@/lib/blog-template/style-schema";

/**
 * Single resolver every builder's Style tab uses.
 *
 * Builder-specific registries win over the shared standard schemas so a
 * builder can refine (or override) how a shared block is styled. Returns
 * `undefined` for blocks with no element schema — callers then fall back to the
 * legacy `BlockStyleTab`.
 */
export function getBlockStyleSchema(blockType: string): BlockStyleSchema | undefined {
  return (
    getListingBlockStyleSchema(blockType) ??
    getGeoBlockStyleSchema(blockType) ??
    getBlogBlockStyleSchema(blockType) ??
    getStandardBlockStyleSchema(blockType)
  );
}
