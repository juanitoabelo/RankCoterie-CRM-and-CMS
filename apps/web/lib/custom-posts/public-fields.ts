import type { CustomFieldDefinition } from "@/modules/custom-fields/types";

export function getPublicCustomFields(
  rawGroups: unknown[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const rawGroup of rawGroups) {
    if (!Array.isArray(rawGroup)) continue;
    for (const item of rawGroup) {
      if (!item || typeof item !== "object") continue;
      const field = item as Partial<CustomFieldDefinition>;
      if (
        !field.key
        || field.key === "__proto__"
        || field.key === "constructor"
        || field.key === "prototype"
        || !field.type
        || field.type === "password"
        || field.type === "message"
        || field.type === "tab"
        || field.type === "accordion"
        || field.type === "clone"
        || field.type === "group"
        || field.type === "repeater"
        || field.type === "flexible_content"
      ) continue;
      if (!Object.hasOwn(values, field.key)) continue;
      const value = values[field.key];
      if ((field.type === "image" || field.type === "file") && typeof value === "string" && value) {
        result[field.key] = `/api/assets/${value}`;
      } else if (field.type === "gallery" && Array.isArray(value)) {
        result[field.key] = value
          .filter((assetId): assetId is string => typeof assetId === "string" && assetId.length > 0)
          .map((assetId) => `/api/assets/${assetId}`);
      } else {
        result[field.key] = value;
      }
    }
  }
  return result;
}

export function asCustomPostValues(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
