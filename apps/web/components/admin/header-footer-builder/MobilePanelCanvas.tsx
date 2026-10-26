"use client";

import { useMemo } from "react";
import type { Block } from "@/lib/page-builder/types";
import LayoutEditor from "./LayoutEditor";
import { blockIcon } from "@/components/admin/visual-editor/labels";

interface MobilePanelCanvasProps {
  blocks: Block[];
  /** Updater-style callback into the advanced menu block's mobileLayout. */
  onMobileLayoutChange: (blockId: string, updater: (blocks: Block[]) => Block[]) => void;
  /** Flat menu items (top-level), used for the "menu links" hint. */
  menuItems?: Array<{ id: string; label: string }>;
}

/**
 * Editable canvas section for the Advanced Menu's mobile panel.
 *
 * The mobile panel is hidden on the desktop canvas (it opens on small
 * viewports), so this renders an always-visible layout editor below the
 * header/footer preview where sections, rows, and blocks can be dragged in
 * and arranged exactly like the dropdown panel editors.
 */
export default function MobilePanelCanvas({
  blocks,
  onMobileLayoutChange,
}: MobilePanelCanvasProps) {
  const menus = useMemo(() => blocks.filter((b) => b.type === "advancedMenu"), [blocks]);
  if (menus.length === 0) return null;

  return (
    <div className="mt-6 space-y-6">
      {menus.map((menu) => {
        const p = menu.props as Record<string, unknown>;
        // Support legacy mobileBlocks key.
        const layout = ((p.mobileLayout as Block[]) ??
          (p.mobileBlocks as Block[]) ??
          []) as Block[];
        const showItems = p.showMobileMenuItems !== false;

        return (
          <div
            key={menu.id}
            className="rounded-lg border-2 border-dashed border-sky-400 bg-sky-50/30"
            data-pb-kind="advanced-menu-mobile"
            data-pb-parent={menu.id}
          >
            <div className="px-4 py-3 bg-sky-50 border-b border-sky-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs">{blockIcon("advancedMenu")}</span>
                <span className="text-sm font-semibold text-sky-800">Mobile Panel Layout</span>
                <span className="text-[10px] font-mono text-sky-600 bg-white px-1.5 rounded">
                  {menu.id.slice(0, 8)}
                </span>
              </div>
              <span className="text-[10px] text-sky-600">
                {showItems
                  ? "Menu links render above this content in the mobile panel"
                  : "Custom content only (menu links hidden)"}
              </span>
            </div>

            <div className="p-4">
              <LayoutEditor
                blocks={layout}
                onChange={(next) => onMobileLayoutChange(menu.id, () => next)}
                droppablePrefix={`advmobilec:${menu.id}`}
                allowTopLevelLayout
                label="Mobile Panel Content"
                description="Drag sections, rows, and blocks here to design the contents of the mobile menu panel"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
