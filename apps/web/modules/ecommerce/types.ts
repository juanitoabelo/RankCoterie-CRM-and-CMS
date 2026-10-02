/**
 * E-Commerce Module — Types
 * 
 * Comprehensive type definitions for e-commerce operations.
 * Matches Prisma schema exactly for type safety.
 */

import type { ProductType, ProductStatus, ProductVisibility, StockStatus, OrderStatus, PaymentStatus, PaymentGatewayType, CouponType, ShippingMethodType, TaxCalculationMethod } from "@prisma/client";

// ============================================================================
// Enums (re-exported from Prisma for convenience)
// ============================================================================

export type { ProductType, ProductStatus, ProductVisibility, StockStatus, OrderStatus, PaymentStatus, PaymentGatewayType, CouponType, ShippingMethodType, TaxCalculationMethod };

// ============================================================================
// Core Entity Types
// ============================================================================

export interface ProductCategoryWithRelations {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parent?: ProductCategoryWithRelations | null;
  children?: ProductCategoryWithRelations[];
  imageAssetId: string | null;
  imageAsset?: { id: string; filename: string | null; url?: string } | null;
  displayType: string | null;
  menuOrder: number;
  isActive: boolean;
  showInMenu: boolean;
  seoTitle: string | null;
  metaDesc: string | null;
  focusKeyphrase: string | null;
  ogImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { products: number };
}

