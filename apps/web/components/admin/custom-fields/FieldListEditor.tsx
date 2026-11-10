"use client";

import {
  FIELD_TYPE_CATEGORIES,
  FIELD_TYPE_LABELS,
  RELATIONAL_SOURCES,
  isChoiceType,
  isRelationalType,
  type CustomFieldDefinition,
  type CustomFieldType,
} from "@/modules/custom-fields/types";

const inputClass = "mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm";
const smallLabel = "text-xs font-medium text-zinc-600";

export function blankField(type: CustomFieldType = "text"): CustomFieldDefinition {
  const base: CustomFieldDefinition = { key: "", label: "", type, required: false, options: [] };
  if (type === "message") base.message = "";
  if (type === "clone") base.cloneGroupId = "";
  if (type === "group" || type === "repeater") base.subFields = [];
  if (type === "flexible_content") base.layouts = [];
  if (isRelationalType(type)) {
    base.multiple = type === "relationship";
    if (type === "page_link") base.source = "page";
    if (type === "taxonomy") base.source = "category";
    if (type === "user") base.source = "user";
    if (type === "post_object" || type === "relationship") base.source = "article";
  }
  return base;
}

function slugKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 64);
}

function OptionsEditor({
  field,
  onChange,
}: {
  field: CustomFieldDefinition;
  onChange: (field: CustomFieldDefinition) => void;
}) {
  if (!isChoiceType(field.type) || field.type === "true_false") return null;
  return (
    <label className={`${smallLabel} block`}>
      Options (one per line)
      <textarea
        rows={3}
        className={inputClass}
        value={field.options.join("\n")}
        onChange={(event) =>
          onChange({
            ...field,
            options: event.target.value.split("\n").map((option) => option.trim()).filter(Boolean),
          })
        }
      />
    </label>
  );
}

function SubFieldsEditor({
  subFields,
  onChange,
  depth,
  availableGroups,
}: {
  subFields: CustomFieldDefinition[];
  onChange: (fields: CustomFieldDefinition[]) => void;
  depth: number;
  availableGroups: { id: string; name: string }[];
}) {
  if (depth > 3) return null;
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2">
      <div className="flex items-center justify-between">
        <span className={smallLabel}>Sub-fields</span>
        <button
          type="button"
          onClick={() => onChange([...subFields, blankField("text")])}
          className="text-[11px] font-medium text-amber-700 hover:underline"
        >
          + Sub-field
        </button>
      </div>
      {subFields.map((sub, index) => (
        <FieldRowEditor
          key={index}
          field={sub}
          onChange={(next) => onChange(subFields.map((item, i) => (i === index ? next : item)))}
          onRemove={() => onChange(subFields.filter((_, i) => i !== index))}
          depth={depth + 1}
          availableGroups={availableGroups}
          compact
        />
      ))}
      {subFields.length === 0 && <p className="text-[11px] text-zinc-500">No sub-fields yet.</p>}
    </div>
  );
}

function LayoutsEditor({
  layouts,
  onChange,
  depth,
  availableGroups,
}: {
  layouts: NonNullable<CustomFieldDefinition["layouts"]>;
  onChange: (layouts: NonNullable<CustomFieldDefinition["layouts"]>) => void;
  depth: number;
  availableGroups: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2">
      <div className="flex items-center justify-between">
        <span className={smallLabel}>Layouts</span>
        <button
          type="button"
          onClick={() =>
            onChange([...layouts, { key: `layout_${layouts.length + 1}`, label: `Layout ${layouts.length + 1}`, subFields: [] }])
          }
          className="text-[11px] font-medium text-amber-700 hover:underline"
        >
          + Layout
        </button>
      </div>
      {layouts.map((layout, index) => (
        <div key={index} className="rounded border border-zinc-200 bg-white p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={smallLabel}>
              Layout label
              <input
                className={inputClass}
                value={layout.label}
                onChange={(event) => {
                  onChange(
                    layouts.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            label: event.target.value,
                            key: slugKey(event.target.value) || item.key,
                          }
                        : item,
                    ),
                  );
                }}
              />
            </label>
            <label className={smallLabel}>
              Key
              <input
                className={inputClass}
                value={layout.key}
                onChange={(event) => {
                  onChange(
                    layouts.map((item, i) =>
                      i === index ? { ...item, key: event.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_") } : item,
                    ),
                  );
                }}
              />
            </label>
          </div>
          <SubFieldsEditor
            subFields={layout.subFields}
            onChange={(subFields) =>
              onChange(layouts.map((item, i) => (i === index ? { ...item, subFields } : item)))
            }
            depth={depth}
            availableGroups={availableGroups}
          />
          <button
            type="button"
            onClick={() => onChange(layouts.filter((_, i) => i !== index))}
            className="mt-1 text-[11px] text-red-700 hover:underline"
          >
            Remove layout
          </button>
        </div>
      ))}
      {layouts.length === 0 && <p className="text-[11px] text-zinc-500">No layouts yet.</p>}
    </div>
  );
}

