import {
  FIELD_TYPES,
  isLayoutOnlyType,
  isRelationalType,
  type CustomFieldDefinition,
  type CustomFieldType,
  type FlexibleLayout,
} from "./types";

export type ParseResult =
  | { ok: true; fields: CustomFieldDefinition[] }
  | { ok: false; error: string };

const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

function isFieldType(value: string): value is CustomFieldType {
  return (FIELD_TYPES as readonly string[]).includes(value);
}

function parseOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((option): option is string => typeof option === "string")
    .map((option) => option.trim())
    .filter(Boolean);
}

function parseNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function parseSubFields(raw: unknown, depth: number): { fields?: CustomFieldDefinition[]; error?: string } {
  if (raw === undefined || raw === null) return { fields: [] };
  if (!Array.isArray(raw)) return { error: "Sub-fields must be an array." };
  const parsed = parseFieldList(raw, depth + 1);
  if (!parsed.ok) return { error: parsed.error };
  return { fields: parsed.fields };
}

function parseLayouts(raw: unknown, depth: number): { layouts?: FlexibleLayout[]; error?: string } {
  if (raw === undefined || raw === null) return { layouts: [] };
  if (!Array.isArray(raw)) return { error: "Layouts must be an array." };
  const layouts: FlexibleLayout[] = [];
  const keys = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return { error: "Each layout needs a key and label." };
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key) || !label) {
      return { error: "Each layout needs a valid key and label." };
    }
    if (keys.has(key)) return { error: `Layout key "${key}" is duplicated.` };
    keys.add(key);
    const sub = parseSubFields(row.subFields, depth);
    if (sub.error) return { error: sub.error };
    layouts.push({ key, label, subFields: sub.fields ?? [] });
  }
  return { layouts };
}

function parseFieldObject(raw: Record<string, unknown>, depth: number): { field?: CustomFieldDefinition; error?: string } {
  const key = typeof raw.key === "string" ? raw.key.trim() : "";
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const type = typeof raw.type === "string" ? raw.type : "";
  if (!KEY_RE.test(key)) return { error: `Field key "${key || "?"}" must start with a letter and use only lowercase letters, numbers, and underscores.` };
  if (!label) return { error: `Field "${key}" needs a label.` };
  if (!isFieldType(type)) return { error: `Field "${key}" has an unknown type "${type}".` };

  const options = parseOptions(raw.options);
  // ACF: checkbox/radio/button_group/select/multiselect need options; true_false does not.
  const needsOptions =
    type === "select" || type === "multiselect" || type === "checkbox" || type === "radio" || type === "button_group";
  if (needsOptions && options.length === 0) {
    return { error: `Add at least one option for "${label}".` };
  }

  const field: CustomFieldDefinition = {
    key,
    label,
    type,
    required: raw.required === true,
    options,
  };

  const instructions = typeof raw.instructions === "string" ? raw.instructions.trim() : "";
  if (instructions) field.instructions = instructions;

  const message = typeof raw.message === "string" ? raw.message : "";
  if (type === "message") field.message = message;

  const min = parseNumber(raw.min);
  const max = parseNumber(raw.max);
  const step = parseNumber(raw.step);
  if (min !== undefined) field.min = min;
  if (max !== undefined) field.max = max;
  if (step !== undefined) field.step = step;

  if (isRelationalType(type)) {
    if (typeof raw.source === "string" && raw.source) field.source = raw.source as CustomFieldDefinition["source"];
    field.multiple = raw.multiple === true || type === "relationship";
  }

  if (type === "group" || type === "repeater") {
    const sub = parseSubFields(raw.subFields, depth);
    if (sub.error) return { error: sub.error };
    field.subFields = sub.fields ?? [];
    if (type === "repeater" && field.subFields.length === 0) {
      return { error: `Repeater "${label}" needs at least one sub-field.` };
    }
    if (type === "group" && field.subFields.length === 0) {
      return { error: `Group "${label}" needs at least one sub-field.` };
    }
    const subKeys = new Set(field.subFields.map((item) => item.key));
    if (subKeys.size !== field.subFields.length) {
      return { error: `Sub-field keys in "${label}" must be unique.` };
    }
  }

  if (type === "flexible_content") {
    const layouts = parseLayouts(raw.layouts, depth);
    if (layouts.error) return { error: layouts.error };
    field.layouts = layouts.layouts ?? [];
    if (field.layouts.length === 0) {
      return { error: `Flexible content "${label}" needs at least one layout.` };
    }
  }

  if (type === "clone") {
    const cloneGroupId = typeof raw.cloneGroupId === "string" ? raw.cloneGroupId.trim() : "";
    if (!cloneGroupId) return { error: `Clone field "${label}" must reference a field group.` };
    field.cloneGroupId = cloneGroupId;
  }

  return { field };
}

