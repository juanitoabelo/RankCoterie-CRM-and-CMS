/**
 * E-Commerce Module — Database Queries
 * 
 * All database queries for product, order, cart, payment, and inventory operations.
 * Scoped to tenant for multi-tenant isolation.
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";
import { CouponType, ProductLinkType, StockStatus } from "@prisma/client";
import type {
  CartWithItems, CommissionWithRelations, CouponWithRelations,
  OrderFilter, OrderWithRelations,
  PaymentGatewayFilter, PaymentGatewayType, PaymentGatewayWithRelations,
  ProductAttributeWithTerms, ProductAttributeValueWithTerm, ProductCategoryWithRelations,
  ProductFilter, ProductLinkWithProduct, ProductListItem, ProductReviewWithProduct, ProductType,
  ProductWithRelations, PublicProduct, SubscriptionWithRelations, TaxRate,
} from "./types";
import { getEffectiveProductPrice } from "./pricing";
import { buildProductSearchWhere, sortProductSearchRows } from "./product-search";
import {
  availableStockFor,
  cartItemKey,
  normalizeCartOptions,
  resolveCartLinePricing,
  resolveStockSource,
} from "./cart-pricing";

const DEFAULT_PAGE_SIZE = 20;
const MAX_RANKED_SEARCH_ROWS = 1000;

// ============================================================================
// Product Queries
// ============================================================================

/** Get paginated products with filters */
export async function getProducts(filter: ProductFilter = {}): Promise<{
  items: ProductWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const {
    status = "ALL",
    type = "ALL",
    visibility = "ALL",
    featured,
    categoryId,
    tagId,
    vendorId,
    search,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    sortBy = "menuOrder",
    sortOrder = "asc",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = filter;

  const where: Record<string, unknown> = {};

  // Tenant isolation
  where.tenantId = TENANT_ID;

  // Status filter
  if (status !== "ALL") where.status = status;

  // Type filter
  if (type !== "ALL") where.type = type;

  // Visibility filter
  if (visibility !== "ALL") where.visibility = visibility;

  // Featured filter
  if (featured !== undefined) where.featured = featured;

  // Category filter
  if (categoryId) where.categories = { some: { categoryId } };

  // Tag filter
  if (tagId) where.tags = { some: { tagId } };

  // Vendor filter
  if (vendorId) where.vendorId = vendorId;

  // Search filter (name, sku, description, category, product type)
  if (search) {
    Object.assign(where, buildProductSearchWhere(search));
  }

  // Price range (effective price: sale price when active, otherwise regular)
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: { gte?: number; lte?: number } = {};
    if (minPrice !== undefined) priceFilter.gte = minPrice;
    if (maxPrice !== undefined) priceFilter.lte = maxPrice;
    where.price = priceFilter;
  }

  // Stock filter
  if (inStock !== undefined) {
    where.stockStatus = inStock ? "IN_STOCK" : "OUT_OF_STOCK";
  }

  // Sale filter
  if (onSale) {
    where.salePrice = { not: null };
  }

  const skip = (page - 1) * pageSize;

  // Build orderBy
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (sortBy && sortOrder) {
    orderBy[sortBy] = sortOrder;
  } else {
    orderBy.menuOrder = "asc";
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        attributes: { include: { attribute: true, term: true } },
        images: { where: { isMain: true }, take: 1, include: { asset: true } },
        variants: { take: 1 },
        tags: true,
        customFields: true,
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map((item) => ({ ...item, price: getEffectiveProductPrice(item).price })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Get a single product by ID (tenant scoped) */
export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  return prisma.product.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      categories: { include: { category: true } },
      attributes: { include: { attribute: true, term: true } },
      images: { orderBy: { position: "asc" }, include: { asset: true } },
      variants: { orderBy: { menuOrder: "asc" } },
      tags: true,
      customFields: true,
    },
  });
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const product = await prisma.product.findFirst({
    where: { slug, tenantId: TENANT_ID },
    include: {
      categories: { include: { category: true } },
      attributes: { include: { attribute: true, term: true } },
      images: { where: { isMain: true }, take: 1, include: { asset: true } },
      variants: { take: 1 },
      tags: true,
      customFields: true,
    },
  });
  return product ? { ...product, price: getEffectiveProductPrice(product).price } : null;
}

export async function getPurchasableProductType(
  productId: string,
): Promise<{ id: string; type: string; hasVariants: boolean } | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: TENANT_ID, status: "PUBLISHED", visibility: "PUBLIC" },
    select: { id: true, type: true, _count: { select: { variants: true } } },
  });
  return product
    ? { id: product.id, type: product.type, hasVariants: product._count.variants > 0 }
    : null;
}

export async function getProductLinks(
  productId: string,
  type?: ProductLinkType,
): Promise<ProductLinkWithProduct[]> {
  const links = await prisma.productLink.findMany({
    where: { tenantId: TENANT_ID, productId, ...(type ? { type } : {}) },
    orderBy: [{ type: "asc" }, { position: "asc" }],
    include: {
      linkedProduct: {
        include: { images: { orderBy: { position: "asc" }, include: { asset: true } } },
      },
    },
  });
  return links as ProductLinkWithProduct[];
}

export async function getPublicProductBySlug(slug: string): Promise<PublicProduct | null> {
  const product = await prisma.product.findFirst({
    where: { slug, tenantId: TENANT_ID, status: "PUBLISHED", visibility: "PUBLIC" },
    include: {
      categories: { include: { category: true } },
      attributes: {
        where: { isVisible: true, attribute: { isVisible: true } },
        include: { attribute: true, term: true },
      },
      images: { orderBy: { position: "asc" }, include: { asset: true } },
      variants: { orderBy: { menuOrder: "asc" } },
      tags: true,
      customFields: true,
      outgoingLinks: {
        where: {
          tenantId: TENANT_ID,
          linkedProduct: { tenantId: TENANT_ID, status: "PUBLISHED", visibility: "PUBLIC" },
        },
        orderBy: [{ type: "asc" }, { position: "asc" }],
        include: {
          linkedProduct: {
            include: { images: { orderBy: { position: "asc" }, include: { asset: true } } },
          },
        },
      },
      reviews: {
        where: { tenantId: TENANT_ID, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!product) return null;

  const publicCustomFields = product.customFields.filter((field) => field.isPublic);

  return {
    ...product,
    customFields: publicCustomFields,
    price: getEffectiveProductPrice(product).price,
    effectivePrice: getEffectiveProductPrice(product),
    links: product.outgoingLinks as ProductLinkWithProduct[],
    reviews: product.reviews as ProductReviewWithProduct[],
    customFieldValues: Object.fromEntries(
      publicCustomFields.map((field) => [field.key, field.value]),
    ),
  };
}

export async function getShippingClasses(): Promise<{ id: string; name: string; slug: string }[]> {
  return prisma.shippingClass.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export async function getVendors(): Promise<{ id: string; name: string; email: string }[]> {
  const users = await prisma.user.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, email: true, firstName: true, lastName: true },
    orderBy: { email: "asc" },
  });
  return users.map((user) => ({
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    email: user.email,
  }));
}

export async function getProductOptions(): Promise<{
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  type: ProductType;
}[]> {
  return prisma.product.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, name: true, slug: true, sku: true, type: true },
    orderBy: { name: "asc" },
  });
}

