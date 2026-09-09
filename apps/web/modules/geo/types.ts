/**
 * Geo Module — Types
 * 
 * Defines types for geographic targeting (regions, geo-images).
 */

/** Area part enum */
export type AreaPart = "ALL" | "NORTHERN" | "SOUTHERN" | "EASTERN" | "WESTERN" | "CENTRAL";

/** Region with details */
export interface RegionWithDetails {
  id: string;
  state: string;
  stateFull: string;
  city: string | null;
  areaPart: AreaPart | null;
  slug: string;
  custom1: string | null;
  custom2: string | null;
  priority: number;
  tenantId: string;
}

/** Geo category image */
export interface GeoImage {
  id: string;
  categoryId: string | null;
  regionId: string | null;
  imageAssetId: string;
  position: string;
  order: number;
  isPrimary: boolean;
  tenantId: string;
  createdAt: Date;
}

/** Geo image with relations */
export interface GeoImageWithRelations extends GeoImage {
  category?: { id: string; title: string } | null;
  region?: { id: string; state: string; city: string | null } | null;
}

/** Region query filters */
export interface RegionFilter {
  state?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Geo image query filters */
export interface GeoImageFilter {
  categoryId?: string;
  state?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated response */
export interface PaginatedGeo<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