function parseFieldList(rawList: unknown[], depth: number): ParseResult {
  if (depth > 4) return { ok: false, error: "Field nesting is too deep." };
  const fields: CustomFieldDefinition[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== "object") return { ok: false, error: "Every field needs a valid label, key, and field type." };
    const parsed = parseFieldObject(item as Record<string, unknown>, depth);
    if (parsed.error || !parsed.field) return { ok: false, error: parsed.error ?? "Invalid field." };
    fields.push(parsed.field);
  }
  const keys = new Set(fields.map((field) => field.key));
  if (keys.size !== fields.length) {
    return { ok: false, error: "Field keys must be unique within a group." };
  }
  return { ok: true, fields };
}

/** Parse raw JSON field definitions from the field-group builder. */
export function parseDefinitions(raw: unknown): ParseResult {
  if (!Array.isArray(raw)) return { ok: false, error: "Field definitions must be valid JSON." };
  if (raw.length === 0) return { ok: false, error: "Add at least one valid custom field." };
  return parseFieldList(raw, 0);
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0)
  );
}

function validateStringValue(field: CustomFieldDefinition, value: unknown): string | null {
  if (typeof value !== "string") return `"${field.label}" must be text.`;
  const text = value.trim();
  switch (field.type) {
    case "email":
      if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return `Enter a valid email for "${field.label}".`;
      return null;
    case "url":
    case "oembed":
      if (text) {
        try {
          new URL(text);
        } catch {
          return `Enter a valid URL for "${field.label}".`;
        }
      }
      return null;
    case "number":
    case "range":
      if (text && !Number.isFinite(Number(text))) return `"${field.label}" must be a number.`;
      return null;
    case "select":
    case "radio":
    case "button_group":
      if (text && field.options.length > 0 && !field.options.includes(text)) {
        return `Select a valid option for "${field.label}".`;
      }
      return null;
    default:
      return null;
  }
}

function validateBoolean(field: CustomFieldDefinition, value: unknown): string | null {
  if (typeof value !== "boolean") return `"${field.label}" must be checked or unchecked.`;
  return null;
}

function validateStringArray(field: CustomFieldDefinition, value: unknown): string | null {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return `"${field.label}" must be a list of selections.`;
  }
  const entries = value as string[];
  if (field.type === "multiselect" || field.type === "checkbox") {
    if (field.options.length > 0 && entries.some((entry) => !field.options.includes(entry))) {
      return `Select valid options for "${field.label}".`;
    }
  }
  return null;
}

function validateLink(field: CustomFieldDefinition, value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return `"${field.label}" must be a link.`;
  const link = value as Record<string, unknown>;
  const url = typeof link.url === "string" ? link.url.trim() : "";
  if (url) {
    try {
      new URL(url);
    } catch {
      return `Enter a valid URL for "${field.label}".`;
    }
  }
  return null;
}

function validateRelationValue(field: CustomFieldDefinition, value: unknown): string | null {
  const multiple = field.multiple === true || field.type === "relationship";
  if (multiple) {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
      return `"${field.label}" must be a list of references.`;
    }
    return null;
  }
  if (value !== undefined && value !== null && value !== "" && typeof value !== "string") {
    return `"${field.label}" must be a reference.`;
  }
  return null;
}

function validateGallery(field: CustomFieldDefinition, value: unknown): string | null {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return `"${field.label}" must be a list of media items.`;
  }
  return null;
}

