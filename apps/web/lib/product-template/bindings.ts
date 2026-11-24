import type { ProductTemplateProductData, ProductTemplateVariant } from "./types";

export interface ProductBindingField {
  key: string;
  label: string;
}

const CORE_PRODUCT_BINDINGS: ProductBindingField[] = [
  { key: "name", label: "Product name" },
  { key: "slug", label: "Product URL slug" },
  { key: "productUrl", label: "Product page URL" },
  { key: "mainImage", label: "Main product image" },
  { key: "sku", label: "SKU" },
  { key: "shortDescription", label: "Short description" },
  { key: "description", label: "Full description" },
  { key: "regularPrice", label: "Regular price" },
  { key: "salePrice", label: "Sale price" },
  { key: "stockStatus", label: "Stock status" },
  { key: "averageRating", label: "Average rating" },
  { key: "reviewCount", label: "Review count" },
  { key: "weight", label: "Weight" },
  { key: "length", label: "Length" },
  { key: "width", label: "Width" },
  { key: "height", label: "Height" },
  { key: "productType", label: "Product type" },
  { key: "price", label: "Effective price" },
  { key: "saleEndsAt", label: "Sale end date" },
  { key: "stockQuantity", label: "Stock quantity" },
  { key: "primaryCategory", label: "Primary category" },
  { key: "externalUrl", label: "External product URL" },
  { key: "externalButtonText", label: "External button label" },
  { key: "subscriptionPeriod", label: "Subscription period" },
  { key: "serviceDuration", label: "Service duration" },
  { key: "seoTitle", label: "SEO title" },
  { key: "metaDesc", label: "Meta description" },
];

const BINDABLE_TARGETS: Record<string, Array<{ key: string; label: string }>> = {
  hero: [
    { key: "heading", label: "Heading" },
    { key: "subheading", label: "Subheading" },
    { key: "bgImage", label: "Background image" },
  ],
  text: [{ key: "content", label: "Text content" }],
  heading: [{ key: "text", label: "Heading text" }],
  image: [
    { key: "src", label: "Image source" },
    { key: "alt", label: "Alt text" },
    { key: "caption", label: "Caption" },
  ],
  cta: [
    { key: "heading", label: "Heading" },
    { key: "body", label: "Body" },
    { key: "buttonText", label: "Button text" },
    { key: "buttonUrl", label: "Button URL" },
    { key: "bgImage", label: "Background image" },
  ],
  button: [
    { key: "text", label: "Button text" },
    { key: "url", label: "Button URL" },
  ],
  features: [{ key: "heading", label: "Heading" }],
  faq: [{ key: "heading", label: "Heading" }],
  testimonial: [{ key: "heading", label: "Heading" }],
  productGrid: [{ key: "heading", label: "Heading" }],
  contentGrid: [{ key: "heading", label: "Heading" }],
  productTitle: [{ key: "text", label: "Title text" }],
  productPrice: [{ key: "content", label: "Price content" }],
  productGallery: [{ key: "images", label: "Gallery images" }],
  productVariantSelector: [{ key: "heading", label: "Selector heading" }],
  productTypePanel: [{ key: "content", label: "Panel content" }],
  productReviews: [{ key: "heading", label: "Reviews heading" }],
  productRelations: [{ key: "heading", label: "Products heading" }],
  productBadges: [{ key: "content", label: "Badges" }],
  productBreadcrumbs: [{ key: "content", label: "Breadcrumbs" }],
  stickyPurchaseBar: [{ key: "content", label: "Bar content" }],
};

export function productBindingTargets(blockType: string) {
  return BINDABLE_TARGETS[blockType] ?? [];
}

export function productBindingFields(product?: ProductTemplateProductData): ProductBindingField[] {
  const customFields = (product?.customFields ?? []).map((field) => ({
    key: `customFields.${field.key}`,
    label: field.group ? `${field.group}: ${field.label}` : field.label,
  }));
  const attributes = (product?.attributes ?? []).map((attribute) => ({
    key: `attributes.${attribute.attributeId}`,
    label: `Attribute: ${attribute.name}`,
  }));
  return [...CORE_PRODUCT_BINDINGS, ...customFields, ...attributes];
}

export function resolveProductBinding(
  product: ProductTemplateProductData,
  binding: string,
  selectedVariant?: ProductTemplateVariant | null,
): string | null {
  if (binding === "productUrl") return product.productUrl ?? `/${product.slug}`;
  if (binding === "mainImage") {
    if (selectedVariant?.imageAssetId) return `/api/assets/${selectedVariant.imageAssetId}/`;
    const image =
      product.images.find((item) => item.isMain) ?? product.images[0];
    return image ? `/api/assets/${image.assetId}/` : null;
  }
  if (binding === "price") {
    if (selectedVariant) return String(selectedVariant.price);
    return String(product.effectivePrice?.price ?? product.salePrice ?? product.regularPrice ?? 0);
  }
  if (binding === "regularPrice" && selectedVariant) {
    return String(selectedVariant.regularPrice);
  }
  if (binding === "salePrice" && selectedVariant) {
    return selectedVariant.salePrice === null ? null : String(selectedVariant.salePrice);
  }
  if (binding === "stockStatus" && selectedVariant) return selectedVariant.stockStatus;
  if (binding === "stockQuantity" && selectedVariant) {
    return selectedVariant.stockQuantity === null ? null : String(selectedVariant.stockQuantity);
  }
  if (binding === "description" && selectedVariant) return selectedVariant.description;
  if (binding === "saleEndsAt") return product.effectivePrice?.saleEndsAt ?? null;
  if (binding === "productType") return product.type ?? "SIMPLE";
  if (binding === "primaryCategory") {
    return (
      product.categories?.find((category) => category.isPrimary)?.name ??
      product.categories?.[0]?.name ??
      null
    );
  }
  if (binding.startsWith("customFields.")) {
    const key = binding.slice("customFields.".length);
    return product.customFields.find((field) => field.key === key)?.value ?? null;
  }
  if (binding.startsWith("attributes.")) {
    const id = binding.slice("attributes.".length);
    if (selectedVariant) {
      const variantAttribute = product.attributes.find((attribute) => attribute.attributeId === id);
      const variantValue =
        selectedVariant.attributes[id] ??
        (variantAttribute ? selectedVariant.attributes[variantAttribute.name] : undefined);
      if (variantValue !== undefined) return variantValue;
    }
    return product.attributes.find((attribute) => attribute.attributeId === id)?.value ?? null;
  }

  if (selectedVariant) {
    const variantValue = selectedVariant[binding as keyof ProductTemplateVariant];
    if (variantValue !== null && variantValue !== undefined && typeof variantValue !== "object") {
      return String(variantValue);
    }
  }
  const value = product[binding as keyof ProductTemplateProductData];
  if (value === null || value === undefined || typeof value === "object") return null;
  return String(value);
}
