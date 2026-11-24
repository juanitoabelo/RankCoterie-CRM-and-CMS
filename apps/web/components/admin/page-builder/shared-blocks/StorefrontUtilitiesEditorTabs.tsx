"use client";

import { useState } from "react";
import type { StyleBreakpoints } from "@/lib/page-builder/types";
import BlockAdvancedTab from "../BlockAdvancedTab";
import SchemaStyleTab from "../SchemaStyleTab";
import { StyleGuideEditor } from "../settings";
import { StorefrontUtilitiesEditor, type SharedEditorProps } from "./editors";

export default function StorefrontUtilitiesEditorTabs({
  block,
  onChange,
  onAddToColumn,
}: SharedEditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const set = (patch: Record<string, unknown>) =>
    onChange({ ...block.props, ...patch } as typeof block.props);

  return (
    <div className="space-y-3">
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "content" && (
        <StorefrontUtilitiesEditor
          block={block}
          onChange={onChange}
          onAddToColumn={onAddToColumn}
        />
      )}

      {activeTab === "style" && (
        <div className="space-y-3">
          <SchemaStyleTab
            blockType={block.type}
            p={block.props as Record<string, unknown>}
            set={set}
          />
          <StyleGuideEditor
            style={(block.props as { style?: StyleBreakpoints }).style}
            onChange={(style) => set({ style })}
          />
        </div>
      )}

      {activeTab === "advanced" && (
        <BlockAdvancedTab
          props={block.props as Record<string, unknown>}
          set={set}
        />
      )}
    </div>
  );
}
