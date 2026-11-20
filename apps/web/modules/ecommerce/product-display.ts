import type { Metadata } from "next";
import { formatMoney, STORE_CURRENCY } from "./currency";
import type { EffectiveProductPrice } from "./pricing";
import type { PublicProduct } from "./types";
import type {
  ProductTemplateLink,
  ProductTemplateProductData,
  ProductTemplateReview,
  ProductTemplateVariant,
} from "@/lib/product-template/types";

export function assetUrl(assetId: string | null | undefined): string | null {
  return assetId ? `/api/assets/${assetId}` : null;
}

export function normalizeVariantAttributes(attributes: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!attributes) return result;
  if (Array.isArray(attributes)) {
    for (const entry of attributes) {
      if (typeof entry === "string") {
        const separator = entry.indexOf(":");
        if (separator > 0) {
          result[entry.slice(0, separator).trim()] = entry.slice(separator + 1).trim();
        }
        continue;
      }
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const name =
        typeof record.name === "string"
          ? record.name
          : typeof record.attributeId === "string"
            ? record.attributeId
            : typeof record.key === "string"
              ? record.key
              : null;
      const value =
        typeof record.value === "string"
          ? record.value
          : record.term && typeof record.term === "object" && "name" in record.term
            ? String((record.term as { name?: unknown }).name ?? "")
            : typeof record.customValue === "string"
              ? record.customValue
              : null;
      if (name && value) result[name] = value;
    }
    return result;
  }
  if (typeof attributes === "object") {
    for (const [key, value] of Object.entries(attributes)) {
      if (value === null || value === undefined || value === "") continue;
      result[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
    }
  }
  return result;
}

export interface ProductVariantOptionValue {
  value: string;
  imageAssetId: string | null;
}

export interface ProductVariantOption {
  name: string;
  values: ProductVariantOptionValue[];
}

export function getVariantOptions(
  variants: ProductTemplateVariant[] | ProductPublicVariantLike[],
): ProductVariantOption[] {
  const options: ProductVariantOption[] = [];
  for (const variant of variants) {
    const attributes = normalizeVariantAttributes(variant.attributes);
    for (const [name, value] of Object.entries(attributes)) {
      let option = options.find((item) => item.name === name);
      if (!option) {
        option = { name, values: [] };
        options.push(option);
      }
      if (!option.values.some((item) => item.value === value)) {
        option.values.push({ value, imageAssetId: variant.imageAssetId ?? null });
      }
    }
  }
  return options;
}

interface ProductPublicVariantLike {
  attributes: unknown;
  imageAssetId: string | null;
}

export function findMatchingVariant<T extends { attributes: unknown }>(
  variants: T[],
  options: Record<string, string>,
): T | null {
  if (Object.keys(options).length === 0) return null;
  return (
    variants.find((variant) => {
      const attributes = normalizeVariantAttributes(variant.attributes);
      return Object.entries(options).every(([key, value]) => attributes[key] === value);
    }) ?? null
  );
}

export function getInitialVariantOptions(
  variants: Array<{ attributes: unknown }>,
): Record<string, string> {
  return variants.length > 0 ? normalizeVariantAttributes(variants[0].attributes) : {};
}

export function getReviewSummary(product: PublicProduct) {
  const reviews = product.reviews ?? [];
  const count = reviews.length > 0 ? reviews.length : product.reviewCount;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  const average = reviews.length > 0 ? total / reviews.length : product.averageRating ?? 0;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));
  return { count, average, distribution, reviews };
}

export function getProductBadges(
  product: Pick<
    PublicProduct,
    | "featured"
    | "stockStatus"
    | "manageStock"
    | "stockQuantity"
    | "lowStockAmount"
    | "type"
    | "publishedAt"
    | "downloadable"
  >,
  effectivePrice: EffectiveProductPrice,
  now: Date = new Date(),
): string[] {
  const badges: string[] = [];
  const lowStockAmount = product.lowStockAmount ?? 5;
  if (effectivePrice.onSale) badges.push("Sale");
  if (product.featured) badges.push("Featured");
  if (product.stockStatus === "OUT_OF_STOCK") badges.push("Out of stock");
  else if (
    product.manageStock &&
    product.stockQuantity !== null &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= lowStockAmount
  ) {
    badges.push("Low stock");
  }
  if (product.type === "EXTERNAL") badges.push("External");
  else if (product.type === "SUBSCRIPTION") badges.push("Subscription");
  else if (product.type === "SERVICE") badges.push("Booking");
  else if (product.downloadable) badges.push("Digital");
  if (
    product.publishedAt &&
    now.getTime() - product.publishedAt.getTime() < 30 * 24 * 60 * 60 * 1000
  ) {
    badges.push("New");
  }
  return badges;
}