/** Get featured products */
export async function getFeaturedProducts(limit = 6): Promise<ProductWithRelations[]> {
  return prisma.product.findMany({
    where: { tenantId: TENANT_ID, featured: true, status: "PUBLISHED" },
    include: {
      categories: { include: { category: true } },
      attributes: { include: { attribute: true, term: true } },
      images: { where: { isMain: true }, take: 1, include: { asset: true } },
      variants: { take: 1 },
      tags: true,
      customFields: true,
    },
    orderBy: { menuOrder: "asc" },
    take: limit,
  }).then((products) =>
    products.map((product) => ({ ...product, price: getEffectiveProductPrice(product).price })),
  );
}

/** Get products by category */
export async function getProductsByCategory(
  categoryId: string,
  filter: Omit<ProductFilter, "categoryId"> = {}
): Promise<{
  items: ProductWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;

  const where: Record<string, unknown> = {
    tenantId: TENANT_ID,
    categories: { some: { categoryId } },
    status: "PUBLISHED",
  };

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        attributes: { include: { attribute: true, term: true } },
        images: { where: { isMain: true }, take: 1, include: { asset: true } },
        variants: { take: 1 },
        tags: true,
        customFields: true,
      },
      orderBy: { menuOrder: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map((item) => ({ ...item, price: getEffectiveProductPrice(item).price })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get product categories.
 * `isActive` filters when provided; omitted it returns every category so the
 * admin form can still assign products to hidden ones.
 */
export async function getProductCategories(filter: { isActive?: boolean } = {}): Promise<ProductCategoryWithRelations[]> {
  const where: Prisma.ProductCategoryWhereInput = { tenantId: TENANT_ID };
  if (filter.isActive !== undefined) where.isActive = filter.isActive;

  return prisma.productCategory.findMany({
    where,
    include: {
      parent: true,
      children: { orderBy: { menuOrder: "asc" } },
    },
    orderBy: { menuOrder: "asc" },
  });
}

/** Get category tree (hierarchical) */
export async function getProductCategoryTree(filter: { isActive?: boolean } = {}): Promise<ProductCategoryWithRelations[]> {
  const { isActive = true } = filter;

  const categories = await prisma.productCategory.findMany({
    where: { tenantId: TENANT_ID, isActive },
    include: {
      parent: true,
      children: {
        include: {
          parent: true,
          children: true,
        },
        orderBy: { menuOrder: "asc" },
      },
    },
    orderBy: { menuOrder: "asc" },
  });

  // Build tree structure
  const buildTree = (cats: ProductCategoryWithRelations[]): ProductCategoryWithRelations[] => {
    return cats.map(cat => {
      const children = buildTree(cat.children ?? []);
      return {
        ...cat,
        children,
      };
    });
  };

  return buildTree(categories).filter(cat => !cat.parentId);
}

/** Get product tags */
export async function getProductTags(): Promise<{ id: string; name: string; slug: string }[]> {
  return prisma.productTag.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

/** Get product tags for a product */
export async function getProductTagsByProduct(productId: string): Promise<{ id: string; name: string; slug: string }[]> {
  const tags = await prisma.productTagLink.findMany({
    where: { productId },
    select: { tag: { select: { id: true, name: true, slug: true } } },
  });

  return tags.map(t => t.tag);
}

// ============================================================================
// Product Attribute Queries
// ============================================================================

/** Get product attributes for a product */
export async function getProductAttributes(productId: string): Promise<ProductAttributeValueWithTerm[]> {
  return prisma.productAttributeValue.findMany({
    where: { productId },
    include: {
      attribute: {
        include: { terms: { orderBy: { menuOrder: "asc" } } },
      },
      term: true,
    },
    orderBy: { position: "asc" },
  });
}

/** Get all product attributes (tenant scoped; filters only apply when passed) */
export async function getAllProductAttributes(filter: { isVariation?: boolean; isFilterable?: boolean } = {}): Promise<ProductAttributeWithTerms[]> {
  const where: Prisma.ProductAttributeWhereInput = { tenantId: TENANT_ID, isVisible: true };

  if (filter.isVariation !== undefined) where.isVariation = filter.isVariation;
  if (filter.isFilterable !== undefined) where.isFilterable = filter.isFilterable;

  return prisma.productAttribute.findMany({
    where,
    include: { terms: { orderBy: { menuOrder: "asc" } } },
    orderBy: { order: "asc" },
  });
}

/** Get attribute by ID */
export async function getAttributeById(attributeId: string): Promise<ProductAttributeWithTerms | null> {
  return prisma.productAttribute.findUnique({
    where: { id: attributeId },
    include: { terms: { orderBy: { menuOrder: "asc" } } },
  });
}

// ============================================================================
// Order Queries
// ============================================================================

/** Get paginated orders with filters */
export async function getOrders(filter: OrderFilter = {}): Promise<{
  items: OrderWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const {
    status = "ALL",
    paymentStatus = "ALL",
    customerId,
    dateFrom,
    dateTo,
    minTotal,
    maxTotal,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = filter;

  const where: Record<string, unknown> = {};

  where.tenantId = TENANT_ID;

  // Status filter
  if (status !== "ALL") where.status = status;

  // Payment status filter
  if (paymentStatus !== "ALL") where.paymentStatus = paymentStatus;

  // Customer filter
  if (customerId) where.customerId = customerId;

  // Date range filter
  if (dateFrom || dateTo) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (dateFrom) createdAt.gte = dateFrom;
    if (dateTo) createdAt.lte = dateTo;
    where.createdAt = createdAt;
  }

  // Search filter (order number, customer name, email, guest email)
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { guestEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  // Total range
  if (minTotal !== undefined || maxTotal !== undefined) {
    const total: { gte?: number; lte?: number } = {};
    if (minTotal !== undefined) total.gte = minTotal;
    if (maxTotal !== undefined) total.lte = maxTotal;
    where.total = total;
  }

  const skip = (page - 1) * pageSize;

  const SORT_FIELDS: Record<string, string> = {
    date: "createdAt",
    createdAt: "createdAt",
    total: "total",
    status: "status",
    paymentStatus: "paymentStatus",
  };
  const orderBy: Record<string, "asc" | "desc"> = {
    [SORT_FIELDS[sortBy] ?? "createdAt"]: sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { product: { select: { id: true, name: true, slug: true, type: true, sku: true, images: { where: { isMain: true }, take: 1, include: { asset: true } } } }, variant: true } },
        transactions: { take: 1 },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Get a single order by ID (tenant-scoped) */
export async function getOrderById(id: string): Promise<OrderWithRelations | null> {
  return prisma.order.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      customer: true,
      user: true,
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true, type: true, sku: true, price: true, images: { where: { isMain: true }, take: 1, include: { asset: true } } } },
          variant: true,
        },
      },
      transactions: true,
      notes: true,
      refunds: true,
      shipments: true,
    },
  });
}

