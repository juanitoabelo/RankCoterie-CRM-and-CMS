"use client";

import { useMemo, useState } from "react";

export interface PickerRegion {
  id: string;
  state: string;
  stateFull: string;
  city: string | null; // null = state-level option
}

interface RegionPickerProps {
  regions: PickerRegion[];
  value: string[];
  onChange: (ids: string[]) => void;
  min?: number;
  max?: number;
  minHint?: string;
  maxHint?: string;
}

interface StateGroup {
  state: string;
  stateFull: string;
  items: PickerRegion[];
}

function groupByState(regions: PickerRegion[]): StateGroup[] {
  const map = new Map<string, StateGroup>();
  for (const r of regions) {
    const group = map.get(r.state) ?? { state: r.state, stateFull: r.stateFull, items: [] };
    group.items.push(r);
    map.set(r.state, group);
  }
  return [...map.values()];
}

/**
 * Checklist of regions grouped by state — used for "Nearby Areas" (listing target
 * regions, legacy recommends 3-5) and later for the localization publish flow
 * (target states for content-variant generation).
 */
export default function RegionPicker({
  regions,
  value,
  onChange,
  min = 3,
  max = 5,
  minHint = "Select at least 3 locations for best results.",
  maxHint = "For best results, choose 3 to 5 locations.",
}: RegionPickerProps) {
  const groups = useMemo(() => groupByState(regions), [regions]);
  const selected = useMemo(() => new Set(value), [value]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
      onChange([...next]);
    } else {
      next.add(id);
      if (max && next.size > max) {
        const first = next.values().next().value as string;
        next.delete(first);
      }
      onChange([...next]);
    }
  };

  const toggleState = (group: StateGroup) => {
    const ids = group.items.map((r) => r.id);
    const allSelected = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
    onChange([...next]);
  };

  const overMax = max !== undefined && selected.size > max;
  const underMin = selected.size < min;

  return (
    <div className="space-y-4">
      <p
        className={`text-sm ${overMax ? "text-red-600" : selected.size > 0 ? "text-emerald-700" : "text-zinc-500"}`}
        aria-live="polite"
      >
        {selected.size > 0
          ? `${selected.size} selected — ${selected.size >= 3 ? "Great!" : "keep going…"}`
          : minHint}
      </p>

      {groups.map((group) => {
        const allSelected = group.items.every((r) => selected.has(r.id));
        return (
          <fieldset key={group.state} className="rounded-xl border border-zinc-200 p-4">
            <legend className="px-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleState(group)}
                  className="h-4 w-4 accent-zinc-900"
                />
                {group.stateFull}
              </label>
            </legend>

            <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((r) => {
                const checked = selected.has(r.id);
                return (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4 accent-zinc-900"
                    />
                    {r.city ?? `${r.stateFull} (statewide)`}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {underMin && <p className="text-xs text-amber-600">{minHint}</p>}
    </div>
  );
}