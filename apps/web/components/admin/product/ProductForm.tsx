"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RichTextarea from "@/components/admin/RichTextarea";
import ImageUploader from "@/components/admin/ImageUploader";
import ProductGalleryUploader from "@/components/admin/product/ProductGalleryUploader";
import type { ActionResult } from "@/app/(admin)/admin/products/actions";
import type {
  PaymentGatewayWithRelations,
  ProductAttributeWithTerms,
  ProductCategoryWithRelations,
  ProductFormInput,
} from "@/modules/ecommerce/types";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";
const cardCls = "rounded-xl border border-zinc-200 bg-white p-5";

const ProductTypeOptions = [
  { value: "SIMPLE", label: "Simple product" },
  { value: "VARIABLE", label: "Variable product (with options)" },
  { value: "SUBSCRIPTION", label: "Subscription / membership" },
  { value: "SERVICE", label: "Service / appointment" },
  { value: "EXTERNAL", label: "External / affiliate product" },
  { value: "GROUPED", label: "Grouped product" },
  { value: "BUNDLE", label: "Product bundle" },
];

const ProductStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "PRIVATE", label: "Private" },
];

const ProductVisibilityOptions = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
  { value: "MEMBERS", label: "Members only" },
  { value: "HIDDEN", label: "Hidden" },
];

const StockStatusOptions = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "ON_BACKORDER", label: "On backorder" },
  { value: "LOW_STOCK", label: "Low stock" },
];

const TaxCalculationMethodOptions = [
  { value: "NONE", label: "No tax" },
  { value: "STANDARD", label: "Standard tax" },
  { value: "REDUCED", label: "Reduced rate" },
  { value: "ZERO_RATED", label: "Zero rated" },
  { value: "EXEMPT", label: "Exempt" },
];

const SubscriptionPeriodOptions = [
  { value: "day", label: "Day(s)" },
  { value: "week", label: "Week(s)" },
  { value: "month", label: "Month(s)" },
  { value: "year", label: "Year(s)" },
];

const CatalogVisibilityOptions = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "catalog", label: "Catalog only" },
  { value: "search", label: "Search only" },
];

const BackorderOptions = [
  { value: "no", label: "Do not allow" },
  { value: "notify", label: "Allow, but notify" },
  { value: "yes", label: "Allow" },
];

interface CategoryOption {
  id: string;
  name: string;
  depth: number;
}

function flattenCategories(
  categories: ProductCategoryWithRelations[],
  depth = 0,
): CategoryOption[] {
  const options: CategoryOption[] = [];

  for (const category of categories) {
    if (category.parentId && depth === 0) continue;
    options.push({ id: category.id, name: category.name, depth });
    options.push(...flattenCategories(category.children ?? [], depth + 1));
  }

  return options;
}

