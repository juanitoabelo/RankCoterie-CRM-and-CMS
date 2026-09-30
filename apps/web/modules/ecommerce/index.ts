/**
 * E-Commerce Module — Public API
 * 
 * Provides comprehensive e-commerce management for products, orders, carts,
 * payments, and inventory.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { 
 *   getProducts, getProductBySlug, getFeaturedProducts,
 *   getPaymentGateways, getEnabledPaymentGateways,
 *   getOrders, getOrdersByCustomer,
 *   getCartBySession, addItemToCart, removeItemFromCart,
 *   getCoupons, isCouponValid,
 *   getProductCategories, getProductTags
 * } from "@/modules/ecommerce";
 * 
 * // Products
 * const { products, total } = await getProducts({ page: 1 });
 * const product = await getProductBySlug("awesome-widget");
 * const featured = await getFeaturedProducts(6);
 * 
 * // Categories & Tags
 * const categories = await getProductCategories();
 * const tags = await getProductTags();
 * 
 * // Payments
 * const gateways = await getEnabledPaymentGateways();
 * 
 * // Cart
 * const cart = await getCartBySession(sessionId);
 * const result = await addItemToCart(cart.id, productId, 2);
 * 
 * // Orders
 * const { orders, total } = await getOrders({ status: "PENDING", page: 1 });
 * 
 * // Coupons
 * const { valid, discountAmount } = await isCouponValid("SAVE10", 199.99);
 * ```
 */

// Types
export type {
  // Core types
  ProductType,
  ProductStatus,
  ProductVisibility,
  StockStatus,
  OrderStatus,
  PaymentStatus,
  PaymentGatewayType,
  CouponType,
  TaxCalculationMethod,
  ShippingMethodType,
  
  // Entity types
  ProductWithRelations,
  ProductListItem,
  ProductCategoryWithRelations,
  ProductCategoryListItem,
  ProductAttributeWithTerms,
  ProductAttributeTerm,
  ProductImageWithAsset,
  ProductAttributeValueWithTerm,
  ProductVariantWithRelations,
  ProductCustomField,
  
  // Cart types
  CartWithItems,
  CartItemWithRelations,
  
  // Order types
  OrderWithRelations,
  OrderItemWithRelations,
  OrderListItem,
  OrderNote,
  RefundWithRelations,
  ShipmentWithRelations,
  
  // Payment types
  PaymentGatewayWithRelations,
  PaymentTransactionWithRelations,
  
  // Coupon types
  CouponWithRelations,
  
  // Subscription types
  SubscriptionWithRelations,
  
  // Commission types
  CommissionWithRelations,
  
  // Filter types
  ProductFilter,
  CategoryFilter,
  OrderFilter,
  CartFilter,
  PaymentGatewayFilter,
  CommissionFilter,
  SubscriptionFilter,
  
  // Paginated response
  PaginatedResponse,
  
  // Action results
  ActionResult,
  
  // Form inputs
  ProductFormInput,
  CategoryFormInput,
  AttributeFormInput,
  AttributeTermFormInput,
  CouponFormInput,
  PaymentGatewayFormInput,
  OrderUpdateInput,
  CartUpdateInput,
  
  // Frontend display types
  ProductGridProps,
  ProductCardProps,
  ProductFilterProps,
  CheckoutData,
  CheckoutResult,
} from "./types";

// Queries
export {
  // Products
  getProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getProductsByCategory,
  getProductCategories,
  getProductCategoryTree,
  getProductTags,
  getProductTagsByProduct,
  
  // Attributes
  getProductAttributes,
  getAllProductAttributes,
  getAttributeById,
  
  // Orders
  getOrders,
  getOrderById,
  getOrdersByCustomer,
  getPendingOrders,
  getCompletedOrders,
  
  // Cart
  getCartBySession,
  getCartByUser,
  getOrCreateCart,
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
  clearCart,
  
  // Payment Gateways
  getPaymentGateways,
  getEnabledPaymentGateways,
  getPaymentGatewayById,
  createPaymentGateway,
  updatePaymentGateway,
  
  // Coupons
  getCoupons,
  getCouponByCode,
  isCouponValid,
  
  // Subscriptions
  getSubscriptionsByCustomer,
  
  // Commissions
  getCommissionsByVendor,
  
  // Tax rates
  getTaxRates,
  
  // Wishlist
  getWishlistByUser,
  
  // Comparison
  getProductComparison,
} from "./queries";

// Export tenant ID for use in other modules
export { TENANT_ID } from "@/lib/tenant";

// Actions will be exported once created
// export {
//   createProduct,
//   updateProduct,
//   deleteProduct,
//   createOrder,
//   updateOrder,
//   cancelOrder,
//   processRefund,
//   createPaymentIntent,
//   capturePayment,
// } from "./actions";