/** Get orders by customer */
export async function getOrdersByCustomer(customerId: string, filter: Omit<OrderFilter, "customerId"> = {}): Promise<{
  items: OrderWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;

  const where: Record<string, unknown> = {
    tenantId: TENANT_ID,
    customerId,
  };

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, type: true, sku: true, price: true, images: { where: { isMain: true }, take: 1, include: { asset: true } } } },
            variant: true,
          },
          },
        transactions: { take: 1 },
        notes: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Get pending orders */
export async function getPendingOrders(): Promise<OrderWithRelations[]> {
  return prisma.order.findMany({
    where: { tenantId: TENANT_ID, status: "PENDING" },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, slug: true, type: true, price: true, images: { where: { isMain: true }, take: 1, include: { asset: true } } } }, variant: true } 
      },
      transactions: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Get completed orders */
export async function getCompletedOrders(): Promise<OrderWithRelations[]> {
  return prisma.order.findMany({
    where: { tenantId: TENANT_ID, status: "COMPLETED" },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, slug: true, type: true, price: true, images: { where: { isMain: true }, take: 1, include: { asset: true } } } }, variant: true } 
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ============================================================================
// Cart Queries
// ============================================================================

/** Get cart by session ID */
export async function getCartBySession(sessionId: string): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: { tenantId: TENANT_ID, sessionId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              regularPrice: true,
              salePrice: true,
              salePriceStart: true,
              salePriceEnd: true,
              stockStatus: true,
              manageStock: true,
              stockQuantity: true,
              backorders: true,
              lowStockAmount: true,
              shippingRequired: true,
              type: true,
              status: true,
              visibility: true,
              taxStatus: true,
              taxClass: true,
              shippingClassId: true,
              weight: true,
              length: true,
              width: true,
              height: true,
              downloadable: true,
              virtual: true,
              images: { where: { isMain: true }, take: 1, include: { asset: true } },
              categories: { select: { categoryId: true } },
            },
          },
          variant: { include: { imageAsset: true } },
        },
      },
      coupon: true,
    },
  });
}

/** Get cart by user ID */
export async function getCartByUser(userId: string): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: { tenantId: TENANT_ID, userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              regularPrice: true,
              salePrice: true,
              salePriceStart: true,
              salePriceEnd: true,
              stockStatus: true,
              manageStock: true,
              stockQuantity: true,
              backorders: true,
              lowStockAmount: true,
              shippingRequired: true,
              type: true,
              status: true,
              visibility: true,
              taxStatus: true,
              taxClass: true,
              shippingClassId: true,
              weight: true,
              length: true,
              width: true,
              height: true,
              downloadable: true,
              virtual: true,
              images: { where: { isMain: true }, take: 1, include: { asset: true } },
              categories: { select: { categoryId: true } },
            },
          },
          variant: { include: { imageAsset: true } },
        },
      },
      coupon: true,
    },
  });
}

/** Create or get cart */
export async function getOrCreateCart(sessionId: string, userId?: string): Promise<CartWithItems> {
  let cart = await prisma.cart.findFirst({
    where: { tenantId: TENANT_ID, sessionId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        tenantId: TENANT_ID,
        sessionId,
        userId,
        currency: "USD",
        total: 0,
        itemCount: 0,
      },
    });
  }

  const full = await getCartBySession(sessionId);
  if (!full) throw new Error("Failed to load cart.");
  return full;
}

/**
 * How many more units a customer may buy: null = unlimited (no stock
 * management, or backorders allowed), otherwise the remaining quantity.
 */
export function availableStock(product: {
  manageStock: boolean;
  stockQuantity: number | null;
  backorders?: string | null;
}): number | null {
  if (!product.manageStock || product.stockQuantity === null) return null;
  if (product.backorders === "yes" || product.backorders === "notify") return null;
  return product.stockQuantity;
}

type CartMutation = { ok: boolean; error?: string; cartItemId?: string; warning?: string };

/** Add item to cart */
export async function addItemToCart(
  cartId: string,
  productId: string,
  quantity = 1,
  variantId?: string,
  customOptions?: Record<string, unknown>,
  bundleChildren?: Array<{
    productId: string;
    quantity: number;
    variantId?: string | null;
    name?: string | null;
    sku?: string | null;
  }>,
): Promise<CartMutation> {
  const [product, cart] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, tenantId: TENANT_ID } }),
    prisma.cart.findFirst({
      where: { id: cartId, tenantId: TENANT_ID },
      include: { items: true },
    }),
  ]);

  if (!product) return { ok: false, error: "Product not found." };
  if (!cart) return { ok: false, error: "Cart not found." };

  if (product.type === "VARIABLE" && !variantId) {
    const variantCount = await prisma.productVariant.count({ where: { productId } });
    if (variantCount > 0) {
      return { ok: false, error: "Please choose a product option before adding this item." };
    }
  }

  if (!variantId) {
    const stockSource = resolveStockSource(null, product);
    if (
      stockSource.stockStatus === StockStatus.OUT_OF_STOCK &&
      stockSource.backorders !== "yes" &&
      stockSource.backorders !== "notify"
    ) {
      return { ok: false, error: "Product is out of stock." };
    }
  }

  type VariantRow = Awaited<ReturnType<typeof prisma.productVariant.findUnique>>;
  let variantToUse: VariantRow = null;

  if (variantId) {
    variantToUse = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variantToUse || variantToUse.productId !== productId) {
      return { ok: false, error: "The selected option does not belong to this product." };
    }
    const stockSource = resolveStockSource(variantToUse, product);
    if (
      stockSource.stockStatus === StockStatus.OUT_OF_STOCK &&
      stockSource.backorders !== "yes" &&
      stockSource.backorders !== "notify"
    ) {
      return { ok: false, error: "Variant is out of stock." };
    }
  }

  const normalizedOptions = normalizeCartOptions(customOptions);
  const optionsForIdentity = bundleChildren?.length
    ? { ...normalizedOptions, __bundleChildren: JSON.stringify(bundleChildren) }
    : normalizedOptions;
  const pricing = resolveCartLinePricing(product, variantToUse, quantity);
  const price = pricing.price;
  const wantedVariantId = variantId ?? null;
  const limit = availableStockFor(variantToUse, product);
  const wantedKey = cartItemKey(productId, wantedVariantId, optionsForIdentity);

  const existingItem = cart.items.find((item) => {
    if (item.productId !== productId || item.variantId !== wantedVariantId) return false;
    if (!wantedVariantId) return true;
    const meta =
      item.meta && typeof item.meta === "object"
        ? (item.meta as Record<string, unknown>)
        : {};
    return cartItemKey(productId, wantedVariantId, meta.customOptions) === wantedKey;
  });

  if (existingItem) {
    const raw = existingItem.quantity + quantity;
    // Never raise above the limit, never silently lower what's already there.
    const newQuantity =
      limit === null ? raw : Math.max(existingItem.quantity, Math.min(raw, limit));
    const warning =
      newQuantity < raw
        ? limit === 0
          ? "Product is out of stock."
          : `Only ${limit} left in stock — quantity capped.`
        : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          price,
          lineTotal: price * newQuantity,
        },
      });
      await recalcCart(tx, cart.id);
    });

    return { ok: true, cartItemId: existingItem.id, warning };
  }

  if (limit !== null && limit < 1) {
    return { ok: false, error: "Product is out of stock." };
  }
  const newQuantity = limit === null ? quantity : Math.min(quantity, limit);
  const warning =
    newQuantity < quantity ? `Only ${limit} left in stock — quantity capped.` : undefined;

  const created = await prisma.$transaction(async (tx) => {
    const cartItem = await tx.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId,
        quantity: newQuantity,
        price,
        lineTotal: price * newQuantity,
        meta: {
          customOptions: optionsForIdentity as Prisma.InputJsonValue,
          ...(bundleChildren?.length ? { bundleChildren } : {}),
        } as Prisma.InputJsonValue,
      },
    });
    await recalcCart(tx, cart.id);
    return cartItem;
  });

  return { ok: true, cartItemId: created.id, warning };
}

