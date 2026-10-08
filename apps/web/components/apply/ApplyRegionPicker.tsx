"use client";

import { useMemo } from "react";

export interface ApplyRegion {
  id: string;
  state: string;
  stateFull: string;
  city: string | null;
}

interface StateGroup {
  state: string;
  stateFull: string;
  items: ApplyRegion[];
}

function groupByState(regions: ApplyRegion[]): StateGroup[] {
  const map = new Map<string, StateGroup>();
  for (const r of regions) {
    const group = map.get(r.state) ?? { state: r.state, stateFull: r.stateFull, items: [] };
    group.items.push(r);
    map.set(r.state, group);
  }
  return [...map.values()];
}

/**
 * Native-checkbox region checklist for the public apply form.
 * Groups regions by state with a per-state "select all" toggle.
 * Submits `regionIds` through the enclosing server-action form.
 */
export default function ApplyRegionPicker({ regions }: { regions: ApplyRegion[] }) {
  const groups = useMemo(() => groupByState(regions), [regions]);

  const toggleState = (state: string, checked: boolean) => {
    const boxes = document.querySelectorAll<HTMLInputElement>(
      `input[name="regionIds"][data-state="${state}"]`,
    );
    boxes.forEach((box) => {
      box.checked = checked;
    });
  };

  return (
    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
      {groups.map((group) => (
        <fieldset key={group.state} className="rounded-xl border border-zinc-200 p-3">
          <legend className="px-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900"
                onChange={(e) => toggleState(group.state, e.target.checked)}
              />
              {group.stateFull}
            </label>
          </legend>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {group.items.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  name="regionIds"
                  value={r.id}
                  data-state={group.state}
                  className="h-4 w-4 accent-zinc-900"
                />
                {r.city ?? `${group.stateFull} (statewide)`}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
