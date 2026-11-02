import type { ProductTemplateProductData } from "./types";

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
): string | null {
  if (binding === "productUrl") return `/${product.slug}`;
  if (binding === "mainImage") {
    const image = product.images[0];
    return image ? `/api/assets/${image.assetId}` : null;
  }
  if (binding.startsWith("customFields.")) {
    const key = binding.slice("customFields.".length);
    return product.customFields.find((field) => field.key === key)?.value ?? null;
  }
  if (binding.startsWith("attributes.")) {
    const id = binding.slice("attributes.".length);
    return product.attributes.find((attribute) => attribute.attributeId === id)?.value ?? null;
  }

  const value = product[binding as keyof ProductTemplateProductData];
  if (value === null || value === undefined || typeof value === "object") return null;
  return String(value);
}