/** Recompute a cart's item count and total from its line items. */
async function recalcCart(tx: Prisma.TransactionClient, cartId: string): Promise<void> {
  const items = await tx.cartItem.findMany({
    where: { cartId },
    select: { lineTotal: true, quantity: true },
  });

  await tx.cart.update({
    where: { id: cartId },
    data: {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    },
  });
}

/** Remove item from cart */
export async function removeItemFromCart(cartId: string, itemId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const removed = await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
    if (removed.count === 0) return { ok: false, error: "Cart item not found." };

    await prisma.$transaction((tx) => recalcCart(tx, cartId));
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to remove item from cart." };
  }
}

/** Update cart item quantity */
export async function updateCartItemQuantity(cartId: string, itemId: string, quantity: number): Promise<CartMutation> {
  if (quantity < 1) {
    return removeItemFromCart(cartId, itemId);
  }

  try {
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: {
        product: { select: { manageStock: true, stockQuantity: true, backorders: true } },
        variant: {
          select: {
            id: true,
            manageStock: true,
            stockQuantity: true,
            backorders: true,
          },
        },
      },
    });
    if (!item) return { ok: false, error: "Cart item not found." };

    const limit = availableStockFor(item.variant, item.product);
    const finalQuantity = limit === null ? quantity : Math.min(quantity, limit);
    const warning =
      finalQuantity < quantity
        ? limit === 0
          ? "Product is out of stock."
          : `Only ${limit} left in stock — quantity capped.`
        : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity: finalQuantity, lineTotal: item.price * finalQuantity },
      });
      await recalcCart(tx, cartId);
    });

    return { ok: true, warning };
  } catch {
    return { ok: false, error: "Failed to update cart item quantity." };
  }
}

/** Clear cart */
export async function clearCart(cartId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cartId } });
      await recalcCart(tx, cartId);
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to clear cart." };
  }
}

// ============================================================================
// Payment Gateway Queries
// ============================================================================

/** Get all payment gateways */
export async function getPaymentGateways(filter: PaymentGatewayFilter = {}): Promise<PaymentGatewayWithRelations[]> {
  const { isEnabled } = filter;

  const where: Record<string, unknown> = { tenantId: TENANT_ID };

  if (isEnabled !== undefined) where.isEnabled = isEnabled;

  return prisma.paymentGateway.findMany({
    where,
    orderBy: { priority: "asc" },
  });
}

/** Get a single payment gateway by ID */
export async function getPaymentGatewayById(id: string): Promise<PaymentGatewayWithRelations | null> {
  return prisma.paymentGateway.findUnique({
    where: { id },
    include: { transactions: true },
  });
}

/** Get enabled payment gateways */
export async function getEnabledPaymentGateways(): Promise<PaymentGatewayWithRelations[]> {
  return prisma.paymentGateway.findMany({
    where: { tenantId: TENANT_ID, isEnabled: true },
    orderBy: { priority: "asc" },
  });
}

export async function getEnabledEcommerceGateways(): Promise<PaymentGatewayWithRelations[]> {
  return prisma.paymentGateway.findMany({
    where: {
      tenantId: TENANT_ID,
      isEnabled: true,
      purpose: { in: ["GENERAL", "ECOMMERCE"] },
    },
    orderBy: { priority: "asc" },
  });
}

/** Create payment gateway */
export async function createPaymentGateway(data: {
  type: PaymentGatewayType;
  name: string;
  slug: string;
  isEnabled: boolean;
  isTestMode: boolean;
  priority: number;
  config: Record<string, unknown>;
  supportedCurrencies: string[];
  supportedCountries: string[];
  minAmount?: number | null;
  maxAmount?: number | null;
  allowedProductTypes?: ProductType[];
  webhookSecret?: string | null;
  webhookUrl?: string | null;
}): Promise<PaymentGatewayWithRelations> {
  return prisma.paymentGateway.create({
    data: {
      tenantId: TENANT_ID,
      type: data.type,
      name: data.name,
      slug: data.slug,
      isEnabled: data.isEnabled,
      isTestMode: data.isTestMode,
      priority: data.priority,
      config: data.config as Prisma.InputJsonValue,
      supportedCurrencies: data.supportedCurrencies,
      supportedCountries: data.supportedCountries,
      minAmount: data.minAmount,
      maxAmount: data.maxAmount,
      allowedProductTypes: data.allowedProductTypes,
      webhookSecret: data.webhookSecret,
      webhookUrl: data.webhookUrl,
    },
  });
}

/** Update payment gateway */
export async function updatePaymentGateway(id: string, data: Partial<{
  type: PaymentGatewayType;
  name: string;
  slug: string;
  isEnabled: boolean;
  isTestMode: boolean;
  priority: number;
  config: Record<string, unknown>;
  supportedCurrencies: string[];
  supportedCountries: string[];
  minAmount?: number | null;
  maxAmount?: number | null;
  allowedProductTypes?: ProductType[];
  webhookSecret?: string | null;
  webhookUrl?: string | null;
}>): Promise<PaymentGatewayWithRelations> {
  return prisma.paymentGateway.update({
    where: { id },
    data: {
      type: data.type,
      name: data.name,
      slug: data.slug,
      isEnabled: data.isEnabled,
      isTestMode: data.isTestMode,
      priority: data.priority,
      config: data.config as Prisma.InputJsonValue,
      supportedCurrencies: data.supportedCurrencies,
      supportedCountries: data.supportedCountries,
      minAmount: data.minAmount,
      maxAmount: data.maxAmount,
      allowedProductTypes: data.allowedProductTypes,
      webhookSecret: data.webhookSecret,
      webhookUrl: data.webhookUrl,
    },
  });
}

// ============================================================================
// Coupon Queries
// ============================================================================

/** Get paginated coupons */
export async function getCoupons(filter: { search?: string; isActive?: boolean } = {}): Promise<{
  items: CouponWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { search, isActive = true } = filter;

  const where: Record<string, unknown> = { tenantId: TENANT_ID, isActive };

  if (search) {
    where.code = { contains: search, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.count({ where }),
  ]);

  return { items, total, page: 1, pageSize: items.length, totalPages: 1 };
}

