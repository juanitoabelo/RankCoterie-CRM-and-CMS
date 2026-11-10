"use client";

import { useEffect, useMemo, useState } from "react";
import type { CustomFieldDefinition, RelationOption } from "@/modules/custom-fields/types";
import { isLayoutOnlyType, sourceForField } from "@/modules/custom-fields/types";
import RichTextEditor from "@/components/admin/page-builder/RichTextEditor";
import MediaLibraryPicker from "@/components/admin/page-builder/MediaLibraryPicker";
import AdvancedTextarea from "@/components/admin/AdvancedTextarea";

export type RelationOptionsMap = Record<string, RelationOption[]>;

const inputClass = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

function AssetPicker({
  value,
  onChange,
  acceptImages,
}: {
  value: string;
  onChange: (assetId: string) => void;
  acceptImages: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = value ? `/api/assets/${value}` : "";
  const isImage = acceptImages;

  async function upload(file: File) {
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      onChange(json.url.replace(/^\/api\/assets\//, ""));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-1 space-y-2">
      {value && (
        <div className="relative inline-block">
          {isImage ? (
            <img src={previewUrl} alt="" className="h-24 w-24 rounded-lg border border-zinc-200 object-cover" />
          ) : (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-blue-700 hover:underline">
              Open file
            </a>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 top-1 rounded bg-zinc-900/70 px-1.5 py-0.5 text-[10px] text-white hover:bg-zinc-900"
          >
            Remove
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <MediaLibraryPicker
          value={previewUrl}
          onChange={(url) => onChange(url ? url.replace(/^\/api\/assets\//, "") : "")}
          label={value ? "Change" : "Choose From Gallery"}
        />
        <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function GalleryPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function addFromUpload(file: File) {
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      const id = json.url.replace(/^\/api\/assets\//, "");
      if (!value.includes(id)) onChange([...value, id]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-1 space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((id, index) => (
            <div key={`${id}-${index}`} className="relative">
              <img src={`/api/assets/${id}`} alt="" className="aspect-square w-full rounded-lg border border-zinc-200 object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...value];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onChange(next);
                  }}
                  className="rounded px-1 text-[10px] text-white disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="rounded px-1 text-[10px] text-white"
                >
                  ✕
                </button>
                <button
                  type="button"
                  disabled={index === value.length - 1}
                  onClick={() => {
                    const next = [...value];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    onChange(next);
                  }}
                  className="rounded px-1 text-[10px] text-white disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <MediaLibraryPicker
          value=""
          onChange={(url) => {
            if (!url) return;
            const id = url.replace(/^\/api\/assets\//, "");
            if (!value.includes(id)) onChange([...value, id]);
          }}
          label="Add from Gallery"
        />
        <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files[0]) void addFromUpload(files[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[11px] text-zinc-400">{value.length} image{value.length === 1 ? "" : "s"}</p>
    </div>
  );
}

function OEmbedPreview({ url }: { url: string }) {
  if (!url) return null;
  let embed = "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      const id = parsed.hostname.includes("youtu.be")
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v");
      if (id) embed = `https://www.youtube.com/embed/${id}`;
    } else if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) embed = `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-blue-700 hover:underline">
        {url}
      </a>
    );
  }
  return (
    <iframe
      src={embed}
      title="Embed preview"
      className="mt-2 aspect-video w-full rounded-lg border border-zinc-200"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

function RelationalInput({
  field,
  value,
  onChange,
  options,
  loading,
}: {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  options: RelationOption[];
  loading: boolean;
}) {
  const multiple = field.multiple === true || field.type === "relationship";
  if (field.type === "link") {
    const link = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
    return (
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium text-zinc-600 sm:col-span-2">
          URL
          <input
            type="url"
            className={inputClass}
            value={String(link.url ?? "")}
            onChange={(event) => onChange({ ...link, url: event.target.value })}
            placeholder="https://"
          />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Title
          <input
            className={inputClass}
            value={String(link.title ?? "")}
            onChange={(event) => onChange({ ...link, title: event.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Target
          <select
            className={inputClass}
            value={String(link.target ?? "_self")}
            onChange={(event) => onChange({ ...link, target: event.target.value })}
          >
            <option value="_self">Same window</option>
            <option value="_blank">New window</option>
          </select>
        </label>
      </div>
    );
  }

  if (loading) {
    return <p className="mt-1 text-sm text-zinc-500">Loading options…</p>;
  }
  if (options.length === 0) {
    return <p className="mt-1 text-sm text-zinc-500">No options available.</p>;
  }

  if (multiple) {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return (
      <select
        multiple
        className={inputClass}
        value={selected}
        required={field.required}
        onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const selected = typeof value === "string" ? value : "";
  return (
    <select
      className={inputClass}
      value={selected}
      required={field.required}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select…</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SubFieldGrid({
  subFields,
  values,
  onChange,
  relationOptions,
  relationLoading,
}: {
  subFields: CustomFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  relationOptions: RelationOptionsMap;
  relationLoading: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {subFields.map((sub) => (
        <div key={sub.key} className={sub.type === "wysiwyg" || sub.type === "gallery" || sub.type === "flexible_content" ? "sm:col-span-2" : ""}>
          <FieldInput
            field={sub}
            value={values[sub.key]}
            onChange={(next) => onChange({ ...values, [sub.key]: next })}
            relationOptions={relationOptions}
            relationLoading={relationLoading}
          />
        </div>
      ))}
    </div>
  );
}

function RepeaterInput({
  field,
  value,
  onChange,
  relationOptions,
  relationLoading,
}: {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  relationOptions: RelationOptionsMap;
  relationLoading: boolean;
}) {
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const subFields = field.subFields ?? [];

  function updateRow(index: number, row: Record<string, unknown>) {
    onChange(rows.map((item, i) => (i === index ? row : item)));
  }

  return (
    <div className="mt-1 space-y-3">
      {rows.map((row, index) => (
        <div key={index} className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Row {index + 1}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const next = [...rows];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  onChange(next);
                }}
                className="text-xs text-zinc-600 hover:underline disabled:opacity-30"
              >
                Up
              </button>
              <button
                type="button"
                disabled={index === rows.length - 1}
                onClick={() => {
                  const next = [...rows];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  onChange(next);
                }}
                className="text-xs text-zinc-600 hover:underline disabled:opacity-30"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className="text-xs text-red-700 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
          <SubFieldGrid
            subFields={subFields}
            values={row ?? {}}
            onChange={(next) => updateRow(index, next)}
            relationOptions={relationOptions}
            relationLoading={relationLoading}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, {}])}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        + Add Row
      </button>
    </div>
  );
}

function FlexibleContentInput({
  field,
  value,
  onChange,
  relationOptions,
  relationLoading,
}: {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  relationOptions: RelationOptionsMap;
  relationLoading: boolean;
}) {
  const layouts = field.layouts ?? [];
  const blocks = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  return (
    <div className="mt-1 space-y-3">
      {blocks.map((block, index) => {
        const layoutKey = String(block.layout ?? "");
        const layout = layouts.find((item) => item.key === layoutKey);
        return (
          <div key={index} className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <select
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
                value={layoutKey}
                onChange={(event) => {
                  const nextLayout = layouts.find((item) => item.key === event.target.value);
                  onChange(
                    blocks.map((item, i) =>
                      i === index
                        ? { layout: event.target.value, values: nextLayout ? {} : (item.values as Record<string, unknown>) ?? {} }
                        : item,
                    ),
                  );
                }}
              >
                {layouts.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...blocks];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onChange(next);
                  }}
                  className="text-xs text-zinc-600 hover:underline disabled:opacity-30"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => onChange(blocks.filter((_, i) => i !== index))}
                  className="text-xs text-red-700 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
            {layout && (
              <SubFieldGrid
                subFields={layout.subFields}
                values={(block.values as Record<string, unknown>) ?? {}}
                onChange={(values) =>
                  onChange(blocks.map((item, i) => (i === index ? { ...item, values } : item)))
                }
                relationOptions={relationOptions}
                relationLoading={relationLoading}
              />
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        {layouts.map((layout) => (
          <button
            key={layout.key}
            type="button"
            onClick={() => onChange([...blocks, { layout: layout.key, values: {} }])}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + {layout.label}
          </button>
        ))}
        {layouts.length === 0 && <p className="text-sm text-zinc-500">No layouts configured.</p>}
      </div>
    </div>
  );
}

export default function FieldInput({
  field,
  value,
  onChange,
  relationOptions = {},
  relationLoading = false,
}: {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  relationOptions?: RelationOptionsMap;
  relationLoading?: boolean;
}) {
  // Layout-only types render no input.
  if (isLayoutOnlyType(field.type)) return null;

  if (field.type === "message") {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        dangerouslySetInnerHTML={{ __html: field.message ?? field.label }}
      />
    );
  }

  if (field.type === "wysiwyg") {
    return (
      <div className="mt-1">
        <RichTextEditor
          value={String(value ?? "")}
          onChange={onChange}
          minHeight={140}
          placeholder={field.instructions ?? "Write content…"}
        />
      </div>
    );
  }

  if (field.type === "image" || field.type === "file") {
    return (
      <AssetPicker
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        acceptImages={field.type === "image"}
      />
    );
  }

  if (field.type === "gallery") {
    return (
      <GalleryPicker
        value={Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []}
        onChange={onChange}
      />
    );
  }

  if (field.type === "oembed") {
    const url = String(value ?? "");
    return (
      <div className="mt-1 space-y-1">
        <input
          type="url"
          className={inputClass}
          value={url}
          required={field.required}
          placeholder="https://youtube.com/watch?…"
          onChange={(event) => onChange(event.target.value)}
        />
        <OEmbedPreview url={url} />
      </div>
    );
  }

  if (field.type === "group") {
    const groupValue = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
    return (
      <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
        <SubFieldGrid
          subFields={field.subFields ?? []}
          values={groupValue}
          onChange={onChange}
          relationOptions={relationOptions}
          relationLoading={relationLoading}
        />
      </div>
    );
  }

  if (field.type === "repeater") {
    return (
      <RepeaterInput
        field={field}
        value={value}
        onChange={onChange}
        relationOptions={relationOptions}
        relationLoading={relationLoading}
      />
    );
  }

  if (field.type === "flexible_content") {
    return (
      <FlexibleContentInput
        field={field}
        value={value}
        onChange={onChange}
        relationOptions={relationOptions}
        relationLoading={relationLoading}
      />
    );
  }

  if (
    field.type === "link" ||
    field.type === "post_object" ||
    field.type === "page_link" ||
    field.type === "relationship" ||
    field.type === "taxonomy" ||
    field.type === "user"
  ) {
    const source = sourceForField(field);
    const options = source ? relationOptions[source] ?? [] : [];
    return (
      <RelationalInput
        field={field}
        value={value}
        onChange={onChange}
        options={options}
        loading={relationLoading && !!source && !relationOptions[source]}
      />
    );
  }

  if (field.type === "true_false") {
    return (
      <label className="mt-1 flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        {value === true ? "Yes" : "No"}
      </label>
    );
  }

  if (field.type === "radio" || field.type === "button_group") {
    const selected = String(value ?? "");
    if (field.type === "button_group") {
      return (
        <div className="mt-1 flex flex-wrap gap-2">
          {field.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                selected === option
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="mt-1 space-y-1">
        {field.options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name={`cf-${field.key}`}
              value={option}
              checked={selected === option}
              required={field.required}
              onChange={() => onChange(option)}
              className="h-4 w-4 border-zinc-300"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return (
      <div className="mt-1 space-y-1">
        {field.options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option),
                )
              }
              className="h-4 w-4 rounded border-zinc-300"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "select" || field.type === "multiselect") {
    const multiple = field.type === "multiselect";
    if (multiple) {
      const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
      return (
        <select
          multiple
          className={inputClass}
          value={selected}
          required={field.required}
          onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
        >
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    return (
      <select
        className={inputClass}
        value={String(value ?? "")}
        required={field.required}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select…</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="mt-1">
        <AdvancedTextarea
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={field.instructions ?? undefined}
          minRows={3}
          maxRows={16}
          maxLength={5000}
          required={field.required}
          ariaLabel={field.label}
        />
      </div>
    );
  }

  if (field.type === "range") {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const step = field.step ?? 1;
    const numeric = value === "" || value === undefined || value === null ? min : Number(value);
    return (
      <div className="mt-1 space-y-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(numeric) ? numeric : min}
          onChange={(event) => onChange(event.target.value)}
          className="w-full"
        />
        <p className="text-xs text-zinc-500">{String(value ?? min)}</p>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        className={inputClass}
        step={field.step ?? "any"}
        min={field.min}
        max={field.max}
        value={value === undefined || value === null ? "" : String(value)}
        required={field.required}
        onChange={(event) => onChange(event.target.value === "" ? "" : event.target.value)}
      />
    );
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "url"
        ? "url"
        : field.type === "password"
          ? "password"
          : field.type === "date"
            ? "date"
            : "text";

  return (
    <input
      type={inputType}
      className={inputClass}
      value={String(value ?? "")}
      required={field.required}
      autoComplete={field.type === "password" ? "new-password" : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** Load relational options for the sources used by a set of fields (including nested). */
export function collectRelationSources(fields: CustomFieldDefinition[]): string[] {
  const sources = new Set<string>();
  const walk = (list: CustomFieldDefinition[]) => {
    for (const field of list) {
      if (
        field.type === "post_object" ||
        field.type === "page_link" ||
        field.type === "relationship" ||
        field.type === "taxonomy" ||
        field.type === "user"
      ) {
        const source = sourceForField(field);
        if (source) sources.add(source);
      }
      if (field.subFields) walk(field.subFields);
      if (field.layouts) field.layouts.forEach((layout) => walk(layout.subFields));
    }
  };
  walk(fields);
  return [...sources];
}

/** Hook that loads relation options for the given fields once. */
export function useRelationOptions(fields: CustomFieldDefinition[], customPostTypeId?: string): {
  options: RelationOptionsMap;
  loading: boolean;
} {
  const sources = useMemo(() => collectRelationSources(fields), [fields]);
  const [options, setOptions] = useState<RelationOptionsMap>({});
  const [loadedKey, setLoadedKey] = useState("");
  const key = `${customPostTypeId ?? ""}|${sources.join(",")}`;
  const needsLoad = key.length > 0 && key !== loadedKey;

  useEffect(() => {
    if (!needsLoad) return;
    let active = true;
    import("@/app/(admin)/admin/custom-fields/actions")
      .then(({ getCustomFieldRelationOptions }) => getCustomFieldRelationOptions(sources, customPostTypeId))
      .then((result) => {
        if (!active) return;
        setOptions(result);
        setLoadedKey(key);
      })
      .catch(() => {
        if (active) {
          setOptions({});
          setLoadedKey(key);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needsLoad, customPostTypeId]);

  return { options, loading: needsLoad };
}
