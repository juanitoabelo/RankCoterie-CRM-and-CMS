"use client";

import type { ListingBlockBindings } from "@/lib/listing-templates/bindings";
import { listingBindingFieldsForTarget, listingBindingTargets } from "@/lib/listing-templates/bindings";

const selectClass = "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800";

type Props = {
  blockType: string;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
};

/** Connect a block property to the current listing's data (listing counterpart of ArticleBindingsEditor). */
export default function ListingBindingsEditor({ blockType, props, onChange }: Props) {
  const targets = listingBindingTargets(blockType);
  if (targets.length === 0) return null;

  const bindings = (props.bindings ?? {}) as ListingBlockBindings;
  const setBinding = (target: string, field: string) => {
    const nextBindings = { ...bindings };
    if (field) nextBindings[target] = field;
    else delete nextBindings[target];
    const nextProps = { ...props };
    if (Object.keys(nextBindings).length > 0) nextProps.bindings = nextBindings;
    else delete nextProps.bindings;
    onChange(nextProps);
  };

  return (
    <details className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-indigo-900">
        Listing Data Bindings
        {Object.keys(bindings).length > 0 && (
          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
            {Object.keys(bindings).length} connected
          </span>
        )}
      </summary>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
        Connect a block property to the current listing. The saved value remains as a fallback when the listing field is empty.
      </p>
      <div className="mt-3 space-y-3">
        {targets.map((target) => {
          const fields = listingBindingFieldsForTarget(target.valueType);
          return (
            <label key={target.key} className="block text-[11px] font-medium text-zinc-700">
              {target.label}
              <select
                aria-label={`Listing data for ${target.label}`}
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
    </details>
  );
}
