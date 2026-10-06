"use client";

import { useDraggable } from "@dnd-kit/core";
import { GEO_TEMPLATE_ROW_LAYOUTS } from "@/lib/geo-category-template/types";
import { BLOCK_DEFINITIONS } from "@/lib/page-builder/types";

const PALETTE_PREFIX = "palette:";
const LAYOUT_PREFIX = "layout:";

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

const GEO_BLOCKS: Array<{ type: string; icon: string; label: string }> = [
  { type: "geoHero", icon: "🏞", label: "Category Hero" },
  { type: "geoContent", icon: "📝", label: "Category Content" },
  { type: "geoRegionNav", icon: "🗺", label: "State Links" },
  { type: "geoListings", icon: "🏛", label: "Listings" },
  { type: "geoFaq", icon: "❓", label: "Category FAQ" },
  { type: "geoSidebar", icon: "📋", label: "Sidebar" },
];

export default function GeoCategoryTemplatePalette({
  onAdd,
  onAddLayout,
}: {
  onAdd: (type: string) => void;
  onAddLayout: (layoutId: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      {/* ── GEO CATEGORY ──────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Geo Category
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {GEO_BLOCKS.map((item) => (
            <DraggableItem
              key={item.type}
              id={`${PALETTE_PREFIX}${item.type}`}
              icon={item.icon}
              label={item.label}
              onClick={() => onAdd(item.type)}
            />
          ))}
        </div>
      </div>

      {/* ── LAYOUT ──────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Layout
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <DraggableItem
            id={`${LAYOUT_PREFIX}container`}
            icon="▣"
            label="Container"
            onClick={() => onAddLayout("container")}
          />
          <DraggableItem
            id={`${LAYOUT_PREFIX}row`}
            icon="▦"
            label="Row"
            onClick={() => onAddLayout("row")}
          />
          {GEO_TEMPLATE_ROW_LAYOUTS.map((layout) => (
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

      {/* ── CONTENT ────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Content
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {BLOCK_DEFINITIONS.filter((d) =>
            ["hero", "text", "image", "button", "heading", "list", "iconList", "spacer", "divider"].includes(d.type),
          ).map((def) => (
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

      {/* ── MEDIA ──────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Media
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {BLOCK_DEFINITIONS.filter((d) =>
            ["video", "embed", "slider", "googleMap"].includes(d.type),
          ).map((def) => (
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

      {/* ── MARKETING ──────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Marketing
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {BLOCK_DEFINITIONS.filter((d) =>
            ["cta", "features", "faq", "testimonial", "contentGrid", "productGrid"].includes(d.type),
          ).map((def) => (
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
