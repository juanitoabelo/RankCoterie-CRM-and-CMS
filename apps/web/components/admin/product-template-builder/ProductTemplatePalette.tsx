"use client";

import { BLOCK_DEFINITIONS, SHARED_BLOCK_TYPES } from "@/lib/page-builder/types";

const PALETTE_ITEMS = [
  { type: "hero", label: "Hero" },
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
  { type: "cta", label: "Call to Action" },
  { type: "features", label: "Features" },
  { type: "button", label: "Button / Link" },
  { type: "blogArticleSlider", label: "Blog/Article Slider" },
  { type: "productSlider", label: "Product Slider" },
  { type: "listingSlider", label: "Directory Listing Slider" },
  { type: "companySlider", label: "Company Listing Slider" },
  { type: "geoCategorySlider", label: "Geo Category Slider" },
  { type: "sectionSlider", label: "Section Slider" },
  { type: "topicSubTopicSlider", label: "Topic and Sub Topic Slider" },
  { type: "imageSlider", label: "Image Slider" },
  { type: "videoSlider", label: "Video Slider" },
  ...SHARED_BLOCK_TYPES.map((type) => ({
    type,
    label: BLOCK_DEFINITIONS.find((d) => d.type === type)?.label ?? type,
  })),
];

export default function ProductTemplatePalette({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <div className="space-y-3">
      {PALETTE_ITEMS.map((item) => (
        <button
          key={item.type}
          type="button"
          onClick={() => onAdd(item.type)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}