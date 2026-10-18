"use client";

import BlockStyleTab from "./BlockStyleTab";
import ElementStyleTab from "./ElementStyleTab";
import type { ElementStyles } from "@/lib/page-builder/element-style";
import { getBlockStyleSchema } from "@/lib/page-builder/style-schema";

/**
 * Schema-driven Style tab shared by every builder's standard-block editor.
 *
 * Resolves the block type through the central schema registry
 * (`getBlockStyleSchema`: listing → geo → blog → standard) and renders the
 * element-style UI when that block has one. Falls back to the legacy
 * `BlockStyleTab` for block types with no schema (row, section,
 * listingApplyForm, …), so nothing regresses.
 */
export default function SchemaStyleTab({
  blockType,
  p,
  set,
}: {
  blockType: string;
  p: Record<string, unknown>;
  set: (patch: Record<string, unknown>) => void;
}) {
  const schema = getBlockStyleSchema(blockType);
  if (!schema) return <BlockStyleTab props={p} set={set} />;
  return (
    <ElementStyleTab
      schema={schema}
      value={p.elementStyles as ElementStyles | undefined}
      onChange={(next) => set({ elementStyles: next })}
    />
  );
}