function toDefault(product: ProductFormInput | null): ProductFormInput {
  return {
    name: product?.name || "",
    slug: product?.slug || "",
    type: product?.type || "SIMPLE",
    status: product?.status || "DRAFT",
    visibility: product?.visibility || "PUBLIC",
    sku: product?.sku || "",
    shortDescription: product?.shortDescription || "",
    description: product?.description || "",
    regularPrice: product?.regularPrice || 0,
    salePrice: product?.salePrice ?? null,
    salePriceStart: product?.salePriceStart ?? null,
    salePriceEnd: product?.salePriceEnd ?? null,
    taxStatus: product?.taxStatus || "STANDARD",
    taxClass: product?.taxClass || "",
    manageStock: product?.manageStock ?? false,
    stockQuantity: product?.stockQuantity ?? null,
    backorders: product?.backorders ?? "no",
    lowStockAmount: product?.lowStockAmount ?? null,
    soldIndividually: product?.soldIndividually ?? false,
    weight: product?.weight ?? null,
    length: product?.length ?? null,
    width: product?.width ?? null,
    height: product?.height ?? null,
    shippingClassId: product?.shippingClassId ?? null,
    shippingRequired: product?.shippingRequired ?? true,
    shippingTaxable: product?.shippingTaxable ?? true,
    externalUrl: product?.externalUrl ?? "",
    externalButtonText: product?.externalButtonText ?? "Buy Now",
    subscriptionPeriod: product?.subscriptionPeriod ?? "month",
    subscriptionInterval: product?.subscriptionInterval ?? null,
    subscriptionLength: product?.subscriptionLength ?? null,
    subscriptionTrialPeriod: product?.subscriptionTrialPeriod ?? null,
    subscriptionSignUpFee: product?.subscriptionSignUpFee ?? null,
    membershipAccess: product?.membershipAccess ?? null,
    membershipDuration: product?.membershipDuration ?? null,
    serviceDuration: product?.serviceDuration ?? null,
    serviceBufferBefore: product?.serviceBufferBefore ?? null,
    serviceBufferAfter: product?.serviceBufferAfter ?? null,
    serviceMaxBookings: product?.serviceMaxBookings ?? null,
    serviceLocation: product?.serviceLocation ?? null,
    serviceCalendarId: product?.serviceCalendarId ?? null,
    commissionRate: product?.commissionRate ?? null,
    commissionType: product?.commissionType ?? null,
    vendorId: product?.vendorId ?? null,
    downloadable: product?.downloadable ?? false,
    downloadLimit: product?.downloadLimit ?? null,
    downloadExpiry: product?.downloadExpiry ?? null,
    downloadFiles: product?.downloadFiles ?? [],
    virtual: product?.virtual ?? false,
    reviewsAllowed: product?.reviewsAllowed ?? true,
    purchaseNote: product?.purchaseNote || "",
    menuOrder: product?.menuOrder ?? 0,
    featured: product?.featured ?? false,
    catalogVisibility: product?.catalogVisibility || "visible",
    dateOnSaleFrom: product?.dateOnSaleFrom ?? null,
    dateOnSaleTo: product?.dateOnSaleTo ?? null,
    stockStatus: product?.stockStatus || "IN_STOCK",
    primaryCategoryId: product?.primaryCategoryId ?? null,
    categoryIds: product?.categoryIds ?? [],
    attributeValues: product?.attributeValues ?? [],
    customFields: product?.customFields ?? [],
    variantData: product?.variantData ?? [],
    relatedProductIds: product?.relatedProductIds ?? [],
    crossSellProductIds: product?.crossSellProductIds ?? [],
    upSellProductIds: product?.upSellProductIds ?? [],
    tagIds: product?.tagIds ?? [],
    images: product?.images ?? [],
    seoTitle: product?.seoTitle ?? null,
    metaDesc: product?.metaDesc ?? null,
    focusKeyphrase: product?.focusKeyphrase ?? null,
    ogImage: product?.ogImage ?? null,
    canonicalUrl: product?.canonicalUrl ?? null,
  };
}

function dateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function downloadFilesText(files: unknown[]): string {
  return JSON.stringify(files ?? [], null, 2);
}