/** Get a single coupon by code */
export async function getCouponByCode(code: string): Promise<CouponWithRelations | null> {
  return prisma.coupon.findFirst({
    where: { code, tenantId: TENANT_ID },
  });
}

/** Check if coupon is valid */
export async function isCouponValid(code: string, cartTotal: number, productIds: string[] = []): Promise<{
  valid: boolean;
  coupon: CouponWithRelations | null;
  discountAmount: number;
  reason?: string;
}> {
  const coupon = await getCouponByCode(code);

  if (!coupon) return { valid: false, coupon: null, discountAmount: 0, reason: "Coupon not found." };

  // Check if expired
  if (coupon.endDate && new Date() > coupon.endDate) {
    return { valid: false, coupon: null, discountAmount: 0, reason: "Coupon has expired." };
  }

  // Check if not started yet
  if (coupon.startDate && new Date() < coupon.startDate) {
    return { valid: false, coupon: null, discountAmount: 0, reason: "Coupon has not started yet." };
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, coupon: null, discountAmount: 0, reason: "Coupon usage limit reached." };
  }

  // Per-user usage limits need the authenticated customer id; enforced at checkout.
  // Check minimum amount
  if (coupon.minAmount && cartTotal < coupon.minAmount) {
    return { valid: false, coupon: null, discountAmount: 0, reason: `Minimum order amount is $${coupon.minAmount}.` };
  }

  // Check maximum amount
  if (coupon.maxAmount && cartTotal > coupon.maxAmount) {
    return { valid: false, coupon: null, discountAmount: 0, reason: `Maximum order amount is $${coupon.maxAmount}.` };
  }

  // Check product restrictions — sale items may be excluded entirely
  if (coupon.excludeSaleItems && productIds.length > 0) {
    const saleItems = await prisma.product.count({
      where: { id: { in: productIds }, tenantId: TENANT_ID, salePrice: { not: null } },
    });
    if (saleItems > 0) {
      return { valid: false, coupon: null, discountAmount: 0, reason: "Coupon cannot be applied to sale items." };
    }
  }

  // Calculate discount
  let discountAmount = 0;

  if (coupon.type === CouponType.PERCENT) {
    discountAmount = Math.round((cartTotal * coupon.amount) / 100);
  } else if (coupon.type === CouponType.FIXED_CART) {
    discountAmount = coupon.amount;
  }

  return { valid: true, coupon, discountAmount };
}

// ============================================================================
// Subscription Queries
// ============================================================================

export type SubscriptionPlanSnapshot = {
  productId: string;
  variantId: string | null;
  quantity: number;
  amount: number;
  interval: string;
  intervalCount: number;
  signUpFee: number;
  length: number | null;
  trialPeriod: number | null;
  currency: string;
};

type SubscriptionPlanProduct = {
  id: string;
  type: string;
  subscriptionPeriod: string | null;
  subscriptionInterval: number | null;
  subscriptionLength: number | null;
  subscriptionTrialPeriod: number | null;
  subscriptionSignUpFee: number | null;
};

export function buildSubscriptionPlan(
  product: SubscriptionPlanProduct,
  variantId: string | null,
  amount: number,
  quantity: number,
  currency: string,
): SubscriptionPlanSnapshot | null {
  if (product.type !== "SUBSCRIPTION") return null;
  const period = (product.subscriptionPeriod ?? "month").toLowerCase();
  const interval = ["day", "week", "month", "year"].includes(period) ? period : "month";
  return {
    productId: product.id,
    variantId,
    quantity,
    amount,
    interval,
    intervalCount: Math.max(1, Math.floor(product.subscriptionInterval ?? 1)),
    signUpFee: Math.max(0, product.subscriptionSignUpFee ?? 0),
    length: product.subscriptionLength,
    trialPeriod: product.subscriptionTrialPeriod,
    currency,
  };
}

export function addSubscriptionPeriod(start: Date, interval: string, count: number): Date {
  const end = new Date(start);
  const step = Math.max(1, Math.floor(count));
  if (interval === "day") end.setUTCDate(end.getUTCDate() + step);
  else if (interval === "week") end.setUTCDate(end.getUTCDate() + step * 7);
  else if (interval === "year") end.setUTCFullYear(end.getUTCFullYear() + step);
  else {
    const day = end.getUTCDate();
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + step);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(day, lastDay));
  }
  return end;
}

