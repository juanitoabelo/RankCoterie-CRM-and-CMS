import type { Block } from "@/lib/page-builder/types";
import type { ContainerSettings, ProductTemplateData } from "./types";
import { DEFAULT_CONTAINER_SETTINGS } from "./types";

export function parseProductTemplateData(data: string | null): ProductTemplateData {
  if (!data) return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
  try {
    const parsed: unknown = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return { blocks: parsed as Block[], containerSettings: DEFAULT_CONTAINER_SETTINGS };
    }
    if (!parsed || typeof parsed !== "object") {
      return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
    }
    const record = parsed as { blocks?: unknown; containerSettings?: unknown };
    return {
      blocks: Array.isArray(record.blocks) ? record.blocks as Block[] : [],
      containerSettings: {
        ...DEFAULT_CONTAINER_SETTINGS,
        ...(record.containerSettings && typeof record.containerSettings === "object"
          ? record.containerSettings as Partial<ContainerSettings>
          : {}),
      },
    };
  } catch {
    return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
  }
}

export function serializeProductTemplateData(
  blocks: Block[],
  containerSettings: ContainerSettings,
): string {
  return JSON.stringify({ blocks, containerSettings });
}

export interface ProductBlockSetting {
  key: string;
  label: string;
  type: "text" | "toggle" | "select" | "number";
  default: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
}

export const PRODUCT_BLOCK_SETTINGS: Record<string, ProductBlockSetting[]> = {
  productTitle: [
    { key: "showSku", label: "Show SKU", type: "toggle", default: false },
    { key: "showRating", label: "Show rating", type: "toggle", default: true },
  ],
  productPrice: [
    { key: "showRegularPrice", label: "Show regular price", type: "toggle", default: true },
    { key: "showSaleBadge", label: "Show sale badge", type: "toggle", default: true },
    { key: "showTaxNote", label: "Show tax note", type: "toggle", default: true },
  ],
  productGallery: [
    { key: "aspect", label: "Image aspect", type: "select", default: "1:1", options: [
      { value: "1:1", label: "Square" },
      { value: "4:5", label: "Portrait" },
      { value: "16:9", label: "Wide" },
    ] },
    { key: "showThumbnails", label: "Show thumbnails", type: "toggle", default: true },
    { key: "showCounter", label: "Show image counter", type: "toggle", default: true },
  ],
  productVariantSelector: [
    { key: "heading", label: "Heading", type: "text", default: "Options" },
    { key: "showSwatches", label: "Show swatches", type: "toggle", default: true },
  ],
  productTypePanel: [
    { key: "showDetails", label: "Show type details", type: "toggle", default: true },
  ],
  productReviews: [
    { key: "heading", label: "Heading", type: "text", default: "Customer reviews" },
    { key: "showForm", label: "Show review form", type: "toggle", default: true },
    { key: "limit", label: "Reviews to show", type: "number", default: 6 },
  ],
  productRelations: [
    { key: "heading", label: "Heading", type: "text", default: "You may also like" },
    { key: "source", label: "Relationship", type: "select", default: "RELATED", options: [
      { value: "RELATED", label: "Related" },
      { value: "CROSS_SELL", label: "Cross-sells" },
      { value: "UP_SELL", label: "Up-sells" },
    ] },
    { key: "limit", label: "Products to show", type: "number", default: 4 },
  ],
  productBadges: [
    { key: "showSale", label: "Sale badge", type: "toggle", default: true },
    { key: "showStock", label: "Stock badge", type: "toggle", default: true },
    { key: "showType", label: "Type badge", type: "toggle", default: true },
  ],
  productBreadcrumbs: [
    { key: "showHome", label: "Show home link", type: "toggle", default: true },
  ],
  stickyPurchaseBar: [
    { key: "showOnDesktop", label: "Show on desktop", type: "toggle", default: false },
  ],
};

export function productBlockSettings(type: string): ProductBlockSetting[] {
  return PRODUCT_BLOCK_SETTINGS[type] ?? [];
}

export function productBlockSettingValue(
  block: Block,
  key: string,
): string | number | boolean | undefined {
  const setting = PRODUCT_BLOCK_SETTINGS[block.type]?.find((item) => item.key === key);
  const props = (block.props ?? {}) as Record<string, unknown>;
  const value = props[key];
  if (value === undefined) return setting?.default;
  if (setting?.type === "number") return Number(value);
  if (setting?.type === "toggle") return value === true || value === "true";
  return typeof value === "string" || typeof value === "number" ? value : String(value ?? "");
}

export function createProductBlock(type: string): Block | null {
  const defaults = PRODUCT_BLOCK_SETTINGS[type];
  if (!defaults) return null;
  const props: Record<string, unknown> = {};
  for (const setting of defaults) props[setting.key] = setting.default;
  return {
    id: `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    props,
  } as unknown as Block;
}
