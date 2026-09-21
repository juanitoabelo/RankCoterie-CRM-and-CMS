"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  BLOG_TEMPLATE_ROW_LAYOUTS,
} from "@/lib/blog-template/types";
import {
  BLOCK_DEFINITIONS,
} from "@/lib/page-builder/types";

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

export default function BlogTemplatePalette({
  templateType,
  onAdd,
  onAddLayout,
}: {
  templateType: "listing" | "single";
  onAdd: (type: string) => void;
  onAddLayout: (layoutId: string) => void;
}) {
  const isSingle = templateType === "single";

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      {/* ── BLOG ──────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Blog
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <DraggableItem
            id={`${PALETTE_PREFIX}blogPostGrid`}
            icon="📰"
            label="Post Grid"
            onClick={() => onAdd("blogPostGrid")}
          />
          <DraggableItem
            id={`${PALETTE_PREFIX}blogSidebar`}
            icon="📋"
            label="Sidebar"
            onClick={() => onAdd("blogSidebar")}
          />
          {isSingle && (
            <>
              <DraggableItem
                id={`${PALETTE_PREFIX}articleContent`}
                icon="📄"
                label="Article Content"
                onClick={() => onAdd("articleContent")}
              />
              <DraggableItem
                id={`${PALETTE_PREFIX}articleHero`}
                icon="🎬"
                label="Article Hero"
                onClick={() => onAdd("articleHero")}
              />
            </>
          )}
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
          {BLOG_TEMPLATE_ROW_LAYOUTS.map((layout) => (
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
            ["hero", "text", "image", "button", "heading", "list", "spacer", "divider"].includes(d.type),
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
            ["video", "embed", "slider"].includes(d.type),
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
            ["cta", "features", "faq", "testimonial", "contentGrid"].includes(d.type),
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