export async function fulfillSubscriptionsForPaidOrder(
  orderId: string,
): Promise<"fulfilled" | "pending" | "not-applicable"> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: TENANT_ID },
    select: {
      id: true,
      userId: true,
      paymentStatus: true,
      paymentGatewayId: true,
      currency: true,
      meta: true,
    },
  });
  if (!order || order.paymentStatus !== "PAID") return "not-applicable";

  const meta = (order.meta ?? {}) as Record<string, unknown>;
  const rawPlans = meta.subscriptionPlans;
  if (!Array.isArray(rawPlans) || rawPlans.length === 0) return "not-applicable";

  const plans = rawPlans.filter(
    (entry): entry is SubscriptionPlanSnapshot =>
      Boolean((entry as SubscriptionPlanSnapshot)?.productId) &&
      Number.isFinite((entry as SubscriptionPlanSnapshot).amount),
  );
  if (plans.length === 0) return "not-applicable";

  const customerId = order.userId;
  if (!customerId) {
    await prisma.order.update({
      where: { id: order.id },
      data: { meta: { ...meta, subscriptionFulfillment: "requires-customer" } as Prisma.InputJsonValue },
    });
    return "pending";
  }

  const existing = await prisma.subscription.findMany({
    where: { tenantId: TENANT_ID, orderId },
    select: { id: true, planKey: true },
  });
  const existingKeys = new Set(existing.map((row) => row.planKey));

  const renewalSubscriptionId = typeof meta.renewalSubscriptionId === "string" ? meta.renewalSubscriptionId : null;
  if (renewalSubscriptionId) {
    const renewal = await prisma.subscription.findFirst({
      where: { id: renewalSubscriptionId, tenantId: TENANT_ID },
      select: { id: true, planKey: true, currentPeriodEnd: true, interval: true, intervalCount: true, meta: true },
    });
    if (renewal) {
      const planKey = renewal.planKey;
      if (!existingKeys.has(planKey)) {
        const periodStart = renewal.currentPeriodEnd && renewal.currentPeriodEnd > new Date() ? renewal.currentPeriodEnd : new Date();
        const periodEnd = addSubscriptionPeriod(periodStart, (renewal.interval ?? "month") as "day" | "week" | "month" | "year", Math.max(1, renewal.intervalCount ?? 1));
        const renewalMeta = (renewal.meta ?? {}) as Record<string, unknown>;
        await prisma.subscription.update({
          where: { id: renewal.id },
          data: {
            status: "active",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            meta: {
              ...renewalMeta,
              lastRenewalOrderId: order.id,
              nextBillingAt: periodEnd.toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
        existingKeys.add(planKey);
      }
    }
  }

  const now = new Date();
  for (const plan of plans) {
    const planKey = `${plan.productId}::${plan.variantId ?? ""}`;
    if (existingKeys.has(planKey)) continue;
    const trialPeriods = Math.max(0, Math.floor(plan.trialPeriod ?? 0));
    const trialEndsAt =
      trialPeriods > 0
        ? addSubscriptionPeriod(now, plan.interval, plan.intervalCount * trialPeriods)
        : null;
    const currentPeriodEnd = addSubscriptionPeriod(
      trialEndsAt ?? now,
      plan.interval,
      plan.intervalCount,
    );
    try {
      await prisma.subscription.create({
        data: {
          tenantId: TENANT_ID,
          orderId: order.id,
          planKey,
          customerId,
          productId: plan.productId,
          variantId: plan.variantId ?? null,
          gatewayId: order.paymentGatewayId ?? null,
          status: "active",
          interval: plan.interval,
          intervalCount: plan.intervalCount,
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd,
          amount: plan.amount,
          currency: plan.currency || order.currency || "USD",
          quantity: Math.max(1, Math.floor(plan.quantity || 1)),
          meta: {
            plan: {
              interval: plan.interval,
              intervalCount: plan.intervalCount,
              length: plan.length,
              trialPeriod: plan.trialPeriod,
              signUpFee: plan.signUpFee,
            },
            initialOrderId: order.id,
            trialEndsAt: trialEndsAt?.toISOString() ?? null,
            nextBillingAt: currentPeriodEnd.toISOString(),
            renewal: "manual",
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002") throw error;
    }
    existingKeys.add(planKey);
  }

  const allFulfilled = plans.every((plan) =>
    existingKeys.has(`${plan.productId}::${plan.variantId ?? ""}`),
  );
  if (allFulfilled) {
    await prisma.order.update({
      where: { id: order.id },
      data: { meta: { ...meta, subscriptionFulfillment: "fulfilled" } as Prisma.InputJsonValue },
    });
    return "fulfilled";
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { meta: { ...meta, subscriptionFulfillment: "pending" } as Prisma.InputJsonValue },
  });
  return "pending";
}

export type DigitalDownloadGrantForEmail = {
  token: string;
  name: string;
  url: string;
  expiresAt: Date | null;
  downloadLimit: number | null;
  downloadsUsed: number;
};

function safeDownloadUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = value.trim();
  if (/^\/(?!\/)/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function normalizeDownloadFiles(value: unknown): Array<{ name: string; url: string }> {
  if (!Array.isArray(value)) return [];
  const files: Array<{ name: string; url: string }> = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const url = safeDownloadUrl(entry);
      if (url) files.push({ name: url.split("/").pop() || "Download", url });
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const url = safeDownloadUrl(record.url);
    if (!url) continue;
    const rawName = typeof record.name === "string" ? record.name.trim() : "";
    files.push({ name: rawName || url.split("/").pop() || "Download", url });
  }
  return files;
}

export async function fulfillDigitalDownloadsForPaidOrder(
  orderId: string,
): Promise<DigitalDownloadGrantForEmail[]> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: TENANT_ID, paymentStatus: "PAID" },
    select: {
      id: true,
      paidAt: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          meta: true,
          product: {
            select: {
              downloadable: true,
              downloadFiles: true,
              downloadLimit: true,
              downloadExpiry: true,
            },
          },
          variant: {
            select: {
              downloadable: true,
              downloadFiles: true,
              downloadLimit: true,
              downloadExpiry: true,
            },
          },
        },
      },
    },
  });
  if (!order || order.items.length === 0) return [];

  const bundleChildIds = [...new Set(order.items.flatMap((item) => {
    const meta = (item.meta ?? {}) as Record<string, unknown>;
    const children = Array.isArray(meta.bundleChildren) ? meta.bundleChildren : [];
    return children
      .map((child) => (child && typeof child === "object" ? (child as Record<string, unknown>).productId : null))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }))];
  const bundleProducts = bundleChildIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: bundleChildIds }, tenantId: TENANT_ID },
        select: { id: true, downloadable: true, downloadFiles: true, downloadLimit: true, downloadExpiry: true, name: true },
      })
    : [];
  const bundleProductsById = new Map(bundleProducts.map((p) => [p.id, p]));

  const existing = await prisma.digitalDownloadGrant.findMany({
    where: { tenantId: TENANT_ID, orderItemId: { in: order.items.map((item) => item.id) } },
    select: { orderItemId: true, url: true },
  });
  const fulfilledKeys = new Set(existing.map((grant) => `${grant.orderItemId}::${grant.url}`));
  const grants: DigitalDownloadGrantForEmail[] = [];

  for (const item of order.items) {
    const meta = (item.meta ?? {}) as Record<string, unknown>;
    const bundleChildren = Array.isArray(meta.bundleChildren) ? meta.bundleChildren as Array<Record<string, unknown>> : [];

    const configs: Array<{ namePrefix?: string; downloadable: boolean; downloadFiles: unknown; downloadLimit: number | null; downloadExpiry: number | null }> = [];
    const directConfig = item.variant?.downloadable ? item.variant : item.product.downloadable ? item.product : null;
    if (directConfig) configs.push(directConfig);
    for (const child of bundleChildren) {
      const productId = typeof child.productId === "string" ? child.productId : null;
      if (!productId) continue;
      const childProduct = bundleProductsById.get(productId);
      if (childProduct?.downloadable) configs.push({ ...childProduct, namePrefix: childProduct.name });
    }

    for (const downloadConfig of configs) {
      const files = normalizeDownloadFiles(downloadConfig.downloadFiles);
      if (files.length === 0) continue;

      const limit = downloadConfig.downloadLimit ?? null;
      const downloadLimit = limit && limit > 0 ? Math.floor(limit) : null;
      const expiryDays = downloadConfig.downloadExpiry ?? 0;
      const start = order.paidAt ?? order.createdAt;
      const expiresAt =
        expiryDays > 0 ? new Date(start.getTime() + Math.floor(expiryDays) * 86_400_000) : null;

      for (const file of files) {
        const key = `${item.id}::${file.url}`;
        if (fulfilledKeys.has(key)) continue;
        try {
          const grant = await prisma.digitalDownloadGrant.create({
            data: {
              tenantId: TENANT_ID,
              orderId: order.id,
              orderItemId: item.id,
              token: randomBytes(24).toString("hex"),
              name: downloadConfig.namePrefix && !file.name.startsWith(downloadConfig.namePrefix)
                ? `${downloadConfig.namePrefix} — ${file.name}`
                : file.name,
              url: file.url,
              expiresAt,
              downloadLimit,
              downloadsUsed: 0,
            },
          });
          fulfilledKeys.add(key);
          grants.push(grant);
        } catch (error) {
          if ((error as { code?: string }).code !== "P2002") throw error;
        }
      }
    }
  }

  return grants;
}

