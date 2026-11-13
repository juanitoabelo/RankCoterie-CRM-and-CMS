"use client";

import { useState } from "react";
import { saveRolePermissions } from "./actions";
import type { PermissionMatrixData, ToolItemData } from "./types";

type Status = { kind: "ok" | "error"; text: string } | null;

const sectionTarget = (section: string) => `section:${section}`;
const toolTarget = (key: string) => `tool:${key}`;

export default function ToolsPermissionMatrix({ data }: { data: PermissionMatrixData }) {
  const [role, setRole] = useState(data.roles[0]?.role ?? "");
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>(
    data.overrides,
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const roleOverrides = overrides[role] ?? {};
  const roleDefaults = data.defaults[role] ?? {};

  function sectionInherited(section: string): boolean {
    const target = sectionTarget(section);
    if (target in roleOverrides) return roleOverrides[target];
    return roleDefaults[section] ?? false;
  }

  function toolVisible(tool: ToolItemData): boolean {
    const target = toolTarget(tool.key);
    if (target in roleOverrides) return roleOverrides[target];
    return sectionInherited(tool.section);
  }

  function toolOverridden(tool: ToolItemData): boolean {
    return toolTarget(tool.key) in roleOverrides;
  }

  function toggleSection(section: string, checked: boolean) {
    setStatus(null);
    const sectionItems = data.groups
      .flatMap((group) => group.sections)
      .filter((entry) => entry.section === section)
      .flatMap((entry) => entry.items);
    setOverrides((prev) => {
      const map = { ...(prev[role] ?? {}) };
      const sectionDefault = data.defaults[role]?.[section] ?? false;
      if (checked === sectionDefault) {
        delete map[sectionTarget(section)];
      } else {
        map[sectionTarget(section)] = checked;
      }
      for (const item of sectionItems) delete map[toolTarget(item.key)];
      return { ...prev, [role]: map };
    });
  }

  function toggleTool(tool: ToolItemData, checked: boolean) {
    setStatus(null);
    setOverrides((prev) => {
      const map = { ...(prev[role] ?? {}) };
      const key = toolTarget(tool.key);
      const sectionKey = sectionTarget(tool.section);
      const base =
        sectionKey in map ? map[sectionKey] : data.defaults[role]?.[tool.section] ?? false;
      if (checked === base) delete map[key];
      else map[key] = checked;
      return { ...prev, [role]: map };
    });
  }

  async function save() {
    if (!role) return;
    setSaving(true);
    setStatus(null);
    const entries = Object.entries(overrides[role] ?? {}).map(([target, visible]) => ({
      target,
      visible,
    }));
    const result = await saveRolePermissions(role, entries);
    setSaving(false);
    setStatus(
      result.ok
        ? { kind: "ok", text: "Permissions saved." }
        : { kind: "error", text: result.error },
    );
  }

  async function reset() {
    if (!role) return;
    setSaving(true);
    setStatus(null);
    const result = await saveRolePermissions(role, []);
    setSaving(false);
    if (result.ok) {
      setOverrides((prev) => ({ ...prev, [role]: {} }));
      setStatus({ kind: "ok", text: "Reset to built-in defaults." });
    } else {
      setStatus({ kind: "error", text: result.error });
    }
  }

  if (data.roles.length === 0) {
    return <p className="text-sm text-zinc-500">No editable roles found.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          User role
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.roles.map((option) => {
            const active = option.role === role;
            return (
              <button
                key={option.role}
                type="button"
                onClick={() => {
                  setRole(option.role);
                  setStatus(null);
                }}
                className={[
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-50",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Super Admin always has full access and is not editable. A section toggle
          shows/hides every link in that content type; individual links can still be
          overridden below it.
        </p>
      </div>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white/95 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save permissions"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={saving}
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 disabled:opacity-50"
        >
          Reset to defaults
        </button>
        {status && (
          <span
            className={[
              "text-sm",
              status.kind === "ok" ? "text-emerald-600" : "text-red-600",
            ].join(" ")}
          >
            {status.text}
          </span>
        )}
      </div>

      {data.groups.map((group) => (
        <div key={group.title} className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">{group.title}</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {group.sections.map((section) => {
              const sectionOn = sectionInherited(section.section);
              return (
                <div key={section.section} className="px-5 py-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sectionOn}
                      onChange={(event) =>
                        toggleSection(section.section, event.target.checked)
                      }
                      className="h-4 w-4 accent-zinc-900"
                    />
                    <span className="text-sm font-semibold text-zinc-900">
                      {section.label}
                    </span>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Section
                    </span>
                  </label>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((tool) => {
                      const visible = toolVisible(tool);
                      const overridden = toolOverridden(tool);
                      return (
                        <label
                          key={tool.key}
                          className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-100 px-3 py-2 hover:border-zinc-200"
                        >
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={(event) => toggleTool(tool, event.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-zinc-900"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm text-zinc-800">{tool.label}</span>
                            <span className="block text-[11px] text-zinc-400">
                              {overridden ? "Custom override" : "Inherits section"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