export default function ProductForm({
  productId,
  product,
  categories,
  attributes,
  tags,
  paymentGateways,
  onSave,
}: {
  productId: string | null;
  product: ProductFormInput | null;
  categories: ProductCategoryWithRelations[];
  attributes: ProductAttributeWithTerms[];
  tags: { id: string; name: string; slug: string }[];
  paymentGateways: PaymentGatewayWithRelations[];
  onSave: (formData: FormData) => Promise<ActionResult>;
}) {
  const [initial] = useState<ProductFormInput>(() => toDefault(product));
  const [message, setMessage] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const categoryOptions = flattenCategories(categories);
  const [featuredAssetId, setFeaturedAssetId] = useState<string | null>(
    () => product?.images.find((img) => img.isMain)?.assetId ?? null,
  );
  const [galleryAssetIds, setGalleryAssetIds] = useState<string[]>(() =>
    (product?.images ?? [])
      .filter((img) => !img.isMain)
      .sort((a, b) => a.position - b.position)
      .map((img) => img.assetId),
  );
  const selectedCategories = new Set(initial.categoryIds);
  const selectedTags = new Set(initial.tagIds);
  const selectedAttributes = new Map(
    initial.attributeValues.map((value) => [value.attributeId, value]),
  );

  const onFeaturedChange = (assetId: string) => {
    setFeaturedAssetId(assetId);
    setGalleryAssetIds((prev) => prev.filter((id) => id !== assetId));
  };

  const onMakeFeatured = (assetId: string) => {
    const previous = featuredAssetId;
    setFeaturedAssetId(assetId);
    setGalleryAssetIds((prev) => [
      ...(previous ? [previous] : []),
      ...prev.filter((id) => id !== assetId),
    ]);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await onSave(formData);
        if (result.ok) {
          setMessage({ ok: true });
          router.push("/admin/products");
        } else {
          setMessage({ ok: false, error: result.error });
        }
      } catch (err) {
        setMessage({ ok: false, error: err instanceof Error ? err.message : "Failed to save product." });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-8">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Product saved successfully." : message.error}
        </p>
      )}

      {paymentGateways.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          No payment gateway is enabled — this product can be saved, but not purchased yet.
        </p>
      )}

      {productId && <input type="hidden" name="id" value={productId} />}

      {/* Basics */}
      <section className={cardCls}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">General</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="name">
              Name <span className="text-red-500">*</span>
            </label>
            <input id="name" type="text" name="name" defaultValue={initial.name} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              id="slug"
              type="text"
              name="slug"
              defaultValue={initial.slug}
              required
              className={inputCls}
              placeholder="auto-generated from name if left blank"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="type">
              Product type <span className="text-red-500">*</span>
            </label>
            <select id="type" name="type" defaultValue={initial.type} className={inputCls}>
              {ProductTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="status">
              Status <span className="text-red-500">*</span>
            </label>
            <select id="status" name="status" defaultValue={initial.status} className={inputCls}>
              {ProductStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="visibility">
              Visibility <span className="text-red-500">*</span>
            </label>
            <select id="visibility" name="visibility" defaultValue={initial.visibility} className={inputCls}>
              {ProductVisibilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="catalogVisibility">
              Catalog visibility
            </label>
            <select
              id="catalogVisibility"
              name="catalogVisibility"
              defaultValue={initial.catalogVisibility}
              className={inputCls}
            >
              {CatalogVisibilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="menuOrder">
              Menu order
            </label>
            <input
              id="menuOrder"
              type="number"
              name="menuOrder"
              defaultValue={initial.menuOrder}
              className={inputCls}
            />
          </div>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="featured" defaultChecked={initial.featured} className="h-4 w-4 rounded border-zinc-400" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="reviewsAllowed" defaultChecked={initial.reviewsAllowed} className="h-4 w-4 rounded border-zinc-400" />
              Reviews allowed
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="virtual" defaultChecked={initial.virtual} className="h-4 w-4 rounded border-zinc-400" />
              Virtual product
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className={labelCls} htmlFor="shortDescription">
              Short description
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              defaultValue={initial.shortDescription}
              rows={2}
              className={inputCls}
            />
          </div>
          <RichTextarea
            name="description"
            label="Description"
            value={initial.description}
            placeholder="Full product description…"
          />
        </div>
      </section>

      {/* Pricing */}
      <section className={cardCls}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Pricing</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="regularPrice">
              Regular price <span className="text-red-500">*</span>
            </label>
            <input
              id="regularPrice"
              type="number"
              name="regularPrice"
              defaultValue={initial.regularPrice}
              min="0"
              step="0.01"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="salePrice">
              Sale price
            </label>
            <input
              id="salePrice"
              type="number"
              name="salePrice"
              defaultValue={initial.salePrice ?? ""}
              step="0.01"
              className={inputCls}
              placeholder="Leave empty for no sale"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="salePriceStart">
              Sale start date
            </label>
            <input
              id="salePriceStart"
              type="date"
              name="salePriceStart"
              defaultValue={dateInput(initial.salePriceStart)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="salePriceEnd">
              Sale end date
            </label>
            <input
              id="salePriceEnd"
              type="date"
              name="salePriceEnd"
              defaultValue={dateInput(initial.salePriceEnd)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="taxStatus">
              Tax status
            </label>
            <select id="taxStatus" name="taxStatus" defaultValue={initial.taxStatus} className={inputCls}>
              {TaxCalculationMethodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="taxClass">
              Tax class
            </label>
            <input
              id="taxClass"
              type="text"
              name="taxClass"
              defaultValue={initial.taxClass}
              className={inputCls}
              placeholder="e.g. standard / reduced"
            />
          </div>
        </div>
      </section>

      {/* Inventory */}
      <section className={cardCls}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Inventory</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="sku">
              SKU
            </label>
            <input id="sku" type="text" name="sku" defaultValue={initial.sku} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="stockStatus">
              Stock status
            </label>
            <select id="stockStatus" name="stockStatus" defaultValue={initial.stockStatus} className={inputCls}>
              {StockStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="stockQuantity">
              Stock quantity
            </label>
            <input
              id="stockQuantity"
              type="number"
              name="stockQuantity"
              defaultValue={initial.stockQuantity ?? ""}
              step="1"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="lowStockAmount">
              Low stock threshold
            </label>
            <input
              id="lowStockAmount"
              type="number"
              name="lowStockAmount"
              defaultValue={initial.lowStockAmount ?? ""}
              step="1"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="backorders">
              Backorders
            </label>
            <select id="backorders" name="backorders" defaultValue={initial.backorders} className={inputCls}>
              {BackorderOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="manageStock" defaultChecked={initial.manageStock} className="h-4 w-4 rounded border-zinc-400" />
              Manage stock
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="soldIndividually" defaultChecked={initial.soldIndividually} className="h-4 w-4 rounded border-zinc-400" />
              Sold individually
            </label>
          </div>
        </div>
      </section>

      {/* Shipping & purchases */}
      <section className={cardCls}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Shipping &amp; purchase
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="weight">
              Weight (kg)
            </label>
            <input
              id="weight"
              type="number"
              name="weight"
              defaultValue={initial.weight ?? ""}
              step="0.01"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Dimensions (cm)</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                name="length"
                aria-label="Length"
                defaultValue={initial.length ?? ""}
                step="0.1"
                placeholder="Length"
                className={inputCls}
              />
              <input
                type="number"
                name="width"
                aria-label="Width"
                defaultValue={initial.width ?? ""}
                step="0.1"
                placeholder="Width"
                className={inputCls}
              />
              <input
                type="number"
                name="height"
                aria-label="Height"
                defaultValue={initial.height ?? ""}
                step="0.1"
                placeholder="Height"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="externalUrl">
              External URL (affiliate)
            </label>
            <input
              id="externalUrl"
              type="url"
              name="externalUrl"
              defaultValue={initial.externalUrl ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="externalButtonText">
              External button text
            </label>
            <input
              id="externalButtonText"
              type="text"
              name="externalButtonText"
              defaultValue={initial.externalButtonText}
              className={inputCls}
            />
          </div>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="shippingRequired" defaultChecked={initial.shippingRequired} className="h-4 w-4 rounded border-zinc-400" />
              Shipping required
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="shippingTaxable" defaultChecked={initial.shippingTaxable} className="h-4 w-4 rounded border-zinc-400" />
              Shipping taxable
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="purchaseNote">
              Purchase note
            </label>
            <textarea
              id="purchaseNote"
              name="purchaseNote"
              defaultValue={initial.purchaseNote}
              rows={2}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Downloads */}
      <details className={`${cardCls} group`} open={initial.downloadable}>
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Downloads
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="downloadable" defaultChecked={initial.downloadable} className="h-4 w-4 rounded border-zinc-400" />
              Downloadable product
            </label>
          </div>
          <div>
            <label className={labelCls} htmlFor="downloadLimit">
              Download limit (−1 = unlimited)
            </label>
            <input
              id="downloadLimit"
              type="number"
              name="downloadLimit"
              defaultValue={initial.downloadLimit ?? -1}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="downloadExpiry">
              Download expiry in days (0 = never)
            </label>
            <input
              id="downloadExpiry"
              type="number"
              name="downloadExpiry"
              defaultValue={initial.downloadExpiry ?? 0}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="downloadFiles">
              Download files (JSON array of <code>{"{ name, url }"}</code>)
            </label>
            <textarea
              id="downloadFiles"
              name="downloadFiles"
              defaultValue={downloadFilesText(initial.downloadFiles)}
              rows={4}
              className={`${inputCls} font-mono text-xs`}
            />
          </div>
        </div>
      </details>

      {/* Subscription */}
      <details className={`${cardCls} group`} open={initial.type === "SUBSCRIPTION"}>
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Subscription &amp; membership
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="subscriptionPeriod">
              Billing period
            </label>
            <select
              id="subscriptionPeriod"
              name="subscriptionPeriod"
              defaultValue={initial.subscriptionPeriod ?? "month"}
              className={inputCls}
            >
              {SubscriptionPeriodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="subscriptionInterval">
              Bill every (interval)
            </label>
            <input
              id="subscriptionInterval"
              type="number"
              name="subscriptionInterval"
              defaultValue={initial.subscriptionInterval ?? 1}
              min={1}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="subscriptionLength">
              Subscription length (periods, empty = until cancelled)
            </label>
            <input
              id="subscriptionLength"
              type="number"
              name="subscriptionLength"
              defaultValue={initial.subscriptionLength ?? ""}
              min={0}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="subscriptionTrialPeriod">
              Trial length (periods)
            </label>
            <input
              id="subscriptionTrialPeriod"
              type="number"
              name="subscriptionTrialPeriod"
              defaultValue={initial.subscriptionTrialPeriod ?? 0}
              min={0}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="subscriptionSignUpFee">
              Sign-up fee
            </label>
            <input
              id="subscriptionSignUpFee"
              type="number"
              name="subscriptionSignUpFee"
              defaultValue={initial.subscriptionSignUpFee ?? ""}
              step="0.01"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="membershipDuration">
              Membership duration
            </label>
            <input
              id="membershipDuration"
              type="text"
              name="membershipDuration"
              defaultValue={initial.membershipDuration ?? ""}
              className={inputCls}
              placeholder="e.g. 12 months"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="membershipAccess">
              Membership access level
            </label>
            <input
              id="membershipAccess"
              type="text"
              name="membershipAccess"
              defaultValue={initial.membershipAccess ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </details>

      {/* Service / booking */}
      <details className={`${cardCls} group`} open={initial.type === "SERVICE"}>
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Service &amp; booking
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="serviceDuration">
              Duration (minutes)
            </label>
            <input
              id="serviceDuration"
              type="number"
              name="serviceDuration"
              defaultValue={initial.serviceDuration ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="serviceMaxBookings">
              Max bookings per slot
            </label>
            <input
              id="serviceMaxBookings"
              type="number"
              name="serviceMaxBookings"
              defaultValue={initial.serviceMaxBookings ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="serviceBufferBefore">
              Buffer before (minutes)
            </label>
            <input
              id="serviceBufferBefore"
              type="number"
              name="serviceBufferBefore"
              defaultValue={initial.serviceBufferBefore ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="serviceBufferAfter">
              Buffer after (minutes)
            </label>
            <input
              id="serviceBufferAfter"
              type="number"
              name="serviceBufferAfter"
              defaultValue={initial.serviceBufferAfter ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="serviceLocation">
              Location
            </label>
            <input
              id="serviceLocation"
              type="text"
              name="serviceLocation"
              defaultValue={initial.serviceLocation ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="serviceCalendarId">
              Calendar id
            </label>
            <input
              id="serviceCalendarId"
              type="text"
              name="serviceCalendarId"
              defaultValue={initial.serviceCalendarId ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </details>

      {/* Featured image + gallery */}
      <section className={cardCls}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Images</h2>
        <div className="mt-4">
          <ImageUploader
            key={featuredAssetId ?? "no-featured-image"}
            name="imageAssetId"
            label="Featured image"
            currentAssetId={featuredAssetId}
            onUpload={onFeaturedChange}
          />
          <p className="mt-2 text-xs text-zinc-500">
            Shown as the product&apos;s primary image across lists and grids.
          </p>
        </div>
        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="text-xs font-medium text-zinc-600">Gallery</p>
          <div className="mt-2">
            <ProductGalleryUploader
              value={galleryAssetIds}
              featuredAssetId={featuredAssetId}
              onChange={setGalleryAssetIds}
              onMakeFeatured={onMakeFeatured}
            />
          </div>
        </div>
      </section>

      {/* Taxonomy */}
      <section className={cardCls}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Categories, tags &amp; attributes
        </h2>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="primaryCategoryId">
              Primary category
            </label>
            <select
              id="primaryCategoryId"
              name="primaryCategoryId"
              defaultValue={initial.primaryCategoryId ?? ""}
              className={inputCls}
            >
              <option value="">— None —</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-zinc-800">All categories</legend>
              {categoryOptions.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">
                  No categories yet — create them under{" "}
                  <Link className="underline" href="/admin/products/categories">
                    Products → Categories
                  </Link>
                  .
                </p>
              ) : (
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                  {categoryOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 text-sm text-zinc-700"
                      style={{ paddingLeft: `${option.depth * 16}px` }}
                    >
                      <input
                        type="checkbox"
                        name="categoryIds"
                        value={option.id}
                        defaultChecked={selectedCategories.has(option.id)}
                        className="h-4 w-4 rounded border-zinc-400"
                      />
                      {option.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          </div>

          <div>
            <fieldset>
              <legend className="text-sm font-medium text-zinc-800">Tags</legend>
              {tags.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">
                  No tags yet — create them under{" "}
                  <Link className="underline" href="/admin/products/tags">
                    Products → Tags
                  </Link>
                  .
                </p>
              ) : (
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        name="tagIds"
                        value={tag.id}
                        defaultChecked={selectedTags.has(tag.id)}
                        className="h-4 w-4 rounded border-zinc-400"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-zinc-800">Attributes</legend>
              {attributes.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">
                  No attributes yet — create them under{" "}
                  <Link className="underline" href="/admin/products/attributes">
                    Products → Attributes
                  </Link>
                  .
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  {attributes.map((attribute) => {
                    const current = selectedAttributes.get(attribute.id);
                    const currentTerm = current?.termId
                      ? `term:${current.termId}`
                      : current?.customValue
                        ? "custom"
                        : "";
                    return (
                      <div key={attribute.id}>
                        <label className="text-xs font-medium text-zinc-600">{attribute.name}</label>
                        {attribute.terms.length > 0 ? (
                          <select
                            name={`attrterm_${attribute.id}`}
                            defaultValue={currentTerm === "custom" ? "custom" : currentTerm}
                            className={inputCls}
                          >
                            <option value="">— None —</option>
                            {attribute.terms.map((term) => (
                              <option key={term.id} value={`term:${term.id}`}>
                                {term.name}
                              </option>
                            ))}
                            <option value="custom">Custom value…</option>
                          </select>
                        ) : null}
                        <input
                          type="text"
                          name={`attrcustom_${attribute.id}`}
                          defaultValue={current?.customValue ?? ""}
                          placeholder={
                            attribute.terms.length > 0
                              ? "Custom value (overrides selection)"
                              : "Value"
                          }
                          className={inputCls}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </fieldset>
          </div>
        </div>
      </section>

      {/* SEO */}
      <details className={`${cardCls} group`}>
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Search engine optimisation
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="seoTitle">
              SEO title
            </label>
            <input
              id="seoTitle"
              type="text"
              name="seoTitle"
              defaultValue={initial.seoTitle ?? ""}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="metaDesc">
              Meta description
            </label>
            <textarea
              id="metaDesc"
              name="metaDesc"
              defaultValue={initial.metaDesc ?? ""}
              rows={3}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="focusKeyphrase">
              Focus keyphrase
            </label>
            <input
              id="focusKeyphrase"
              type="text"
              name="focusKeyphrase"
              defaultValue={initial.focusKeyphrase ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="canonicalUrl">
              Canonical URL
            </label>
            <input
              id="canonicalUrl"
              type="url"
              name="canonicalUrl"
              defaultValue={initial.canonicalUrl ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="ogImage">
              Social (og) image URL
            </label>
            <input
              id="ogImage"
              type="url"
              name="ogImage"
              defaultValue={initial.ogImage ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
        </div>
      </details>

      <div className="mt-8">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-lg font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save Product"}
        </button>
      </div>
    </form>
  );
}