export async function retryPendingSubscriptionFulfillmentsForCustomer(
  customerId: string,
): Promise<number> {
  const orders = await prisma.order.findMany({
    where: {
      tenantId: TENANT_ID,
      paymentStatus: "PAID",
      AND: [
        { OR: [{ userId: customerId }, { customerId }] },
        {
          OR: [
            { meta: { path: ["subscriptionFulfillment"], equals: "pending" } },
            { meta: { path: ["subscriptionFulfillment"], equals: "requires-customer" } },
          ],
        },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  let fulfilled = 0;
  for (const order of orders) {
    try {
      const result = await fulfillSubscriptionsForPaidOrder(order.id);
      if (result === "fulfilled") fulfilled += 1;
    } catch {
    }
  }
  return fulfilled;
}

/** Get subscriptions by customer */
export async function getSubscriptionsByCustomer(customerId: string, filter: { status?: string } = {}): Promise<{
  items: SubscriptionWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { status } = filter;

  await retryPendingSubscriptionFulfillmentsForCustomer(customerId).catch(() => {});

  const where: Record<string, unknown> = { tenantId: TENANT_ID, customerId };

  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        order: true,
        customer: true,
        product: { select: { id: true, name: true, slug: true, type: true } },
        variant: true,
        gateway: true,
      },
      orderBy: { currentPeriodEnd: "asc" },
    }),
    prisma.subscription.count({ where }),
  ]);

  return { items, total, page: 1, pageSize: items.length, totalPages: 1 };
}

// ============================================================================
// Commission Queries
// ============================================================================

/** Get commissions by vendor */
export async function getCommissionsByVendor(vendorId: string, filter: { status?: string } = {}): Promise<{
  items: CommissionWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { status } = filter;

  const where: Record<string, unknown> = { tenantId: TENANT_ID, vendorId };

  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      include: {
        order: { select: { id: true, orderNumber: true, total: true, status: true } },
        product: { select: { id: true, name: true, slug: true } },
        vendor: true,
        affiliate: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.commission.count({ where }),
  ]);

  return { items, total, page: 1, pageSize: items.length, totalPages: 1 };
}

// ============================================================================
// Tax Rate Queries
// ============================================================================

/** Get tax rates */
export async function getTaxRates(filter: { country?: string; state?: string } = {}): Promise<TaxRate[]> {
  const { country, state } = filter;

  const where: Record<string, unknown> = { tenantId: TENANT_ID };

  if (country) where.country = country;
  if (state) where.state = state;

  return prisma.taxRate.findMany({
    where,
    orderBy: { priority: "asc" },
  });
}

// ============================================================================
// Wishlist Queries
// ============================================================================

/** Get wishlist by user */
export async function getWishlistByUser(userId: string): Promise<{ wishlist: { id: string; name: string; isPublic: boolean }; items: { product: Pick<ProductListItem, "id" | "name" | "slug" | "price" | "regularPrice" | "salePrice" | "stockStatus" | "manageStock" | "stockQuantity" | "images" | "type" | "downloadable" | "virtual">; variant?: { name: string | null; sku: string | null } }[] }> {
  const wishlist = await prisma.wishlist.findFirst({
    where: { tenantId: TENANT_ID, userId },
    include: { items: { include: { product: { select: { id: true, name: true, slug: true, price: true, regularPrice: true, salePrice: true, stockStatus: true, manageStock: true, stockQuantity: true, type: true, downloadable: true, virtual: true, images: { where: { isMain: true }, take: 1, include: { asset: true } } } }, variant: true } } },
  });

  if (!wishlist) {
    // Create default wishlist
    const newWishlist = await prisma.wishlist.create({
      data: {
        tenantId: TENANT_ID,
        userId,
        name: "My Wishlist",
        isPublic: false,
      },
      include: { items: { include: { product: { select: { id: true, name: true, slug: true, price: true, regularPrice: true, salePrice: true, stockStatus: true, manageStock: true, stockQuantity: true, type: true, downloadable: true, virtual: true, images: { where: { isMain: true }, take: 1, include: { asset: true } } } }, variant: true } } },
    });
    return { wishlist: { id: newWishlist.id, name: newWishlist.name, isPublic: newWishlist.isPublic }, items: newWishlist.items.map((item) => ({
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.product.price,
        regularPrice: item.product.regularPrice,
        salePrice: item.product.salePrice,
        stockStatus: item.product.stockStatus,
        manageStock: item.product.manageStock,
        stockQuantity: item.product.stockQuantity,
        images: item.product.images,
        type: item.product.type,
        downloadable: item.product.downloadable,
        virtual: item.product.virtual,
      },
      variant: item.variant ? { name: item.variant.name, sku: item.variant.sku } : undefined,
    })) };
  }

  return { wishlist: { id: wishlist.id, name: wishlist.name, isPublic: wishlist.isPublic }, items: wishlist.items.map((item) => ({
    product: {
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price,
      regularPrice: item.product.regularPrice,
      salePrice: item.product.salePrice,
      stockStatus: item.product.stockStatus,
      manageStock: item.product.manageStock,
      stockQuantity: item.product.stockQuantity,
      images: item.product.images,
      type: item.product.type,
      downloadable: item.product.downloadable,
      virtual: item.product.virtual,
    },
    variant: item.variant ? { name: item.variant.name, sku: item.variant.sku } : undefined,
  })) };
}

// ============================================================================
// Comparison Queries
// ============================================================================

/** Get product comparison data */
export async function getProductComparison(sessionId: string): Promise<{ productIds: string[]; compared: ProductWithRelations[] }> {
  const comparison = await prisma.productComparison.findUnique({
    where: { sessionId },
    include: {
      comparedProducts: {
        include: {
          product: {
            include: {
              categories: { include: { category: true } },
              attributes: { include: { attribute: true, term: true } },
              images: { include: { asset: true } },
              variants: true,
              tags: true,
              customFields: true,
            },
          },
        },
      },
    },
  });

  if (!comparison) {
    return { productIds: [], compared: [] };
  }

  return {
    productIds: comparison.productIds,
    compared: comparison.comparedProducts
      .map((cp) => cp.product)
      .filter((product) => product.tenantId === TENANT_ID),
  };
}

// ============================================================================
// Admin listings (taxonomy management)
// ============================================================================

export type ProductCategoryAdminRow = Prisma.ProductCategoryGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

export type ProductTagAdminRow = Prisma.ProductTagGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

/** Categories with product counts, for the admin taxonomy screens. */
export async function listProductCategories(): Promise<ProductCategoryAdminRow[]> {
  return prisma.productCategory.findMany({
    where: { tenantId: TENANT_ID },
    include: { _count: { select: { products: true } } },
    orderBy: [{ menuOrder: "asc" }, { name: "asc" }],
  });
}

