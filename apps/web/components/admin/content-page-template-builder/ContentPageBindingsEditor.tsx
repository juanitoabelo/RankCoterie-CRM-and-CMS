"use client";

import type { ContentPageKind } from "@/lib/content-page-template/types";
import type { ContentPageBlockBindings } from "@/lib/content-page-template/bindings";
import { cpBindingFieldsForTarget, cpBindingTargets } from "@/lib/content-page-template/bindings";

const selectClass = "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800";

type Props = {
  kind: ContentPageKind;
  blockType: string;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
};

export default function ContentPageBindingsEditor({ kind, blockType, props, onChange }: Props) {
  const targets = cpBindingTargets(blockType, props);
  if (targets.length === 0) return null;

  const bindings = (props.bindings ?? {}) as ContentPageBlockBindings;
  const setBinding = (target: string, field: string) => {
    const nextBindings = { ...bindings };
    if (field) nextBindings[target] = field;
    else delete nextBindings[target];
    const nextProps = { ...props };
    if (Object.keys(nextBindings).length > 0) nextProps.bindings = nextBindings;
    else delete nextProps.bindings;
    onChange(nextProps);
  };

  const noun = kind === "topic" ? "Topic" : "SubTopic";

  return (
    <details className="rounded-lg border border-amber-200 bg-amber-50/50 p-3" open>
      <summary className="cursor-pointer text-xs font-semibold text-amber-900">
        {noun} Data Bindings
        {Object.keys(bindings).length > 0 && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            {Object.keys(bindings).length} connected
          </span>
        )}
      </summary>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
        Connect a block property to the rendered {noun} page data (title,
        description, images, sections, related content). The saved value remains
        as a fallback when the bound field is empty.
      </p>
      <div className="mt-3 space-y-3">
        {targets.map((target) => {
          const fields = cpBindingFieldsForTarget(kind, target.valueType);
          return (
            <label key={target.key} className="block text-[11px] font-medium text-zinc-700">
              {target.label}
              <select
                aria-label={`${noun} data for ${target.label}`}
                className={selectClass}
                value={bindings[target.key] ?? ""}
                onChange={(event) => setBinding(target.key, event.target.value)}
              >
                <option value="">Use saved value</option>
                {fields.map((field) => (
                  <option key={field.key} value={field.key}>{field.label}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-zinc-500">
        Bindings resolve on every /topic/* and /subtopic/* page render with the live page content.
      </p>
    </details>
  );
}
