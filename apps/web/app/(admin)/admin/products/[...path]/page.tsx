/**
 * Product form route — handles both /admin/products/add and /admin/products/[id].
 *
 * Server component: loads product, categories, attributes and payment gateways,
 * then renders the client ProductForm.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductLinkType } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import ProductForm from "@/components/admin/product/ProductForm";
import ProductReviewModeration from "@/components/admin/product/ProductReviewModeration";
import {
  getAllProductAttributes,
  getEnabledPaymentGateways,
  getProductById,
  getProductCategories,
  getProductLinks,
  getProductOptions,
  getProductTags,
  getShippingClasses,
  getVendors,
} from "@/modules/ecommerce/queries";
import type { ProductFormInput } from "@/modules/ecommerce/types";
import { saveProduct } from "../actions";

type ProductLinks = Awaited<ReturnType<typeof getProductLinks>>;

function mapToFormInput(
  product: NonNullable<Awaited<ReturnType<typeof getProductById>>>,
  links: ProductLinks,
): ProductFormInput {
  return {
    name: product.name,
    slug: product.slug,
    type: product.type,
    status: product.status,
    visibility: product.visibility,
    sku: product.sku ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
    salePriceStart: product.salePriceStart,
    salePriceEnd: product.salePriceEnd,
    taxStatus: product.taxStatus,
    taxClass: product.taxClass ?? "",
    manageStock: product.manageStock,
    stockQuantity: product.stockQuantity,
    stockStatus: product.stockStatus,
    backorders: product.backorders,
    lowStockAmount: product.lowStockAmount,
    soldIndividually: product.soldIndividually,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    shippingClassId: product.shippingClassId,
    shippingRequired: product.shippingRequired,
    shippingTaxable: product.shippingTaxable,
    externalUrl: product.externalUrl ?? "",
    externalButtonText: product.externalButtonText ?? "Buy Now",
    subscriptionPeriod: product.subscriptionPeriod,
    subscriptionInterval: product.subscriptionInterval,
    subscriptionLength: product.subscriptionLength,
    subscriptionTrialPeriod: product.subscriptionTrialPeriod,
    subscriptionSignUpFee: product.subscriptionSignUpFee,
    membershipAccess: product.membershipAccess,
    membershipDuration: product.membershipDuration,
    serviceDuration: product.serviceDuration,
    serviceBufferBefore: product.serviceBufferBefore,
    serviceBufferAfter: product.serviceBufferAfter,
    serviceMaxBookings: product.serviceMaxBookings,
    serviceLocation: product.serviceLocation,
    serviceCalendarId: product.serviceCalendarId,
    commissionRate: product.commissionRate,
    commissionType: product.commissionType,
    vendorId: product.vendorId,
    downloadable: product.downloadable,
    downloadLimit: product.downloadLimit,
    downloadExpiry: product.downloadExpiry,
    downloadFiles: (product.downloadFiles ?? []) as unknown[],
    virtual: product.virtual,
    reviewsAllowed: product.reviewsAllowed,
    purchaseNote: product.purchaseNote ?? "",
    menuOrder: product.menuOrder,
    featured: product.featured,
    catalogVisibility: product.catalogVisibility,
    dateOnSaleFrom: product.dateOnSaleFrom,
    dateOnSaleTo: product.dateOnSaleTo,
    primaryCategoryId: product.categories.find((c) => c.isPrimary)?.categoryId ?? null,
    categoryIds: product.categories.map((c) => c.categoryId),
    attributeValues: product.attributes.map((a) => ({
      attributeId: a.attributeId,
      termId: a.termId,
      customValue: a.customValue,
      isVisible: a.isVisible,
      isVariation: a.isVariation,
      position: a.position,
    })),
    tagIds: product.tags.map((t) => t.tagId),
    images: product.images.map((img) => ({
      assetId: img.assetId,
      alt: img.alt,
      position: img.position,
      isMain: img.isMain,
    })),
    customFields: product.customFields.map((f) => ({
      key: f.key,
      label: f.label,
      value: f.value,
      type: f.type,
      options: f.options,
      group: f.group,
      position: f.position,
      isPublic: f.isPublic,
      isRequired: f.isRequired,
    })),
    variantData: product.variants.map((v) => {
      const attrs = (v.attributes ?? {}) as Record<string, unknown>;
      const salePriceStart = typeof attrs.__salePriceStart === "string" ? new Date(attrs.__salePriceStart) : null;
      const salePriceEnd = typeof attrs.__salePriceEnd === "string" ? new Date(attrs.__salePriceEnd) : null;
      return {
        id: v.id,
        sku: v.sku ?? "",
        name: v.name ?? "",
        regularPrice: v.regularPrice,
        salePrice: v.salePrice,
        salePriceStart: salePriceStart && !Number.isNaN(salePriceStart.getTime()) ? salePriceStart : null,
        salePriceEnd: salePriceEnd && !Number.isNaN(salePriceEnd.getTime()) ? salePriceEnd : null,
        stockStatus: v.stockStatus,
        stockQuantity: v.stockQuantity,
        manageStock: v.manageStock,
        backorders: v.backorders,
        lowStockAmount: v.lowStockAmount,
        weight: v.weight,
        length: v.length,
        width: v.width,
        height: v.height,
        imageAssetId: v.imageAssetId,
        downloadable: v.downloadable,
        downloadLimit: v.downloadLimit,
        downloadExpiry: v.downloadExpiry,
        downloadFiles: (v.downloadFiles ?? []) as unknown[],
        virtual: v.virtual,
        description: v.description ?? "",
        purchaseNote: v.purchaseNote ?? "",
        attributes: Object.fromEntries(
          Object.entries(attrs)
            .filter(([k]) => k !== "__salePriceStart" && k !== "__salePriceEnd")
            .map(([k, val]) => [k, String(val)]),
        ) as Record<string, string>,
        menuOrder: v.menuOrder,
      };
    }),
    relatedProductIds: links.filter((link) => link.type === ProductLinkType.RELATED).map((link) => link.linkedProductId),
    crossSellProductIds: links.filter((link) => link.type === ProductLinkType.CROSS_SELL).map((link) => link.linkedProductId),
    upSellProductIds: links.filter((link) => link.type === ProductLinkType.UP_SELL).map((link) => link.linkedProductId),
    bundleChildIds: links.filter((link) => link.type === ProductLinkType.BUNDLE_CHILD).map((link) => link.linkedProductId),
    groupedChildIds: links.filter((link) => link.type === ProductLinkType.GROUPED_CHILD).map((link) => link.linkedProductId),
    seoTitle: product.seoTitle,
    metaDesc: product.metaDesc,
    focusKeyphrase: product.focusKeyphrase,
    ogImage: product.ogImage,
    canonicalUrl: product.canonicalUrl,
  };
}

export default async function ProductFormPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const isAdd = path[0] === "add";
  const id = isAdd ? null : path[0];

  if (path.length !== 1) notFound();

  const [categories, attributes, tags, paymentGateways, product, productOptions, shippingClasses, vendors, links, reviews] =
    await Promise.all([
      getProductCategories(),
      getAllProductAttributes(),
      getProductTags(),
      getEnabledPaymentGateways(),
      id ? getProductById(id) : Promise.resolve(null),
      getProductOptions(),
      getShippingClasses(),
      getVendors(),
      id ? getProductLinks(id) : Promise.resolve([]),
      id
        ? prisma.productReview.findMany({
            where: { tenantId: TENANT_ID, productId: id },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              authorName: true,
              authorEmail: true,
              rating: true,
              title: true,
              body: true,
              status: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

  if (id && !product) notFound();

  const productForForm = product ? mapToFormInput(product, links) : null;
  const isPaymentDisabled = paymentGateways.length === 0;

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-zinc-500">
          Admin /{" "}
          <Link href="/admin/products" className="text-zinc-700 hover:underline">
            Products
          </Link>{" "}
          / <span className="text-zinc-700">{isAdd ? "Add" : "Edit"}</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          {isAdd ? "Add New Product" : "Edit Product"}
        </h1>
        {isPaymentDisabled && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No payment gateway is enabled. Products can be saved, but checkout will not
            work until at least one gateway is configured.
          </p>
        )}
      </div>

      <ProductForm
        productId={product?.id ?? null}
        product={productForForm}
        categories={categories}
        attributes={attributes}
        tags={tags}
        paymentGateways={paymentGateways}
        productOptions={productOptions}
        shippingClasses={shippingClasses}
        vendors={vendors}
        onSave={saveProduct}
      />
      <ProductReviewModeration
        reviews={reviews.map((review) => ({
          id: review.id,
          authorName: review.authorName,
          authorEmail: review.authorEmail,
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: String(review.status),
          createdAt: review.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
