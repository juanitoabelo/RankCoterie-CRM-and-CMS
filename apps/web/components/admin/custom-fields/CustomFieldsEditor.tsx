"use client";

import { useEffect, useState } from "react";
import { getCustomFieldEditorData } from "@/app/(admin)/admin/custom-fields/actions";
import type { ContentType, CustomFieldDefinition } from "@/modules/custom-fields/types";
import FieldInput, { useRelationOptions } from "./FieldInput";

type Props = {
  contentType: ContentType;
  recordId?: string;
  onLoaded?: (hasFields: boolean) => void;
};

type EditorData = {
  groups: { id: string; name: string; fields: CustomFieldDefinition[] }[];
  values: Record<string, unknown>;
};

function FieldBlock({
  field,
  value,
  onChange,
  relationOptions,
  relationLoading,
}: {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  relationOptions: ReturnType<typeof useRelationOptions>["options"];
  relationLoading: boolean;
}) {
  if (field.type === "tab") {
    return (
      <div className="pt-2">
        <h3 className="border-b border-zinc-200 pb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {field.label}
        </h3>
      </div>
    );
  }
  if (field.type === "accordion") {
    return (
      <details className="rounded-lg border border-zinc-200" open>
        <summary className="cursor-pointer bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800">
          {field.label}
        </summary>
        {field.message && (
          <p className="border-t border-zinc-100 px-3 py-2 text-sm text-zinc-600">{field.message}</p>
        )}
      </details>
    );
  }
  if (field.type === "message") {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        dangerouslySetInnerHTML={{ __html: field.message ?? field.label }}
      />
    );
  }

  const showLabelInline = ["image", "file", "gallery", "wysiwyg", "group", "repeater", "flexible_content", "link", "true_false", "radio", "button_group", "checkbox", "oembed"].includes(field.type);

  if (showLabelInline) {
    return (
      <div className="text-sm font-medium text-zinc-700">
        <span>
          {field.label}
          {field.required && <span className="ml-1 text-red-600">*</span>}
        </span>
        {field.instructions && (
          <span className="mb-1 block text-xs font-normal text-zinc-500">{field.instructions}</span>
        )}
        <FieldInput
          field={field}
          value={value}
          onChange={onChange}
          relationOptions={relationOptions}
          relationLoading={relationLoading}
        />
      </div>
    );
  }

  return (
    <label className="block text-sm font-medium text-zinc-700">
      <span>
        {field.label}
        {field.required && <span className="ml-1 text-red-600">*</span>}
        {field.instructions && (
          <span className="mt-0.5 block text-xs font-normal text-zinc-500">{field.instructions}</span>
        )}
      </span>
      <FieldInput
        field={field}
        value={value}
        onChange={onChange}
        relationOptions={relationOptions}
        relationLoading={relationLoading}
      />
    </label>
  );
}

export default function CustomFieldsEditor({ contentType, recordId, onLoaded }: Props) {
  const [data, setData] = useState<EditorData | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCustomFieldEditorData(contentType, recordId)
      .then((result) => {
        if (!active) return;
        setData(result);
        setValues(result.values);
        onLoaded?.(result.groups.length > 0);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not load custom fields.");
          onLoaded?.(true);
        }
      });
    return () => { active = false; };
  }, [contentType, recordId, onLoaded]);

  const allFields = data?.groups.flatMap((group) => group.fields) ?? [];
  const { options: relationOptions, loading: relationLoading } = useRelationOptions(allFields);

  if (error) return <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>;
  if (!data || data.groups.length === 0) return null;

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Custom Fields</h2>
        <p className="mt-1 text-xs text-zinc-500">Values are saved with this content record.</p>
      </div>
      {data.groups.map((group) => (
        <fieldset key={group.id} className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-medium text-zinc-800">{group.name}</legend>
          {group.fields.map((field) => (
            <FieldBlock
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
              relationOptions={relationOptions}
              relationLoading={relationLoading}
            />
          ))}
        </fieldset>
      ))}
      <input type="hidden" name="customFieldValues" value={JSON.stringify(values)} />
    </section>
  );
}
