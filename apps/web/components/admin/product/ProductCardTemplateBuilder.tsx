"use client";

import { useState } from "react";
import {
  DEFAULT_PRODUCT_CARD_TEMPLATE,
  type ProductCardTemplateSettings,
} from "@/lib/product-card-template";
import type { ProductGridPage } from "@/modules/ecommerce/queries";
import { saveProductCardTemplate } from "@/app/(admin)/admin/products/create-card-template/actions";

type PreviewProduct = ProductGridPage["items"][number];
type SettingKey = keyof ProductCardTemplateSettings;

const PRESETS: Array<{
  name: string;
  description: string;
  settings: Partial<ProductCardTemplateSettings>;
}> = [
  {
    name: "Modern",
    description: "Soft corners, subtle elevation, bold actions",
    settings: {
      cardStyle: "shadow",
      radius: 16,
      spacing: "comfortable",
      cardBackground: "#ffffff",
      accentColor: "#dc2626",
      buttonBackground: "#18181b",
    },
  },
  {
    name: "Editorial",
    description: "Quiet borders, warm tones, image-led",
    settings: {
      cardStyle: "bordered",
      radius: 8,
      spacing: "spacious",
      cardBackground: "#fffdf9",
      textColor: "#292524",
      mutedColor: "#78716c",
      accentColor: "#a16207",
      buttonBackground: "#292524",
    },
  },
  {
    name: "Minimal",
    description: "Clean surfaces and compact spacing",
    settings: {
      cardStyle: "minimal",
      radius: 4,
      spacing: "compact",
      cardBackground: "#ffffff",
      textColor: "#18181b",
      mutedColor: "#71717a",
      accentColor: "#18181b",
      buttonBackground: "#18181b",
    },
  },
];

const CONTENT_FIELDS: Array<{ key: SettingKey; label: string }> = [
  { key: "showImage", label: "Product image" },
  { key: "showCategory", label: "Product category" },
  { key: "showTitle", label: "Product title" },
  { key: "showExcerpt", label: "Short description" },
  { key: "showRating", label: "Rating and review count" },
  { key: "showPrice", label: "Price and sale price" },
  { key: "showBadges", label: "Sale, featured, and stock badges" },
  { key: "showWishlist", label: "Wishlist control" },
];

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2 text-sm text-zinc-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
      />
    </label>
  );
}