function validateObjectAgainstSubFields(
  label: string,
  subFields: CustomFieldDefinition[],
  value: unknown,
  validateOne: (field: CustomFieldDefinition, value: unknown) => string | null,
): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return `"${label}" must be an object.`;
  const record = value as Record<string, unknown>;
  for (const sub of subFields) {
    const error = validateOne(sub, record[sub.key]);
    if (error) return error;
  }
  return null;
}

/** Validate a single submitted value against its field definition (recursive). */
export function validateFieldValue(field: CustomFieldDefinition, value: unknown): string | null {
  if (isLayoutOnlyType(field.type)) return null;

  if (field.type === "clone") {
    // Clone values are validated by the expanded field list at the group level.
    return null;
  }

  if (field.required && isEmptyValue(value)) {
    return `"${field.label}" is required.`;
  }
  if (isEmptyValue(value)) return null;

  switch (field.type) {
    case "true_false":
      return validateBoolean(field, value);
    case "checkbox":
    case "multiselect":
      return validateStringArray(field, value);
    case "link":
      return validateLink(field, value);
    case "image":
    case "file":
      if (typeof value !== "string") return `"${field.label}" must be a media reference.`;
      return null;
    case "gallery":
      return validateGallery(field, value);
    case "wysiwyg":
      if (typeof value !== "string") return `"${field.label}" must be text.`;
      return null;
    case "group": {
      const subFields = field.subFields ?? [];
      return validateObjectAgainstSubFields(field.label, subFields, value, validateFieldValue);
    }
    case "repeater": {
      const subFields = field.subFields ?? [];
      if (!Array.isArray(value)) return `"${field.label}" must be a list of rows.`;
      for (const row of value) {
        const error = validateObjectAgainstSubFields(field.label, subFields, row, validateFieldValue);
        if (error) return error;
      }
      return null;
    }
    case "flexible_content": {
      const layouts = field.layouts ?? [];
      if (!Array.isArray(value)) return `"${field.label}" must be a list of layout blocks.`;
      for (const block of value) {
        if (!block || typeof block !== "object" || Array.isArray(block)) {
          return `"${field.label}" contains an invalid layout block.`;
        }
        const row = block as Record<string, unknown>;
        const layoutKey = typeof row.layout === "string" ? row.layout : "";
        const layout = layouts.find((item) => item.key === layoutKey);
        if (!layout) return `"${field.label}" contains an unknown layout.`;
        const error = validateObjectAgainstSubFields(field.label, layout.subFields, row.values ?? {}, validateFieldValue);
        if (error) return error;
      }
      return null;
    }
    case "post_object":
    case "page_link":
    case "relationship":
    case "taxonomy":
    case "user":
      return validateRelationValue(field, value);
    case "select":
    case "radio":
    case "button_group":
    case "text":
    case "textarea":
    case "number":
    case "range":
    case "email":
    case "url":
    case "password":
    case "date":
    case "oembed":
      return validateStringValue(field, value);
    default:
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        return `"${field.label}" has an invalid value.`;
      }
      return null;
  }
}

/**
 * Flatten definitions including clones (clone expands another group's fields).
 * `resolveClone` returns the cloned group's fields, or null when unavailable.
 */
export function expandCloneFields(
  fields: CustomFieldDefinition[],
  resolveClone: (groupId: string) => CustomFieldDefinition[] | null,
  seen: Set<string> = new Set(),
): CustomFieldDefinition[] {
  const out: CustomFieldDefinition[] = [];
  for (const field of fields) {
    if (field.type === "clone" && field.cloneGroupId) {
      if (seen.has(field.cloneGroupId)) continue;
      seen.add(field.cloneGroupId);
      const cloned = resolveClone(field.cloneGroupId);
      if (cloned) out.push(...expandCloneFields(cloned, resolveClone, seen));
      continue;
    }
    out.push(field);
  }
  return out;
}

/** Validate a full values bag against a list of field definitions. */
export function validateFieldValues(
  fields: CustomFieldDefinition[],
  values: Record<string, unknown>,
): string | null {
  for (const field of fields) {
    if (isLayoutOnlyType(field.type)) continue;
    if (field.type === "clone") continue;
    const error = validateFieldValue(field, values[field.key]);
    if (error) return error;
  }
  return null;
}

/** Type guard used by server actions. */
export function isKnownFieldType(value: string): value is CustomFieldType {
  return isFieldType(value);
}
