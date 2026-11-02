import type { Block, ProductTemplateTabData } from "@/lib/page-builder/types";
import {
  DEFAULT_CONTAINER_SETTINGS as DEFAULT_BLOG_CONTAINER_SETTINGS,
  type ContainerSettings as BlogContainerSettings,
} from "@/lib/blog-template/types";

export type ProductTemplateTab = ProductTemplateTabData;

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
  images: Array<{ id: string; assetId: string; alt: string | null }>;
  customFields: Array<{ key: string; label: string; value: string; group: string | null }>;
  attributes: Array<{ id: string; attributeId: string; name: string; value: string }>;
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