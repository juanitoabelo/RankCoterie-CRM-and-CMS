"use client";

import { type ColumnData } from "@/lib/page-builder/types";
import { BackgroundFields, labelCls, ResponsiveSpanFields } from "./settings";

export default function ColumnEditor({
  column,
  onChange,
  onRemove,
  canRemove,
}: {
  column: ColumnData;
  onChange: (patch: Partial<ColumnData>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Column width</label>
        <div className="mt-1">
          <ResponsiveSpanFields
            desktop={column.span}
            tablet={column.spanMd}
            mobile={column.spanSm}
            onDesktop={(span) => onChange({ span })}
            onTablet={(span) => onChange({ spanMd: span })}
            onMobile={(span) => onChange({ spanSm: span })}
          />
        </div>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Widths are in a 12-column grid. Tablet/Mobile at “Auto” inherit the
          desktop width (and the row’s mobile stack rule).
        </p>
      </div>

      <BackgroundFields
        label="Column background"
        color={column.bgColor}
        image={column.bgImage}
        onColor={(value) => onChange({ bgColor: value || undefined })}
        onImage={(value) => onChange({ bgImage: value })}
      />

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Remove column
        </button>
      )}
    </div>
  );
}