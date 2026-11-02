export interface ProductCardTemplateSettings {
  imageAspect: "square" | "landscape" | "portrait";
  imageFit: "cover" | "contain";
  cardStyle: "bordered" | "shadow" | "minimal";
  radius: number;
  spacing: "compact" | "comfortable" | "spacious";
  cardBackground: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  buttonBackground: string;
  buttonText: string;
  showImage: boolean;
  showCategory: boolean;
  showTitle: boolean;
  showExcerpt: boolean;
  showRating: boolean;
  showPrice: boolean;
  showBadges: boolean;
  showWishlist: boolean;
  showQuickAdd: boolean;
  showAddToCart: boolean;
  addToCartLabel: string;
  quickAddLabel: string;
}

export const DEFAULT_PRODUCT_CARD_TEMPLATE: ProductCardTemplateSettings = {
  imageAspect: "landscape",
  imageFit: "cover",
  cardStyle: "shadow",
  radius: 14,
  spacing: "comfortable",
  cardBackground: "#ffffff",
  textColor: "#18181b",
  mutedColor: "#71717a",
  accentColor: "#dc2626",
  buttonBackground: "#18181b",
  buttonText: "#ffffff",
  showImage: true,
  showCategory: true,
  showTitle: true,
  showExcerpt: true,
  showRating: true,
  showPrice: true,
  showBadges: true,
  showWishlist: true,
  showQuickAdd: true,
  showAddToCart: true,
  addToCartLabel: "Add to cart",
  quickAddLabel: "Add to cart",
};

const HEX_COLOR = /^#[\da-f]{6}$/i;

export function normalizeProductCardTemplate(
  value: unknown,
): ProductCardTemplateSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_PRODUCT_CARD_TEMPLATE };
  }
  const raw = value as Record<string, unknown>;
  const enumValue = <T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
  ): T => allowed.includes(raw[key] as T) ? raw[key] as T : fallback;
  const color = (key: string, fallback: string) =>
    typeof raw[key] === "string" && HEX_COLOR.test(raw[key] as string)
      ? raw[key] as string
      : fallback;
  const label = (key: string, fallback: string) =>
    typeof raw[key] === "string" && raw[key].trim().length > 0
      ? raw[key].trim().slice(0, 40)
      : fallback;
  const boolean = (key: string, fallback: boolean) =>
    typeof raw[key] === "boolean" ? raw[key] : fallback;

  return {
    imageAspect: enumValue("imageAspect", ["square", "landscape", "portrait"], DEFAULT_PRODUCT_CARD_TEMPLATE.imageAspect),
    imageFit: enumValue("imageFit", ["cover", "contain"], DEFAULT_PRODUCT_CARD_TEMPLATE.imageFit),
    cardStyle: enumValue("cardStyle", ["bordered", "shadow", "minimal"], DEFAULT_PRODUCT_CARD_TEMPLATE.cardStyle),
    radius: typeof raw.radius === "number" && Number.isFinite(raw.radius)
      ? Math.min(32, Math.max(0, raw.radius))
      : DEFAULT_PRODUCT_CARD_TEMPLATE.radius,
    spacing: enumValue("spacing", ["compact", "comfortable", "spacious"], DEFAULT_PRODUCT_CARD_TEMPLATE.spacing),
    cardBackground: color("cardBackground", DEFAULT_PRODUCT_CARD_TEMPLATE.cardBackground),
    textColor: color("textColor", DEFAULT_PRODUCT_CARD_TEMPLATE.textColor),
    mutedColor: color("mutedColor", DEFAULT_PRODUCT_CARD_TEMPLATE.mutedColor),
    accentColor: color("accentColor", DEFAULT_PRODUCT_CARD_TEMPLATE.accentColor),
    buttonBackground: color("buttonBackground", DEFAULT_PRODUCT_CARD_TEMPLATE.buttonBackground),
    buttonText: color("buttonText", DEFAULT_PRODUCT_CARD_TEMPLATE.buttonText),
    showImage: boolean("showImage", DEFAULT_PRODUCT_CARD_TEMPLATE.showImage),
    showCategory: boolean("showCategory", DEFAULT_PRODUCT_CARD_TEMPLATE.showCategory),
    showTitle: boolean("showTitle", DEFAULT_PRODUCT_CARD_TEMPLATE.showTitle),
    showExcerpt: boolean("showExcerpt", DEFAULT_PRODUCT_CARD_TEMPLATE.showExcerpt),
    showRating: boolean("showRating", DEFAULT_PRODUCT_CARD_TEMPLATE.showRating),
    showPrice: boolean("showPrice", DEFAULT_PRODUCT_CARD_TEMPLATE.showPrice),
    showBadges: boolean("showBadges", DEFAULT_PRODUCT_CARD_TEMPLATE.showBadges),
    showWishlist: boolean("showWishlist", DEFAULT_PRODUCT_CARD_TEMPLATE.showWishlist),
    showQuickAdd: boolean("showQuickAdd", DEFAULT_PRODUCT_CARD_TEMPLATE.showQuickAdd),
    showAddToCart: boolean("showAddToCart", DEFAULT_PRODUCT_CARD_TEMPLATE.showAddToCart),
    addToCartLabel: label("addToCartLabel", DEFAULT_PRODUCT_CARD_TEMPLATE.addToCartLabel),
    quickAddLabel: label("quickAddLabel", DEFAULT_PRODUCT_CARD_TEMPLATE.quickAddLabel),
  };
}