function ProductCardPreview({
  product,
  settings,
  compact,
}: {
  product: PreviewProduct | undefined;
  settings: ProductCardTemplateSettings;
  compact: boolean;
}) {
  const [quickAdded, setQuickAdded] = useState(false);
  const spacing = {
    compact: { body: 12, section: 6 },
    comfortable: { body: 17, section: 9 },
    spacious: { body: 22, section: 12 },
  }[settings.spacing];
  const title = product?.name ?? "Everyday Canvas Backpack";
  const category = product?.categories[0]?.name ?? "Accessories";
  const price = product?.price ?? 79;
  const regularPrice = product?.regularPrice ?? 99;
  const sale = product?.onSale ?? true;
  const outOfStock = product?.stockStatus === "OUT_OF_STOCK";
  const imageAspect = {
    square: "aspect-square",
    landscape: "aspect-[16/9]",
    portrait: "aspect-[4/5]",
  }[settings.imageAspect];
  const style = {
    backgroundColor: settings.cardBackground,
    borderRadius: settings.radius,
    color: settings.textColor,
    padding: settings.showImage ? 0 : spacing.body,
    border: settings.cardStyle === "bordered" ? "1px solid #e4e4e7" : undefined,
    boxShadow: settings.cardStyle === "shadow"
      ? "0 1px 3px rgba(0,0,0,.06), 0 12px 30px -18px rgba(0,0,0,.35)"
      : undefined,
  } satisfies React.CSSProperties;

  return (
    <article
      className={`overflow-hidden ${compact ? "w-[210px]" : "w-full max-w-[330px]"}`}
      style={style}
    >
      {settings.showImage && (
        <div className={`relative overflow-hidden bg-zinc-100 ${imageAspect}`}>
          {product?.imageAssetId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/assets/${product.imageAssetId}`}
              alt={title}
              className="h-full w-full"
              style={{ objectFit: settings.imageFit }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-zinc-200 text-5xl text-zinc-400">
              ◇
            </div>
          )}
          {settings.showBadges && (
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {sale && <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: settings.accentColor }}>Sale</span>}
              {!sale && <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold uppercase text-white">Featured</span>}
              {outOfStock && <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-600">Sold out</span>}
            </div>
          )}
          {settings.showWishlist && (
            <button type="button" aria-label="Add to wishlist" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-lg text-zinc-600 shadow-sm">♡</button>
          )}
          {settings.showQuickAdd && (
            <button
              type="button"
              onClick={() => setQuickAdded(true)}
              className="absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-xs font-semibold shadow-lg"
              style={{ backgroundColor: settings.buttonBackground, color: settings.buttonText }}
            >
              {quickAdded ? "Added ✓" : settings.quickAddLabel}
            </button>
          )}
        </div>
      )}
      <div style={{ padding: settings.showImage ? spacing.body : 0 }}>
        {settings.showCategory && (
          <p className="text-[11px] font-semibold uppercase tracking-[.12em]" style={{ color: settings.mutedColor }}>
            {category}
          </p>
        )}
        {settings.showTitle && (
          <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug" style={{ color: settings.textColor }}>
            {title}
          </h3>
        )}
        {settings.showRating && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="tracking-wider text-amber-500">★★★★★</span>
            <span style={{ color: settings.mutedColor }}>({product?.reviewCount || 24})</span>
          </div>
        )}
        {settings.showExcerpt && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: settings.mutedColor }}>
            {product?.excerpt ?? "Thoughtfully made for daily use, with durable materials and a comfortable design."}
          </p>
        )}
        {(settings.showPrice || settings.showAddToCart) && (
          <div className={`flex items-center ${settings.showAddToCart ? "justify-between gap-3" : ""}`} style={{ marginTop: spacing.section }}>
            {settings.showPrice && (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-base font-bold" style={{ color: sale ? settings.accentColor : settings.textColor }}>
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(price)}
                </span>
                {sale && regularPrice > price && (
                  <span className="text-xs text-zinc-400 line-through">
                    {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(regularPrice)}
                  </span>
                )}
              </div>
            )}
            {settings.showAddToCart && (
              <button
                type="button"
                disabled={outOfStock}
                className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                style={{ backgroundColor: settings.buttonBackground, color: settings.buttonText }}
              >
                {outOfStock ? "Sold out" : settings.addToCartLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default function ProductCardTemplateBuilder({
  initialSettings,
  previewProducts,
}: {
  initialSettings: ProductCardTemplateSettings;
  previewProducts: PreviewProduct[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [selectedPreviewId, setSelectedPreviewId] = useState(previewProducts[0]?.id ?? "");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"content" | "style" | "actions">("content");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const selectedProduct = previewProducts.find((item) => item.id === selectedPreviewId) ?? previewProducts[0];
  const secondaryProduct = previewProducts.find((item) => item.id !== selectedProduct?.id);

  const update = <K extends SettingKey>(key: K, value: ProductCardTemplateSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setError(null);
  };

  const save = async () => {
    setSaveState("saving");
    setError(null);
    try {
      const result = await saveProductCardTemplate(settings);
      if (!result.ok) {
        setSaveState("error");
        setError(result.error);
        return;
      }
      setSavedSettings(settings);
      setSaveState("saved");
    } catch (saveError) {
      setSaveState("error");
      setError(saveError instanceof Error ? saveError.message : "Could not save product card template.");
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="min-w-[220px] flex-1">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-500">Store design · Product cards</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Product card template</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Design a consistent product card for product grids throughout your storefront.
          </p>
        </div>
        <span className="text-xs text-zinc-500" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : isDirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          type="button"
          onClick={() => {
            setSettings({ ...DEFAULT_PRODUCT_CARD_TEMPLATE });
            setSaveState("idle");
            setError(null);
          }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!isDirty || saveState === "saving"}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save template
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-5 py-4">
            <div className="mr-auto">
              <h2 className="font-semibold text-zinc-900">Live preview</h2>
              <p className="text-xs text-zinc-500">Updates as you edit; used across storefront product grids after saving.</p>
            </div>
            <label className="text-xs text-zinc-600">
              Preview product
              <select
                value={selectedProduct?.id ?? ""}
                onChange={(event) => setSelectedPreviewId(event.target.value)}
                className="ml-2 max-w-48 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs"
              >
                {previewProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                {previewProducts.length === 0 && <option value="">Sample product</option>}
              </select>
            </label>
            <div className="flex rounded-lg border border-zinc-200 p-0.5">
              {(["desktop", "mobile"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={previewMode === mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${previewMode === mode ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-[510px] bg-[radial-gradient(#d4d4d8_0.7px,transparent_0.7px)] [background-size:16px_16px] p-6 sm:p-10">
            <div className={`mx-auto grid items-start justify-center gap-5 ${previewMode === "mobile" ? "max-w-[250px] grid-cols-1" : "max-w-[720px] grid-cols-1 md:grid-cols-2"}`}>
              <ProductCardPreview product={selectedProduct} settings={settings} compact={previewMode === "mobile"} />
              {previewMode === "desktop" && (
                <ProductCardPreview product={secondaryProduct} settings={settings} compact={false} />
              )}
            </div>
            {previewProducts.length === 0 && (
              <p className="mx-auto mt-4 max-w-md text-center text-xs text-zinc-500">
                No published products yet. This sample preview shows how your design will look.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-5 py-3">
            <span className="mr-2 text-xs font-medium text-zinc-500">Quick styles</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                title={preset.description}
                onClick={() => {
                  setSettings((current) => ({ ...current, ...preset.settings }));
                  setSaveState("idle");
                  setError(null);
                }}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid grid-cols-3 border-b border-zinc-200 p-1">
            {(["content", "style", "actions"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-2.5 text-xs font-semibold capitalize ${activeTab === tab ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "content" && (
            <div className="divide-y divide-zinc-100 px-5 py-2">
              <p className="py-3 text-xs leading-relaxed text-zinc-500">
                Control the shared card fields. A field still respects individual product-grid block settings.
              </p>
              {CONTENT_FIELDS.map((field) => (
                <Toggle
                  key={field.key}
                  label={field.label}
                  checked={settings[field.key] as boolean}
                  onChange={(checked) => update(field.key, checked as ProductCardTemplateSettings[typeof field.key])}
                />
              ))}
            </div>
          )}

          {activeTab === "style" && (
            <div className="space-y-4 p-5">
              <label className="block text-xs font-medium text-zinc-600">
                Card treatment
                <select value={settings.cardStyle} onChange={(event) => update("cardStyle", event.target.value as ProductCardTemplateSettings["cardStyle"])} className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
                  <option value="shadow">Soft shadow</option>
                  <option value="bordered">Fine border</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Image shape
                <select value={settings.imageAspect} onChange={(event) => update("imageAspect", event.target.value as ProductCardTemplateSettings["imageAspect"])} className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
                  <option value="square">Square</option>
                  <option value="landscape">Landscape (16:9)</option>
                  <option value="portrait">Portrait (4:5)</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Image fit
                <select value={settings.imageFit} onChange={(event) => update("imageFit", event.target.value as ProductCardTemplateSettings["imageFit"])} className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
                  <option value="cover">Fill image area</option>
                  <option value="contain">Show full image</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Card corner radius <span className="float-right font-normal text-zinc-500">{settings.radius}px</span>
                <input type="range" min={0} max={32} value={settings.radius} onChange={(event) => update("radius", Number(event.target.value))} className="mt-2 w-full accent-zinc-900" />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Content spacing
                <select value={settings.spacing} onChange={(event) => update("spacing", event.target.value as ProductCardTemplateSettings["spacing"])} className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["cardBackground", "Card surface"],
                  ["textColor", "Text"],
                  ["mutedColor", "Secondary text"],
                  ["accentColor", "Sale / accent"],
                  ["buttonBackground", "Button"],
                  ["buttonText", "Button text"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="text-xs font-medium text-zinc-600">
                    {label}
                    <input type="color" value={settings[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 h-9 w-full cursor-pointer rounded border border-zinc-300 bg-white p-1" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-4 p-5">
              <Toggle label="Show quick add over the image" checked={settings.showQuickAdd} onChange={(value) => update("showQuickAdd", value)} />
              <label className="block text-xs font-medium text-zinc-600">
                Quick-add button label
                <input maxLength={40} value={settings.quickAddLabel} onChange={(event) => update("quickAddLabel", event.target.value)} className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              </label>
              <div className="border-t border-zinc-100 pt-4">
                <Toggle label="Show add-to-cart button" checked={settings.showAddToCart} onChange={(value) => update("showAddToCart", value)} />
                <label className="block text-xs font-medium text-zinc-600">
                  Add-to-cart button label
                  <input maxLength={40} value={settings.addToCartLabel} onChange={(event) => update("addToCartLabel", event.target.value)} className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                </label>
              </div>
              <p className="rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-500">
                Grid blocks can turn either action off individually. Product availability still controls whether an item can be added.
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
