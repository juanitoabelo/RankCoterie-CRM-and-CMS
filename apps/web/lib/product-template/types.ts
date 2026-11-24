import type { Block, ProductTemplateTabData } from "@/lib/page-builder/types";
import {
  DEFAULT_CONTAINER_SETTINGS as DEFAULT_BLOG_CONTAINER_SETTINGS,
  type ContainerSettings as BlogContainerSettings,
} from "@/lib/blog-template/types";

export type ProductTemplateTab = ProductTemplateTabData;

export interface ProductTemplatePrice {
  price: number;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  saleEndsAt: string | null;
}

export interface ProductTemplateVariant {
  id: string;
  name: string;
  sku: string | null;
  regularPrice: number;
  salePrice: number | null;
  price: number;
  onSale: boolean;
  stockStatus: string;
  stockQuantity: number | null;
  manageStock: boolean;
  backorders: string;
  lowStockAmount?: number | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  imageAssetId: string | null;
  attributes: Record<string, string>;
  description: string | null;
  virtual: boolean;
  downloadable: boolean;
}

export interface ProductTemplateReview {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
}

export interface ProductTemplateLink {
  id: string;
  type: string;
  position: number;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    type?: string;
    price: number;
    imageAssetId: string | null;
    imageAlt: string | null;
  };
}

export interface ProductTemplateProductData {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  regularPrice: number;
  salePrice: number | null;
  stockStatus: string;
  averageRating: number | null;
  reviewCount: number;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  images: Array<{ id: string; assetId: string; alt: string | null; isMain?: boolean; position?: number }>;
  customFields: Array<{ key: string; label: string; value: string; group: string | null }>;
  attributes: Array<{ id: string; attributeId: string; name: string; value: string }>;
  type?: string;
  effectivePrice?: ProductTemplatePrice;
  variants?: ProductTemplateVariant[];
  categories?: Array<{ id: string; name: string; slug: string; isPrimary: boolean }>;
  links?: ProductTemplateLink[];
  reviews?: ProductTemplateReview[];
  stockQuantity?: number | null;
  manageStock?: boolean;
  backorders?: string;
  lowStockAmount?: number | null;
  featured?: boolean;
  virtual?: boolean;
  downloadable?: boolean;
  shippingRequired?: boolean;
  taxStatus?: string;
  taxClass?: string | null;
  shippingClassId?: string | null;
  externalUrl?: string | null;
  externalButtonText?: string | null;
  subscriptionPeriod?: string | null;
  subscriptionInterval?: number | null;
  subscriptionLength?: number | null;
  subscriptionSignUpFee?: number | null;
  serviceDuration?: number | null;
  serviceLocation?: string | null;
  reviewsAllowed?: boolean;
  purchaseNote?: string | null;
  seoTitle?: string | null;
  metaDesc?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  productUrl?: string;
}

export type ContainerSettings = BlogContainerSettings;
export const DEFAULT_CONTAINER_SETTINGS: ContainerSettings = {
  ...DEFAULT_BLOG_CONTAINER_SETTINGS,
  width: "boxed",
};

export interface ProductTemplateData {
  blocks: Block[];
  containerSettings: ContainerSettings;
}