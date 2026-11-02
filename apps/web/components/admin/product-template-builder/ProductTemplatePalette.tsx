"use client";

import { useDraggable } from "@dnd-kit/core";
import { BLOCK_DEFINITIONS, ROW_LAYOUTS } from "@/lib/page-builder/types";

const PRODUCT_BLOCKS = [
  { type: "productTitle", label: "Product Title" },
  { type: "productPrice", label: "Product Price" },
  { type: "productGallery", label: "Product Image Gallery" },
  { type: "productShortDescription", label: "Short Description" },
  { type: "productDescription", label: "Full Description" },
  { type: "productSku", label: "SKU" },
  { type: "productStock", label: "Stock Status" },
  { type: "productSpecifications", label: "Specifications & Attributes" },
  { type: "productPurchase", label: "Add to Cart / Purchase" },
  { type: "productTabs", label: "Product Information Tabs" },
  { type: "productGrid", label: "Related Products Grid" },
  { type: "productSlider", label: "Product Slider" },
  { type: "productCategories", label: "Product Categories" },
  { type: "productSpotlight", label: "Product Spotlight" },
  { type: "reviews", label: "Product Reviews" },
  { type: "comparisonTable", label: "Product Comparison Table" },
] as const;

const STANDARD_BLOCKS = [
  "hero", "text", "heading", "image", "cta", "features", "button", "faq",
  "spacer", "divider",
].map((type) => ({
  type,
  label: BLOCK_DEFINITIONS.find((item) => item.type === type)?.label ?? type,
}));

function PaletteItem({
  id,
  label,
  onClick,
}: {
  id: string;
  label: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      {...attributes}
      {...listeners}
      className={`w-full touch-none rounded border border-zinc-200 bg-white px-2 py-2 text-left text-xs text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span className="mr-1 text-zinc-400">⠿</span>
      {label}
    </button>
  );
}

export default function ProductTemplatePalette({
  onAdd,
  onAddLayout,
}: {
  onAdd: (type: string) => void;
  onAddLayout?: (layoutId: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-3">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Product blocks
        </h2>
        <div className="space-y-1">
          {PRODUCT_BLOCKS.map((item) => (
            <PaletteItem
              key={item.type}
              id={`palette:${item.type}`}
              label={item.label}
              onClick={() => onAdd(item.type)}
            />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Content blocks
        </h2>
        <div className="space-y-1">
          {STANDARD_BLOCKS.map((item) => (
            <PaletteItem
              key={item.type}
              id={`palette:${item.type}`}
              label={item.label}
              onClick={() => onAdd(item.type)}
            />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Layouts
        </h2>
        <div className="space-y-1">
          {onAddLayout ? (
            <>
              <PaletteItem
                id="layout:container"
                label="Container"
                onClick={() => onAddLayout("container")}
              />
              <PaletteItem
                id="layout:row"
                label="Single-column row"
                onClick={() => onAddLayout("row")}
              />
              {ROW_LAYOUTS.map((layout) => (
                <PaletteItem
                  key={layout.id}
                  id={`layout:${layout.id}`}
                  label={layout.label}
                  onClick={() => onAddLayout(layout.id)}
                />
              ))}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
