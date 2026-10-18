"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  LISTING_BLOCK_META,
  LISTING_ROW_LAYOUTS,
} from "@/lib/listing-templates/tree-types";
import { BLOCK_DEFINITIONS, SHARED_BLOCK_TYPES } from "@/lib/page-builder/types";

const PALETTE_PREFIX = "palette:";
const LAYOUT_PREFIX = "layout:";

/** Sidebar-widget block types (render in narrow columns). */
const SIDEBAR_WIDGET_TYPES = new Set([
  "listingContactForm",
  "listingQuickFacts",
  "listingHours",
  "listingAreas",
  "listingCategories",
  "listingSocial",
  "listingClaim",
]);

/** Basic generic blocks offered from BLOCK_DEFINITIONS. */
const BASIC_TYPES = [
  "text",
  "heading",
  "image",
  "button",
  "divider",
  "spacer",
  "blogArticleSlider",
  "productSlider",
  "listingSlider",
  "companySlider",
  "geoCategorySlider",
  "sectionSlider",
  "topicSubTopicSlider",
  "imageSlider",
  "videoSlider",
];

SHARED_BLOCK_TYPES.forEach((t) => {
  if (!BASIC_TYPES.includes(t)) BASIC_TYPES.push(t);
});

function DraggableItem({
  id,
  icon,
  label,
  onClick,
}: {
  id: string;
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 text-center hover:border-zinc-400 hover:bg-zinc-50 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] font-medium text-zinc-600">{label}</span>
    </button>
  );
}

export default function ListingTemplatePalette({
  onAdd,
  onAddLayout,
}: {
  onAdd: (type: string) => void;
  onAddLayout: (layoutId: string) => void;
}) {
  const listingBlocks = LISTING_BLOCK_META.filter((m) => !SIDEBAR_WIDGET_TYPES.has(m.type));
  const sidebarBlocks = LISTING_BLOCK_META.filter((m) => SIDEBAR_WIDGET_TYPES.has(m.type));

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      {/* ── LISTING ─────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Listing
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {listingBlocks.map((meta) => (
            <DraggableItem
              key={meta.type}
              id={`${PALETTE_PREFIX}${meta.type}`}
              icon={meta.icon}
              label={meta.label}
              onClick={() => onAdd(meta.type)}
            />
          ))}
        </div>
      </div>

      {/* ── SIDEBAR WIDGETS ─────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Sidebar Widgets
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {sidebarBlocks.map((meta) => (
            <DraggableItem
              key={meta.type}
              id={`${PALETTE_PREFIX}${meta.type}`}
              icon={meta.icon}
              label={meta.label}
              onClick={() => onAdd(meta.type)}
            />
          ))}
        </div>
      </div>

      {/* ── LAYOUTS ─────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Layouts
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {LISTING_ROW_LAYOUTS.map((layout) => (
            <DraggableItem
              key={layout.id}
              id={`${LAYOUT_PREFIX}${layout.id}`}
              icon={layout.icon}
              label={layout.label}
              onClick={() => onAddLayout(layout.id)}
            />
          ))}
        </div>
      </div>

      {/* ── BASIC ───────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Basic
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {BLOCK_DEFINITIONS.filter((d) => BASIC_TYPES.includes(d.type)).map((def) => (
            <DraggableItem
              key={def.type}
              id={`${PALETTE_PREFIX}${def.type}`}
              icon={def.icon}
              label={def.label}
              onClick={() => onAdd(def.type)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
