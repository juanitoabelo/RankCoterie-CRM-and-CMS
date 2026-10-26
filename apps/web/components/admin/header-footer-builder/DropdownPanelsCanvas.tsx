"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Block } from "@/lib/page-builder/types";
import type { AdvancedMenuPanel } from "@/lib/header-footer/types";
import LayoutEditor from "./LayoutEditor";
import { blockIcon } from "@/components/admin/visual-editor/labels";

/** A droppable container — routes drops anywhere on it into a layout tree. */
function DropBox({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "ring-2 ring-blue-400 ring-inset" : ""}`}
    >
      {children}
    </div>
  );
}

interface DropdownPanelsCanvasProps {
  blocks: Block[];
  /** Called with an updater for a dropdown panel's layout tree. */
  onPanelLayoutChange: (blockId: string, panelId: string, updater: (blocks: Block[]) => Block[]) => void;
  /** Called when a dropdown panel's settings change. */
  onPanelSettingsChange: (blockId: string, panelId: string, settings: Partial<AdvancedMenuPanel>) => void;
  /** Flat menu items, used to show which parent link a panel belongs to. */
  menuItems?: Array<{ id: string; label: string }>;
}

function normalizePanels(raw: unknown): AdvancedMenuPanel[] {
  if (Array.isArray(raw)) return raw as AdvancedMenuPanel[];
  return Object.entries((raw ?? {}) as Record<string, AdvancedMenuPanel>).map(([key, p]) => ({
    ...p,
    id: p.id ?? key,
    assignedItemId: p.assignedItemId ?? key,
  }));
}

/**
 * Renders dropdown panels as editable sections in the main canvas.
 * Each panel gets a full LayoutEditor for drag-and-drop block editing.
 */
export default function DropdownPanelsCanvas({
  blocks,
  onPanelLayoutChange,
  onPanelSettingsChange,
  menuItems = [],
}: DropdownPanelsCanvasProps) {
  const panelData = useMemo(() => {
    const result: Array<{
      menuBlockId: string;
      panels: Array<{ panel: AdvancedMenuPanel; index: number }>;
    }> = [];

    for (const block of blocks) {
      if (block.type !== "advancedMenu") continue;
      const p = block.props as Record<string, unknown>;
      const panels = normalizePanels(p.dropdownPanels);
      if (panels.length === 0) continue;

      result.push({
        menuBlockId: block.id,
        panels: panels.map((panel, index) => ({ panel, index })),
      });
    }
    return result;
  }, [blocks]);

  if (panelData.length === 0) return null;

  return (
    <div className="mt-6 space-y-6">
      {panelData.map(({ menuBlockId, panels }) => (
        <DropBox
          key={menuBlockId}
          id={`advpanelc:${menuBlockId}:first`}
          className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/30"
        >
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs">{blockIcon("advancedMenu")}</span>
              <span className="text-sm font-semibold text-amber-800">Dropdown Panels</span>
              <span className="text-[10px] font-mono text-amber-600 bg-white px-1.5 rounded">{menuBlockId.slice(0, 8)}</span>
            </div>
            <span className="text-[10px] text-amber-600">
              {panels.length} panel{panels.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="p-4 space-y-4">
            {panels.map(({ panel, index }) => {
              const panelId = panel.id ?? `panel-${index}`;
              const parentLabel = panel.assignedItemId
                ? menuItems.find((m) => m.id === panel.assignedItemId)?.label ?? panel.assignedItemId
                : null;
              return (
                <DropBox
                  key={panelId}
                  id={`advpanelc:${menuBlockId}:${panelId}:card`}
                  className="rounded-lg border border-amber-200 bg-white"
                >
                  {/* Panel Header */}
                  <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-amber-700">Panel #{index + 1}</span>
                      {parentLabel && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-700">
                          For: {parentLabel}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-amber-200 text-zinc-500">
                        {panel.containerWidth === "full" ? "Full Width" : `Boxed (${panel.maxWidth ?? 1200}px)`}
                      </span>
                      {panel.layout === "links" && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-500">
                          Default Links
                        </span>
                      )}
                    </div>

                    {/* Quick settings */}
                    <div className="flex items-center gap-1">
                      <label className="flex items-center gap-1 text-[10px] text-zinc-600">
                        <input
                          type="checkbox"
                          checked={panel.layout === "blocks"}
                          onChange={(e) => onPanelSettingsChange?.(menuBlockId, panelId, { layout: e.target.checked ? "blocks" : "links" })}
                          className="rounded border-zinc-300 text-blue-600"
                        />
                        Custom Layout
                      </label>
                      <select
                        value={panel.containerWidth ?? "boxed"}
                        onChange={(e) => onPanelSettingsChange?.(menuBlockId, panelId, { containerWidth: e.target.value as "full" | "boxed" })}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px]"
                      >
                        <option value="boxed">Boxed</option>
                        <option value="full">Full Width</option>
                      </select>
                      {panel.containerWidth === "boxed" && (
                        <input
                          type="number"
                          value={panel.maxWidth ?? 1200}
                          min={320}
                          max={1920}
                          onChange={(e) => onPanelSettingsChange?.(menuBlockId, panelId, { maxWidth: Number(e.target.value) || 1200 })}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] w-20"
                          placeholder="Max width"
                        />
                      )}
                    </div>
                  </div>

                  {/* Panel Layout Editor — always rendered so drops always land here. */}
                  <div className="p-4">
                    <LayoutEditor
                      blocks={panel.blocks ?? []}
                      onChange={(next) => onPanelLayoutChange?.(menuBlockId, panelId, () => next)}
                      droppablePrefix={`advpanelc:${menuBlockId}:${panelId}`}
                      allowTopLevelLayout
                      label="Dropdown Panel Layout"
                      description={
                        panel.layout === "blocks"
                          ? "Drag sections, rows, and blocks here to build the mega-dropdown content"
                          : "This panel currently uses default child links — editing the layout below switches it to a custom layout."
                      }
                    />
                  </div>
                </DropBox>
              );
            })}
          </div>
        </DropBox>
      ))}
    </div>
  );
}
