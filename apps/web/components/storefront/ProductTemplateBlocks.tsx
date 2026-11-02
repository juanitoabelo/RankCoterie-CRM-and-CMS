"use client";

import { useState } from "react";
import type { ComponentType, ElementType, ReactNode } from "react";
import type { Block } from "@/lib/page-builder/types";
import { sanitizeHtml } from "@/lib/style-guide";
import type { RegionContext } from "@/lib/localization/render";
import { BlockAdvancedFrame } from "@/components/admin/page-builder/advanced-ui";
import ProductGallery from "./ProductGallery";
import ProductPurchase from "./ProductPurchase";
import { useProductTemplateContext } from "./ProductTemplateContext";

function ProductBlockSection({ block, children }: { block: Block; children: ReactNode }) {
  const props = block.props as { bgColor?: string; textColor?: string; padding?: number };
  return (
    <BlockAdvancedFrame block={block}>
      <section
        className="px-4 py-4 sm:px-6"
        style={{
          backgroundColor: props.bgColor || undefined,
          color: props.textColor || undefined,
          padding: props.padding === undefined ? undefined : `${props.padding}px`,
        }}
      >
        {children}
      </section>
    </BlockAdvancedFrame>
  );
}

function ProductTitleBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context) return null;
  const level = Number((block.props as Record<string, unknown>).level) || 1;
  const Tag = (`h${Math.min(6, Math.max(1, level))}`) as ElementType;
  return (
    <ProductBlockSection block={block}>
      <Tag className="text-3xl font-bold tracking-tight text-zinc-900">
        {context.product.name}
      </Tag>
    </ProductBlockSection>
  );
}

function ProductPriceBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context) return null;
  const { product } = context;
  const saleActive = product.salePrice !== null;
  const amount = product.salePrice ?? product.regularPrice;
  return (
    <ProductBlockSection block={block}>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-zinc-900">
          ${amount.toFixed(2)}
        </span>
        {saleActive && (
          <span className="text-lg text-zinc-400 line-through">
            ${product.regularPrice.toFixed(2)}
          </span>
        )}
      </div>
    </ProductBlockSection>
  );
}

function ProductGalleryBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context) return null;
  return (
    <ProductBlockSection block={block}>
      <ProductGallery images={context.product.images} productName={context.product.name} />
    </ProductBlockSection>
  );
}

function ProductShortDescriptionBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context?.product.shortDescription) return null;
  return (
    <ProductBlockSection block={block}>
      <p className="text-zinc-600">{context.product.shortDescription}</p>
    </ProductBlockSection>
  );
}

function ProductDescriptionBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context?.product.description) return null;
  return (
    <ProductBlockSection block={block}>
      <div
        className="prose prose-zinc max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(context.product.description) }}
      />
    </ProductBlockSection>
  );
}

function ProductSkuBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context) return null;
  return (
    <ProductBlockSection block={block}>
      <p className="text-sm text-zinc-500">SKU: {context.product.sku || "—"}</p>
    </ProductBlockSection>
  );
}

function ProductStockBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context) return null;
  const labels: Record<string, string> = {
    IN_STOCK: "In stock",
    LOW_STOCK: "Low stock",
    OUT_OF_STOCK: "Out of stock",
    ON_BACKORDER: "On backorder",
  };
  return (
    <ProductBlockSection block={block}>
      <p className="text-sm text-zinc-600">
        {labels[context.product.stockStatus] ?? context.product.stockStatus}
      </p>
    </ProductBlockSection>
  );
}

function ProductSpecificationsBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context) return null;
  const { product } = context;
  const fields = [
    ...(product.sku ? [{ label: "SKU", value: product.sku }] : []),
    ...(product.weight !== null ? [{ label: "Weight", value: `${product.weight} kg` }] : []),
    ...(product.length !== null || product.width !== null || product.height !== null
      ? [{
          label: "Dimensions",
          value: [
            product.length !== null ? `${product.length} cm` : null,
            product.width !== null ? `${product.width} cm` : null,
            product.height !== null ? `${product.height} cm` : null,
          ].filter(Boolean).join(" × "),
        }]
      : []),
    ...product.attributes.map((attribute) => ({ label: attribute.name, value: attribute.value })),
    ...product.customFields.map((field) => ({
      label: field.group ? `${field.group}: ${field.label}` : field.label,
      value: field.value,
    })),
  ];
  if (fields.length === 0) return null;
  return (
    <ProductBlockSection block={block}>
      <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        {fields.map((field) => (
          <div key={field.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:gap-6">
            <dt className="text-sm font-medium text-zinc-700">{field.label}</dt>
            <dd className="whitespace-pre-wrap text-sm text-zinc-600">{field.value}</dd>
          </div>
        ))}
      </dl>
    </ProductBlockSection>
  );
}

function ProductPurchaseBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  if (!context) return null;
  if (!context.interactive) {
    return (
      <ProductBlockSection block={block}>
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Purchase options preview</p>
          {context.gateways.map((gateway) => (
            <p key={gateway.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
              {gateway.name}
            </p>
          ))}
          {context.gateways.length === 0 && (
            <p className="text-sm text-amber-700">No payment gateways are enabled.</p>
          )}
          <button type="button" disabled className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white opacity-70">
            Buy now
          </button>
        </div>
      </ProductBlockSection>
    );
  }
  return (
    <ProductBlockSection block={block}>
      <ProductPurchase productId={context.product.id} gateways={context.gateways} />
    </ProductBlockSection>
  );
}

function ProductTabsBlock({ block }: { block: Block }) {
  const context = useProductTemplateContext();
  const [activeTab, setActiveTab] = useState(0);
  if (!context) return null;
  const props = block.props as { tabs?: Array<{ id: string; label: string; binding?: string; content?: string }> };
  const tabs = props.tabs ?? [];
  if (tabs.length === 0) return null;
  const activeIndex = Math.min(activeTab, tabs.length - 1);
  const active = tabs[activeIndex];
  const value = active.binding
    ? context.resolveBinding(context.product, active.binding)
    : active.content || "";
  const isDescription = active.binding === "description";

  return (
    <BlockAdvancedFrame block={block}>
    <section
      className="mt-8 border-t border-zinc-200 px-4 pt-6 sm:px-6"
      style={{
        backgroundColor: (block.props as Record<string, unknown>).bgColor as string | undefined,
        color: (block.props as Record<string, unknown>).textColor as string | undefined,
        padding: typeof (block.props as Record<string, unknown>).padding === "number"
          ? `${(block.props as Record<string, unknown>).padding}px`
          : undefined,
      }}
    >
      <div className="border-b border-zinc-200">
        <div className="-mb-px flex gap-6 overflow-x-auto" role="tablist" aria-label="Product information">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`product-tab-${block.id}-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-controls={`product-panel-${block.id}`}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => setActiveTab(index)}
              onKeyDown={(event) => {
                const nextIndex =
                  event.key === "ArrowRight"
                    ? (activeIndex + 1) % tabs.length
                    : event.key === "ArrowLeft"
                      ? (activeIndex - 1 + tabs.length) % tabs.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : activeIndex;
                if (nextIndex !== activeIndex) {
                  event.preventDefault();
                  setActiveTab(nextIndex);
                  document.getElementById(`product-tab-${block.id}-${tabs[nextIndex].id}`)?.focus();
                }
              }}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium ${
                activeIndex === index
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div
        id={`product-panel-${block.id}`}
        role="tabpanel"
        aria-labelledby={`product-tab-${block.id}-${active.id}`}
        className="prose prose-zinc max-w-none py-6"
      >
        {isDescription && value ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
        ) : (
          <p className="whitespace-pre-wrap">{value || "No information is available."}</p>
        )}
      </div>
    </section>
    </BlockAdvancedFrame>
  );
}

export const PRODUCT_TEMPLATE_BLOCK_RENDERERS: Record<
  string,
  ComponentType<{ block: Block; ctx: RegionContext }>
> = {
  productTitle: ProductTitleBlock,
  productPrice: ProductPriceBlock,
  productGallery: ProductGalleryBlock,
  productShortDescription: ProductShortDescriptionBlock,
  productDescription: ProductDescriptionBlock,
  productSku: ProductSkuBlock,
  productStock: ProductStockBlock,
  productSpecifications: ProductSpecificationsBlock,
  productPurchase: ProductPurchaseBlock,
  productTabs: ProductTabsBlock,
};