export function getStockLabel(
  stockStatus: string,
  manageStock: boolean,
  stockQuantity: number | null,
  backorders: string,
  lowStockAmount: number | null | undefined = 5,
): string {
  if (stockStatus === "OUT_OF_STOCK") {
    return backorders === "yes" || backorders === "notify" ? "Available on backorder" : "Out of stock";
  }
  if (stockStatus === "ON_BACKORDER") return "Available on backorder";
  if (!manageStock || stockQuantity === null) return "In stock";
  if (stockQuantity <= 0) return "Out of stock";
  if (stockQuantity <= (lowStockAmount ?? 5)) return `Only ${stockQuantity} left`;
  return "In stock";
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildProductJsonLd(
  product: PublicProduct,
  siteUrl: string,
  now: Date = new Date(),
): Record<string, unknown> {
  const url = product.canonicalUrl || `${siteUrl.replace(/\/$/, "")}/${product.slug}`;
  const images = product.images.map((image) => {
    const path = image.asset.url ?? assetUrl(image.assetId);
    if (!path) return null;
    return path.startsWith("http") ? path : `${siteUrl.replace(/\/$/, "")}${path}`;
  }).filter((image): image is string => Boolean(image));
  const availability =
    product.stockStatus === "OUT_OF_STOCK"
      ? "https://schema.org/OutOfStock"
      : product.stockStatus === "ON_BACKORDER"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock";
  const summary = getReviewSummary(product);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: stripHtml(product.description || product.shortDescription) || undefined,
    sku: product.sku ?? undefined,
    image: images.length > 0 ? images : undefined,
    url,
    additionalType: product.type,
    brand: { "@type": "Brand", name: product.attributes[0]?.attribute.name ?? "Canopy" },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: STORE_CURRENCY,
      price: product.effectivePrice.price.toFixed(2),
      availability,
      priceValidUntil:
        product.effectivePrice.saleEndsAt && product.effectivePrice.saleEndsAt > now
          ? product.effectivePrice.saleEndsAt.toISOString()
          : undefined,
    },
  };

  if (summary.count > 0 && summary.average > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: summary.average.toFixed(1),
      reviewCount: summary.count,
    };
  }

  return jsonLd;
}