/** Tags with product counts, for the admin taxonomy screens. */
export async function listProductTags(): Promise<ProductTagAdminRow[]> {
  return prisma.productTag.findMany({
    where: { tenantId: TENANT_ID },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

// ============================================================================
// Product grid (page-builder storefront block)
// ============================================================================

export type ProductGridCategory = { id: string; name: string; slug: string; parentId: string | null };

export type ProductGridItem = {
  id: string;
  name: string;
  slug: string;
  excerpt: string | null;
  price: number;
  regularPrice: number;
  onSale: boolean;
  imageAssetId: string | null;
  rating: number;
  reviewCount: number;
  stockStatus: string;
  featured: boolean;
  type: string;
  hasVariants: boolean;
  categories: { id: string; name: string; slug: string }[];
};

export type ProductGridPage = {
  items: ProductGridItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  categories: ProductGridCategory[];
};

export type ProductGridParams = {
  /** Restrict to one category ("" = all). */
  categoryId?: string;
  /** Extra restriction — only these categories may appear in the filter bar. */
  filterCategoryIds?: string[];
  page?: number;
  perPage?: number;
  orderBy?: "price" | "date" | "popular" | "name" | "menuOrder";
  sortOrder?: "asc" | "desc";
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
};

function plainExcerpt(shortDescription: string | null, description: string | null): string | null {
  const source = (shortDescription ?? description ?? "").trim();
  if (!source) return null;
  const text = source
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?)\]])/g, "$1")
    .trim();
  return text.length > 320 ? `${text.slice(0, 320).trimEnd()}…` : text || null;
}

type GridSearchRow = {
  name: string;
  sku: string | null;
  price: number;
  reviewCount: number;
  menuOrder: number;
  createdAt: Date;
  type: string;
  categories: Array<{ category: { id: string; name: string; slug: string } }>;
};

function compareGridRows(
  a: GridSearchRow,
  b: GridSearchRow,
  key: ProductGridParams["orderBy"],
  order: "asc" | "desc",
): number {
  const value = (row: GridSearchRow): string | number | Date => {
    switch (key) {
      case "price": return row.price;
      case "name": return row.name;
      case "menuOrder": return row.menuOrder;
      case "popular": return row.reviewCount;
      default: return row.createdAt;
    }
  };
  const left = value(a);
  const right = value(b);
  const result = left < right ? -1 : left > right ? 1 : 0;
  return order === "asc" ? result : -result;
}

/** One page of published products for the storefront Product Grid block. */
export async function getProductGridPage(params: ProductGridParams = {}): Promise<ProductGridPage> {
  const {
    categoryId = "",
    filterCategoryIds = [],
    page = 1,
    perPage = 9,
    orderBy: orderByKey = "date",
    sortOrder = "desc",
    search = "",
    minPrice = 0,
    maxPrice = 0,
    inStockOnly = false,
  } = params;

  const size = Math.min(48, Math.max(1, Math.round(perPage)));
  const current = Math.max(1, Math.round(page));
  const order: "asc" | "desc" = sortOrder === "asc" ? "asc" : "desc";

  const where: Prisma.ProductWhereInput = {
    tenantId: TENANT_ID,
    status: "PUBLISHED",
    visibility: "PUBLIC",
  };

  if (categoryId) {
    where.categories = { some: { categoryId } };
  } else if (filterCategoryIds.length > 0) {
    where.categories = { some: { categoryId: { in: filterCategoryIds } } };
  }

  const term = search.trim();
  if (term) {
    Object.assign(where, buildProductSearchWhere(term));
  }

  if (minPrice > 0 || maxPrice > 0) {
    where.price = {
      ...(minPrice > 0 ? { gte: minPrice } : {}),
      ...(maxPrice > 0 ? { lte: maxPrice } : {}),
    };
  }

  if (inStockOnly) where.stockStatus = { not: "OUT_OF_STOCK" };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    orderByKey === "price"
      ? { price: order }
      : orderByKey === "name"
        ? { name: order }
        : orderByKey === "menuOrder"
          ? { menuOrder: order }
          : orderByKey === "popular"
            ? { reviewCount: order }
            : { createdAt: order };

  const skip = (current - 1) * size;

  const [rows, total, categoryRows] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        shortDescription: true,
        description: true,
        price: true,
        regularPrice: true,
        salePrice: true,
        salePriceStart: true,
        salePriceEnd: true,
        type: true,
        _count: { select: { variants: true } },
        averageRating: true,
        reviewCount: true,
        stockStatus: true,
        featured: true,
        createdAt: true,
        menuOrder: true,
        images: {
          where: { isMain: true },
          take: 1,
          select: { asset: { select: { id: true } } },
        },
        categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy,
      ...(term ? { take: MAX_RANKED_SEARCH_ROWS as number } : { skip, take: size }),
    }),
    prisma.product.count({ where }),
    prisma.productCategory.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        ...(filterCategoryIds.length > 0 ? { id: { in: filterCategoryIds } } : {}),
      },
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: [{ menuOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const now = Date.now();
  const pageRows = term
    ? sortProductSearchRows(rows, term, (a, b) => compareGridRows(a, b, orderByKey, order)).slice(skip, skip + size)
    : rows;

  return {
    items: pageRows.map((row) => {
      const effective = getEffectiveProductPrice(
        {
          ...row,
          salePrice: row.salePrice !== null && row.salePrice < row.regularPrice ? row.salePrice : null,
        },
        new Date(now),
      );

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        excerpt: plainExcerpt(row.shortDescription, row.description),
        price: effective.price,
        regularPrice: effective.regularPrice,
        onSale: effective.onSale,
        imageAssetId: row.images[0]?.asset.id ?? null,
        rating: row.averageRating ?? 0,
        reviewCount: row.reviewCount,
        stockStatus: row.stockStatus,
        featured: row.featured,
        type: row.type,
        hasVariants: row._count.variants > 0,
        categories: row.categories.map((link) => link.category),
      };
    }),
    page: current,
    perPage: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    categories: categoryRows,
  };
}

/**
 * Published products by id — powers the wishlist page. Only public,
 * published rows are returned (ids from other stores or drafts drop out).
 */
export async function getProductsByIds(ids: string[]): Promise<ProductGridItem[]> {
  const unique = Array.from(new Set(ids.filter(Boolean))).slice(0, 100);
  if (unique.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: {
      id: { in: unique },
      tenantId: TENANT_ID,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      price: true,
      regularPrice: true,
      salePrice: true,
      salePriceStart: true,
      salePriceEnd: true,
      type: true,
      _count: { select: { variants: true } },
      averageRating: true,
      reviewCount: true,
      stockStatus: true,
      featured: true,
      images: {
        where: { isMain: true },
        take: 1,
        select: { asset: { select: { id: true } } },
      },
      categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
    },
  });

  const now = Date.now();
  return rows.map((row) => {
    const saleActive =
      row.salePrice != null &&
      row.salePrice < row.regularPrice &&
      (!row.salePriceStart || row.salePriceStart.getTime() <= now) &&
      (!row.salePriceEnd || row.salePriceEnd.getTime() >= now);

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      excerpt: plainExcerpt(row.shortDescription, row.description),
      price: row.price,
      regularPrice: row.regularPrice,
      onSale: saleActive,
      imageAssetId: row.images[0]?.asset.id ?? null,
      rating: row.averageRating ?? 0,
      reviewCount: row.reviewCount,
      stockStatus: row.stockStatus,
      featured: row.featured,
      type: row.type,
      hasVariants: row._count.variants > 0,
      categories: row.categories.map((link) => link.category),
    };
  });
}

// Export TENANT_ID for use in other modules
export { TENANT_ID };