export interface ProductAttributeWithTerms {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: string;
  order: number;
  isVariation: boolean;
  isVisible: boolean;
  isFilterable: boolean;
  terms: ProductAttributeTerm[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAttributeTerm {
  id: string;
  attributeId: string;
  name: string;
  slug: string;
  description: string | null;
  menuOrder: number;
  count: number;
  imageAssetId: string | null;
  imageAsset?: { id: string; filename: string | null; url?: string } | null;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImageWithAsset {
  id: string;
  productId: string;
  assetId: string;
  asset: { id: string; filename: string | null; url?: string; width?: number | null; height?: number | null; mimeType?: string };
  alt: string | null;
  position: number;
  isMain: boolean;
  createdAt: Date;
}

export interface ProductAttributeValueWithTerm {
  id: string;
  productId: string;
  attributeId: string;
  attribute: { id: string; name: string; slug: string; type: string };
  termId: string | null;
  term: ProductAttributeTerm | null;
  customValue: string | null;
  isVisible: boolean;
  isVariation: boolean;
  position: number;
}

export interface ProductVariantWithRelations {
  id: string;
  productId: string;
  sku: string | null;
  name: string | null;
  regularPrice: number;
  salePrice: number | null;
  price: number;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  manageStock: boolean;
  backorders: string;
  lowStockAmount: number | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  imageAssetId: string | null;
  imageAsset?: { id: string; filename: string | null; url?: string } | null;
  downloadable: boolean;
  downloadLimit: number | null;
  downloadExpiry: number | null;
  downloadFiles: unknown;
  virtual: boolean;
  description: string | null;
  purchaseNote: string | null;
  menuOrder: number;
  attributes: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCustomField {
  id: string;
  productId: string;
  key: string;
  label: string;
  value: string;
  type: string;
  options: unknown | null;
  group: string | null;
  position: number;
  isPublic: boolean;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithRelations {
  id: string;
  tenantId: string;
  type: ProductType;
  status: ProductStatus;
  visibility: ProductVisibility;
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  regularPrice: number;
  salePrice: number | null;
  salePriceStart: Date | null;
  salePriceEnd: Date | null;
  price: number;
  taxStatus: TaxCalculationMethod;
  taxClass: string | null;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  manageStock: boolean;
  backorders: string;
  lowStockAmount: number | null;
  soldIndividually: boolean;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  shippingClassId: string | null;
  shippingRequired: boolean;
  shippingTaxable: boolean;
  externalUrl: string | null;
  externalButtonText: string | null;
  subscriptionPeriod: string | null;
  subscriptionInterval: number | null;
  subscriptionLength: number | null;
  subscriptionTrialPeriod: number | null;
  subscriptionSignUpFee: number | null;
  membershipAccess: string | null;
  membershipDuration: string | null;
  serviceDuration: number | null;
  serviceBufferBefore: number | null;
  serviceBufferAfter: number | null;
  serviceMaxBookings: number | null;
  serviceLocation: string | null;
  serviceCalendarId: string | null;
  commissionRate: number | null;
  commissionType: string | null;
  vendorId: string | null;
  downloadable: boolean;
  downloadLimit: number | null;
  downloadExpiry: number | null;
  downloadFiles: unknown;
  virtual: boolean;
  reviewsAllowed: boolean;
  averageRating: number | null;
  reviewCount: number;
  seoTitle: string | null;
  metaDesc: string | null;
  focusKeyphrase: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  purchaseNote: string | null;
  menuOrder: number;
  featured: boolean;
  catalogVisibility: string;
  dateOnSaleFrom: Date | null;
  dateOnSaleTo: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  categories: Array<{ id: string; productId: string; categoryId: string; isPrimary: boolean; position: number; category: ProductCategoryWithRelations }>;
  attributes: ProductAttributeValueWithTerm[];
  images: ProductImageWithAsset[];
  variants: ProductVariantWithRelations[];
  customFields: ProductCustomField[];
  tags: Array<{ id: string; productId: string; tagId: string }>;
  shippingClass?: { id: string; name: string; slug: string } | null;
  relatedProducts?: { linkedProduct: Pick<ProductWithRelations, "id" | "name" | "slug" | "price" | "images"> }[];
  crossSellProducts?: { linkedProduct: Pick<ProductWithRelations, "id" | "name" | "slug" | "price" | "images"> }[];
  upSellProducts?: { linkedProduct: Pick<ProductWithRelations, "id" | "name" | "slug" | "price" | "images"> }[];
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  type: ProductType;
  status: ProductStatus;
  visibility: ProductVisibility;
  price: number;
  regularPrice: number;
  salePrice: number | null;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  manageStock: boolean;
  downloadable: boolean;
  virtual: boolean;
  shippingRequired: boolean;
  featured: boolean;
  catalogVisibility: string;
  images: ProductImageWithAsset[];
  mainImage: ProductImageWithAsset | null;
  categories: Pick<ProductCategoryWithRelations, "id" | "name" | "slug">[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategoryListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageAsset: { id: string; filename: string | null; url?: string } | null;
  productCount: number;
  menuOrder: number;
  isActive: boolean;
  children?: ProductCategoryListItem[];
}

// ============================================================================
// Cart Types
// ============================================================================

export interface CartWithItems {
  id: string;
  tenantId: string;
  sessionId: string | null;
  userId: string | null;
  currency: string;
  couponCode: string | null;
  coupon: CouponWithRelations | null;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  itemCount: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemWithRelations[];
}

export interface CartItemWithRelations {
  id: string;
  cartId: string;
  productId: string;
  product: Pick<ProductListItem, "id" | "name" | "slug" | "price" | "regularPrice" | "salePrice" | "stockStatus" | "manageStock" | "stockQuantity" | "images" | "type" | "downloadable" | "virtual" | "shippingRequired">;
  variantId: string | null;
  variant: Pick<ProductVariantWithRelations, "id" | "name" | "sku" | "price" | "regularPrice" | "salePrice" | "stockStatus" | "stockQuantity" | "manageStock" | "imageAsset" | "attributes"> | null;
  quantity: number;
  price: number;
  lineTotal: number;
  taxTotal: number;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Order Types
// ============================================================================

export interface OrderWithRelations {
  id: string;
  tenantId: string;
  orderNumber: string;
  parentOrderId: string | null;
  customerId: string | null;
  customer?: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
  userId: string | null;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  guestEmail: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: string;
  currency: string;
  currencyRate: number;
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  discountTotal: number;
  feeTotal: number;
  total: number;
  refundedAmount: number;
  paymentGatewayId: string | null;
  paymentGateway?: { id: string; name: string; type: PaymentGatewayType } | null;
  paymentMethod: string | null;
  paymentMethodTitle: string | null;
  transactionId: string | null;
  billingFirstName: string | null;
  billingLastName: string | null;
  billingCompany: string | null;
  billingAddress1: string | null;
  billingAddress2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostcode: string | null;
  billingCountry: string | null;
  billingPhone: string | null;
  billingEmail: string | null;
  shippingFirstName: string | null;
  shippingLastName: string | null;
  shippingCompany: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostcode: string | null;
  shippingCountry: string | null;
  shippingPhone: string | null;
  shippingMethod: string | null;
  shippingMethodId: string | null;
  shippingTaxRate: number | null;
  customerNote: string | null;
  adminNote: string | null;
  paidAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  meta: unknown;
  items: OrderItemWithRelations[];
  transactions?: PaymentTransactionWithRelations[];
  notes?: OrderNote[];
  refunds?: RefundWithRelations[];
  shipments?: ShipmentWithRelations[];
}

export interface OrderItemWithRelations {
  id: string;
  orderId: string;
  productId: string;
  product: Pick<ProductListItem, "id" | "name" | "slug" | "type" | "images">;
  variantId: string | null;
  variant: Pick<ProductVariantWithRelations, "id" | "name" | "sku" | "attributes"> | null;
  parentItemId: string | null;
  name: string;
  sku: string | null;
  type: ProductType;
  quantity: number;
  price: number;
  lineSubtotal: number;
  lineSubtotalTax: number;
  lineTotal: number;
  lineTax: number;
  taxClass: string | null;
  taxRate: number | null;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: string;
  customerName: string | null;
  customerEmail: string | null;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: Date;
  paidAt: Date | null;
}

export interface OrderNote {
  id: string;
  orderId: string;
  userId: string | null;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  type: string;
  content: string;
  isCustomerVisible: boolean;
  createdAt: Date;
}

export interface RefundWithRelations {
  id: string;
  orderId: string;
  amount: number;
  reason: string | null;
  status: string;
  gatewayRefundId: string | null;
  refundedById: string | null;
  refundedBy?: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  items: unknown;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ShipmentWithRelations {
  id: string;
  orderId: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  status: string;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  shippingAddress: unknown;
  items: unknown;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface PaymentGatewayWithRelations {
  id: string;
  tenantId: string;
  type: PaymentGatewayType;
  name: string;
  slug: string;
  isEnabled: boolean;
  isTestMode: boolean;
  priority: number;
  config: unknown;
  supportedCurrencies: string[];
  supportedCountries: string[];
  minAmount: number | null;
  maxAmount: number | null;
  allowedProductTypes: ProductType[];
  connectAccountId: string | null;
  connectOnboardingComplete: boolean;
  webhookSecret: string | null;
  webhookUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransactionWithRelations {
  id: string;
  tenantId: string;
  gatewayId: string;
  gateway?: PaymentGatewayWithRelations;
  orderId: string | null;
  order?: Pick<OrderListItem, "id" | "orderNumber" | "total" | "currency"> | null;
  customerId: string | null;
  customer?: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayTransactionId: string | null;
  gatewayResponse: unknown;
  refundedAmount: number;
  refundedAt: Date | null;
  refundReason: string | null;
  description: string | null;
  metadata: unknown;
  errorMessage: string | null;
  errorCode: string | null;
  requiresAction: boolean;
  actionUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Coupon Types
// ============================================================================

export interface CouponWithRelations {
  id: string;
  tenantId: string;
  code: string;
  type: CouponType;
  amount: number;
  description: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  individualUse: boolean;
  excludeSaleItems: boolean;
  usageLimit: number | null;
  usageLimitPerUser: number;
  usedCount: number;
  productIds: string[];
  excludedProductIds: string[];
  categoryIds: string[];
  excludedCategoryIds: string[];
  startDate: Date | null;
  endDate: Date | null;
  freeShipping: boolean;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface SubscriptionWithRelations {
  id: string;
  tenantId: string;
  orderId: string;
  order: Pick<OrderListItem, "id" | "orderNumber" | "status" | "paymentStatus" | "total" | "currency" | "paidAt" | "createdAt">;
  customerId: string;
  customer: { id: string; firstName: string | null; lastName: string | null; email: string | null };
  productId: string;
  product: Pick<ProductListItem, "id" | "name" | "slug" | "type">;
  variantId: string | null;
  variant: Pick<ProductVariantWithRelations, "id" | "name" | "sku"> | null;
  gatewaySubscriptionId: string | null;
  gatewayId: string | null;
  gateway: PaymentGatewayWithRelations | null;
  status: string;
  interval: string;
  intervalCount: number;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  endedAt: Date | null;
  amount: number;
  currency: string;
  quantity: number;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Commission Types
// ============================================================================

export interface CommissionWithRelations {
  id: string;
  tenantId: string;
  orderId: string;
  order: Pick<OrderListItem, "id" | "orderNumber" | "total" | "status">;
  productId: string;
  product: Pick<ProductListItem, "id" | "name" | "slug">;
  vendorId: string;
  vendor: { id: string; email: string; firstName: string | null; lastName: string | null };
  affiliateId: string | null;
  affiliate: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  amount: number;
  rate: number;
  type: string;
  status: string;
  payoutId: string | null;
  paidAt: Date | null;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Tax Rate Types
// ============================================================================

export interface TaxRate {
  id: string;
  tenantId: string;
  name: string | null;
  country: string;
  state: string | null;
  rate: number;
  priority: number;
  createdAt: Date;
}

// ============================================================================
// Query Filter Types
// ============================================================================

export interface ProductFilter {
  status?: ProductStatus | "ALL";
  type?: ProductType | "ALL";
  visibility?: ProductVisibility | "ALL";
  featured?: boolean;
  categoryId?: string;
  tagId?: string;
  vendorId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sortBy?: "name" | "price" | "date" | "popularity" | "rating" | "menuOrder";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface CategoryFilter {
  parentId?: string | null;
  isActive?: boolean;
  showInMenu?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderFilter {
  status?: OrderStatus | "ALL";
  paymentStatus?: PaymentStatus | "ALL";
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minTotal?: number;
  maxTotal?: number;
  search?: string; // order number, customer name, email
  sortBy?: "date" | "total" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface CartFilter {
  sessionId?: string;
  userId?: string;
  abandoned?: boolean; // carts older than X hours with items
  page?: number;
  pageSize?: number;
}

export interface PaymentGatewayFilter {
  isEnabled?: boolean;
  type?: PaymentGatewayType;
}

export interface CommissionFilter {
  vendorId?: string;
  affiliateId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface SubscriptionFilter {
  customerId?: string;
  productId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Paginated Response
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Action Result Types
// ============================================================================

export type ActionResult = { ok: true; data?: unknown } | { ok: false; error: string };

export interface ProductFormInput {
  name: string;
  slug: string;
  type: ProductType;
  status: ProductStatus;
  visibility: ProductVisibility;
  sku: string;
  shortDescription: string;
  description: string;
  regularPrice: number;
  salePrice: number | null;
  salePriceStart: Date | null;
  salePriceEnd: Date | null;
  taxStatus: TaxCalculationMethod;
  taxClass: string;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders: string;
  lowStockAmount: number | null;
  soldIndividually: boolean;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  shippingClassId: string | null;
  shippingRequired: boolean;
  shippingTaxable: boolean;
  externalUrl: string | null;
  externalButtonText: string;
  subscriptionPeriod: string | null;
  subscriptionInterval: number | null;
  subscriptionLength: number | null;
  subscriptionTrialPeriod: number | null;
  subscriptionSignUpFee: number | null;
  membershipAccess: string | null;
  membershipDuration: string | null;
  serviceDuration: number | null;
  serviceBufferBefore: number | null;
  serviceBufferAfter: number | null;
  serviceMaxBookings: number | null;
  serviceLocation: string | null;
  serviceCalendarId: string | null;
  commissionRate: number | null;
  commissionType: string | null;
  vendorId: string | null;
  downloadable: boolean;
  downloadLimit: number | null;
  downloadExpiry: number | null;
  downloadFiles: unknown[];
  virtual: boolean;
  reviewsAllowed: boolean;
  purchaseNote: string;
  menuOrder: number;
  featured: boolean;
  catalogVisibility: string;
  stockStatus: StockStatus;
  dateOnSaleFrom: Date | null;
  dateOnSaleTo: Date | null;
  categoryIds: string[];
  primaryCategoryId: string | null;
  attributeValues: Array<{
    attributeId: string;
    termId: string | null;
    customValue: string | null;
    isVisible: boolean;
    isVariation: boolean;
    position: number;
  }>;
  customFields: Array<{
    key: string;
    label: string;
    value: string;
    type: string;
    options: unknown | null;
    group: string | null;
    position: number;
    isPublic: boolean;
    isRequired: boolean;
  }>;
  variantData: Array<{
    id?: string; // for updates
    sku: string;
    name: string;
    regularPrice: number;
    salePrice: number | null;
    manageStock: boolean;
    stockQuantity: number | null;
    backorders: string;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    imageAssetId: string | null;
    downloadable: boolean;
    downloadLimit: number | null;
    downloadExpiry: number | null;
    downloadFiles: unknown[];
    virtual: boolean;
    attributes: Record<string, string>;
    menuOrder: number;
  }>;
  relatedProductIds: string[];
  crossSellProductIds: string[];
  upSellProductIds: string[];
  tagIds: string[];
  images: Array<{ assetId: string; alt: string | null; position: number; isMain: boolean }>;
  seoTitle: string | null;
  metaDesc: string | null;
  focusKeyphrase: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
}

export interface CategoryFormInput {
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  imageAssetId: string | null;
  displayType: string;
  menuOrder: number;
  isActive: boolean;
  showInMenu: boolean;
  seoTitle: string | null;
  metaDesc: string | null;
  focusKeyphrase: string | null;
  ogImage: string | null;
}

export interface AttributeFormInput {
  name: string;
  slug: string;
  type: string;
  order: number;
  isVariation: boolean;
  isVisible: boolean;
  isFilterable: boolean;
}

export interface AttributeTermFormInput {
  attributeId: string;
  name: string;
  slug: string;
  description: string;
  menuOrder: number;
  imageAssetId: string | null;
  meta: Record<string, unknown>;
}

export interface CouponFormInput {
  code: string;
  type: CouponType;
  amount: number;
  description: string;
  minAmount: number | null;
  maxAmount: number | null;
  individualUse: boolean;
  excludeSaleItems: boolean;
  usageLimit: number | null;
  usageLimitPerUser: number;
  productIds: string[];
  excludedProductIds: string[];
  categoryIds: string[];
  excludedCategoryIds: string[];
  startDate: Date | null;
  endDate: Date | null;
  freeShipping: boolean;
}

export interface PaymentGatewayFormInput {
  type: PaymentGatewayType;
  name: string;
  slug: string;
  isEnabled: boolean;
  isTestMode: boolean;
  priority: number;
  config: Record<string, unknown>;
  supportedCurrencies: string[];
  supportedCountries: string[];
  minAmount: number | null;
  maxAmount: number | null;
  allowedProductTypes: ProductType[];
  webhookSecret: string | null;
  webhookUrl: string | null;
}

export interface OrderUpdateInput {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: string;
  adminNote?: string;
  shippingMethod?: string;
  shippingMethodId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
}

export interface CartUpdateInput {
  couponCode?: string | null;
}

// ============================================================================
// Frontend Display Types
// ============================================================================

export interface ProductGridProps {
  products: ProductListItem[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  variant?: "default" | "minimal" | "featured";
  showAddToCart?: boolean;
  showQuickView?: boolean;
  showWishlist?: boolean;
  showCompare?: boolean;
}

export interface ProductCardProps {
  product: ProductListItem;
  variant?: "default" | "minimal" | "featured";
  showAddToCart?: boolean;
  showQuickView?: boolean;
  showWishlist?: boolean;
  showCompare?: boolean;
  onAddToCart?: (productId: string, variantId?: string, quantity?: number) => void;
  onQuickView?: (product: ProductListItem) => void;
  onWishlistToggle?: (productId: string) => void;
  onCompareToggle?: (productId: string) => void;
}

export interface ProductFilterProps {
  categories: ProductCategoryListItem[];
  attributes: ProductAttributeWithTerms[];
  priceRange: { min: number; max: number };
  selectedCategories: string[];
  selectedAttributes: Record<string, string[]>;
  priceMin: number;
  priceMax: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  inStockOnly: boolean;
  onCategoryChange: (categoryIds: string[]) => void;
  onAttributeChange: (attributeId: string, termIds: string[]) => void;
  onPriceChange: (min: number, max: number) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onStockFilterChange: (inStockOnly: boolean) => void;
  onClearFilters: () => void;
}

export interface CheckoutData {
  billing: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
    email: string;
  };
  shipping: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
    sameAsBilling: boolean;
  };
  paymentMethod: string;
  paymentGatewayId: string;
  customerNote: string;
  couponCode: string;
  termsAccepted: boolean;
}

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  redirectUrl?: string;
  clientSecret?: string; // for Stripe
  paymentUrl?: string; // for PayPal
  requiresAction: boolean;
  actionUrl?: string;
}