export function buildProductMetadata(
  product: PublicProduct,
  siteUrl: string,
): Metadata {
  const url = product.canonicalUrl || `${siteUrl.replace(/\/$/, "")}/${product.slug}`;
  const description =
    product.metaDesc || stripHtml(product.shortDescription || product.description) || undefined;
  const mainImage =
    product.ogImage ||
    product.images.find((image) => image.isMain)?.asset.url ||
    product.images[0]?.asset.url ||
    assetUrl(product.images.find((image) => image.isMain)?.assetId ?? product.images[0]?.assetId);
  const openGraphImage = mainImage
    ? mainImage.startsWith("http")
      ? mainImage
      : `${siteUrl.replace(/\/$/, "")}${mainImage}`
    : undefined;

  return {
    title: product.seoTitle || product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.seoTitle || product.name,
      description,
      url,
      type: "website",
      images: openGraphImage ? [{ url: openGraphImage, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.seoTitle || product.name,
      description,
      images: openGraphImage ? [openGraphImage] : undefined,
    },
    robots: {
      index: product.status === "PUBLISHED" && product.visibility === "PUBLIC",
      follow: true,
    },
  };
}

export function getSpecifications(
  product: PublicProduct,
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (product.sku) rows.push({ label: "SKU", value: product.sku });
  if (product.weight !== null) rows.push({ label: "Weight", value: `${product.weight}` });
  if (product.length !== null) rows.push({ label: "Length", value: `${product.length}` });
  if (product.width !== null) rows.push({ label: "Width", value: `${product.width}` });
  if (product.height !== null) rows.push({ label: "Height", value: `${product.height}` });
  if (product.shippingClass) rows.push({ label: "Shipping class", value: product.shippingClass.name });
  if (product.taxClass) rows.push({ label: "Tax class", value: product.taxClass });
  return rows;
}

export function toTemplateProductData(
  product: PublicProduct,
  siteUrl = "",
): ProductTemplateProductData {
  const variants: ProductTemplateVariant[] = product.variants.map((variant) => ({
    id: variant.id,
    name: variant.name || Object.values(normalizeVariantAttributes(variant.attributes)).join(" / "),
    sku: variant.sku,
    regularPrice: variant.regularPrice,
    salePrice: variant.salePrice,
    price:
      variant.salePrice !== null && variant.salePrice !== undefined
        ? variant.salePrice
        : variant.price,
    onSale: variant.salePrice !== null && variant.salePrice !== undefined,
    stockStatus: variant.stockStatus,
    stockQuantity: variant.stockQuantity,
    manageStock: variant.manageStock,
    backorders: variant.backorders,
    lowStockAmount: variant.lowStockAmount,
    weight: variant.weight,
    length: variant.length,
    width: variant.width,
    height: variant.height,
    imageAssetId: variant.imageAssetId,
    attributes: normalizeVariantAttributes(variant.attributes),
    description: variant.description,
    virtual: variant.virtual,
    downloadable: variant.downloadable,
  }));

  const links: ProductTemplateLink[] = (product.links ?? []).map((link) => {
    const image = link.linkedProduct.images.find((item) => item.isMain) ?? link.linkedProduct.images[0];
    return {
      id: link.id,
      type: String(link.type),
      position: link.position,
      product: {
        id: link.linkedProduct.id,
        name: link.linkedProduct.name,
        slug: link.linkedProduct.slug,
        sku: link.linkedProduct.sku,
        price: link.linkedProduct.price,
        imageAssetId: image?.assetId ?? null,
        imageAlt: image?.alt ?? link.linkedProduct.name,
      },
    };
  });

  const reviews: ProductTemplateReview[] = (product.reviews ?? []).map((review) => ({
    id: review.id,
    authorName: review.authorName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
  }));

  const effectivePrice = {
    price: product.effectivePrice.price,
    regularPrice: product.effectivePrice.regularPrice,
    salePrice: product.effectivePrice.salePrice,
    onSale: product.effectivePrice.onSale,
    saleEndsAt: product.effectivePrice.saleEndsAt?.toISOString() ?? null,
  };

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    description: product.description,
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
    stockStatus: product.stockStatus,
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    images: product.images.map((image) => ({
      id: image.id,
      assetId: image.assetId,
      alt: image.alt,
      isMain: image.isMain,
      position: image.position,
    })),
    customFields: product.customFields.map((field) => ({
      key: field.key,
      label: field.label,
      value: field.value,
      group: field.group,
    })),
    attributes: product.attributes.map((attribute) => ({
      id: attribute.id,
      attributeId: attribute.attributeId,
      name: attribute.attribute.name,
      value: attribute.term?.name ?? attribute.customValue ?? "",
    })),
    type: String(product.type),
    effectivePrice,
    variants,
    categories: product.categories.map((category) => ({
      id: category.category.id,
      name: category.category.name,
      slug: category.category.slug,
      isPrimary: category.isPrimary,
    })),
    links,
    reviews,
    stockQuantity: product.stockQuantity,
    manageStock: product.manageStock,
    backorders: product.backorders,
    lowStockAmount: product.lowStockAmount,
    featured: product.featured,
    virtual: product.virtual,
    downloadable: product.downloadable,
    shippingRequired: product.shippingRequired,
    taxStatus: String(product.taxStatus),
    taxClass: product.taxClass,
    shippingClassId: product.shippingClassId,
    externalUrl: product.externalUrl,
    externalButtonText: product.externalButtonText,
    subscriptionPeriod: product.subscriptionPeriod,
    subscriptionInterval: product.subscriptionInterval,
    subscriptionLength: product.subscriptionLength,
    subscriptionSignUpFee: product.subscriptionSignUpFee,
    serviceDuration: product.serviceDuration,
    serviceLocation: product.serviceLocation,
    reviewsAllowed: product.reviewsAllowed,
    purchaseNote: product.purchaseNote,
    seoTitle: product.seoTitle,
    metaDesc: product.metaDesc,
    ogImage: product.ogImage,
    canonicalUrl: product.canonicalUrl,
    productUrl: product.canonicalUrl || `${siteUrl.replace(/\/$/, "")}/${product.slug}`,
  };
}

export function formatProductPrice(amount: number, currency = STORE_CURRENCY): string {
  return formatMoney(amount, currency);
}

export function isPurchasableProduct(product: PublicProduct): boolean {
  if (product.type === "EXTERNAL") return Boolean(product.externalUrl);
  return product.type !== "GROUPED" && product.type !== "BUNDLE";
}