export function FieldRowEditor({
  field,
  onChange,
  onRemove,
  depth,
  availableGroups,
  compact = false,
}: {
  field: CustomFieldDefinition;
  onChange: (field: CustomFieldDefinition) => void;
  onRemove: () => void;
  depth: number;
  availableGroups: { id: string; name: string }[];
  compact?: boolean;
}) {
  const needsOptions =
    field.type === "select" ||
    field.type === "multiselect" ||
    field.type === "checkbox" ||
    field.type === "radio" ||
    field.type === "button_group";

  return (
    <div className={`rounded-lg border border-zinc-200 p-3 ${compact ? "bg-white" : ""}`}>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_160px_auto]">
        <label className={smallLabel}>
          Label
          <input
            className={inputClass}
            value={field.label}
            onChange={(event) => {
              const label = event.target.value;
              onChange({
                ...field,
                label,
                key: field.key || slugKey(label),
              });
            }}
          />
        </label>
        <label className={smallLabel}>
          Key
          <input
            className={inputClass}
            value={field.key}
            onChange={(event) =>
              onChange({ ...field, key: event.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 64) })
            }
          />
        </label>
        <label className={smallLabel}>
          Type
          <select
            className={inputClass}
            value={field.type}
            onChange={(event) => {
              const type = event.target.value as CustomFieldType;
              onChange({ ...blankField(type), key: field.key, label: field.label, required: field.required });
            }}
          >
            {FIELD_TYPE_CATEGORIES.map((category) => (
              <optgroup key={category.value} label={category.label}>
                {category.types.map((type) => (
                  <option key={type} value={type}>
                    {FIELD_TYPE_LABELS[type]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3 pb-1">
          <label className="flex items-center gap-1 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) => onChange({ ...field, required: event.target.checked })}
            />
            Required
          </label>
          <button type="button" onClick={onRemove} className="text-xs text-red-700 hover:underline">
            Remove
          </button>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className={`${smallLabel} sm:col-span-2`}>
          Instructions (optional)
          <input
            className={inputClass}
            value={field.instructions ?? ""}
            onChange={(event) => onChange({ ...field, instructions: event.target.value || undefined })}
          />
        </label>

        {field.type === "message" && (
          <label className={`${smallLabel} sm:col-span-2`}>
            Message (HTML allowed)
            <textarea
              rows={2}
              className={inputClass}
              value={field.message ?? ""}
              onChange={(event) => onChange({ ...field, message: event.target.value })}
            />
          </label>
        )}

        {(field.type === "number" || field.type === "range") && (
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <label className={smallLabel}>
              Min
              <input
                type="number"
                className={inputClass}
                value={field.min ?? ""}
                onChange={(event) => onChange({ ...field, min: event.target.value === "" ? undefined : Number(event.target.value) })}
              />
            </label>
            <label className={smallLabel}>
              Max
              <input
                type="number"
                className={inputClass}
                value={field.max ?? ""}
                onChange={(event) => onChange({ ...field, max: event.target.value === "" ? undefined : Number(event.target.value) })}
              />
            </label>
            <label className={smallLabel}>
              Step
              <input
                type="number"
                className={inputClass}
                value={field.step ?? ""}
                onChange={(event) => onChange({ ...field, step: event.target.value === "" ? undefined : Number(event.target.value) })}
              />
            </label>
          </div>
        )}

        {isRelationalType(field.type) && (
          <>
            <label className={smallLabel}>
              Source
              <select
                className={inputClass}
                value={field.source ?? (field.type === "page_link" ? "page" : field.type === "taxonomy" ? "category" : field.type === "user" ? "user" : "article")}
                onChange={(event) => onChange({ ...field, source: event.target.value as CustomFieldDefinition["source"] })}
              >
                {RELATIONAL_SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-1 pb-1 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={field.multiple === true || field.type === "relationship"}
                disabled={field.type === "relationship" || field.type === "link"}
                onChange={(event) => onChange({ ...field, multiple: event.target.checked })}
              />
              Allow multiple
            </label>
          </>
        )}

        {field.type === "clone" && (
          <label className={`${smallLabel} sm:col-span-2`}>
            Clone field group
            <select
              className={inputClass}
              value={field.cloneGroupId ?? ""}
              onChange={(event) => onChange({ ...field, cloneGroupId: event.target.value })}
            >
              <option value="">Select a group…</option>
              {availableGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {needsOptions && <div className="mt-2"><OptionsEditor field={field} onChange={onChange} /></div>}

      {(field.type === "group" || field.type === "repeater") && (
        <div className="mt-2">
          <SubFieldsEditor
            subFields={field.subFields ?? []}
            onChange={(subFields) => onChange({ ...field, subFields })}
            depth={depth}
            availableGroups={availableGroups}
          />
        </div>
      )}

      {field.type === "flexible_content" && (
        <div className="mt-2">
          <LayoutsEditor
            layouts={field.layouts ?? []}
            onChange={(layouts) => onChange({ ...field, layouts })}
            depth={depth}
            availableGroups={availableGroups}
          />
        </div>
      )}
    </div>
  );
}

export function FieldListEditor({
  fields,
  onChange,
  availableGroups,
}: {
  fields: CustomFieldDefinition[];
  onChange: (fields: CustomFieldDefinition[]) => void;
  availableGroups: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800">Fields</h3>
        <div className="flex gap-2">
          <select
            className="rounded border border-zinc-300 px-2 py-1 text-xs"
            value=""
            onChange={(event) => {
              const type = event.target.value as CustomFieldType;
              if (!type) return;
              onChange([...fields, blankField(type)]);
              event.currentTarget.value = "";
            }}
          >
            <option value="">Add field…</option>
            {FIELD_TYPE_CATEGORIES.map((category) => (
              <optgroup key={category.value} label={category.label}>
                {category.types.map((type) => (
                  <option key={type} value={type}>
                    {FIELD_TYPE_LABELS[type]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      {fields.map((field, index) => (
        <FieldRowEditor
          key={index}
          field={field}
          onChange={(next) => onChange(fields.map((item, i) => (i === index ? next : item)))}
          onRemove={() => onChange(fields.filter((_, i) => i !== index))}
          depth={0}
          availableGroups={availableGroups}
        />
      ))}
      {fields.length === 0 && (
        <p className="text-sm text-zinc-500">No fields yet — choose “Add field…” above.</p>
      )}
    </div>
  );
}
