export type CustomFormFieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
export type CustomFormFieldWidth = "full" | "half";

export interface CustomFormField {
  key: string;
  label: string;
  type: CustomFormFieldType;
  required: boolean;
  width: CustomFormFieldWidth;
  placeholder?: string;
  helpText?: string;
  customCss?: string;
  options?: string[];
}

export interface CustomFormSettings {
  notifyTo: string[];
  from: string;
  subject: string;
  body: string;
  confirmationEnabled: boolean;
  confirmationEmailField: string;
  confirmationSubject: string;
  confirmationBody: string;
  createLead: boolean;
  leadFields: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    message?: string;
  };
}

export const DEFAULT_CUSTOM_FORM_SETTINGS: CustomFormSettings = {
  notifyTo: [],
  from: "",
  subject: "New form submission: {{formName}}",
  body: "{{submission}}",
  confirmationEnabled: false,
  confirmationEmailField: "",
  confirmationSubject: "We received your message",
  confirmationBody: "Thank you for contacting us. We will be in touch soon.",
  createLead: false,
  leadFields: {},
};

export function normalizeCustomFormFields(value: unknown): CustomFormField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): CustomFormField[] => {
    if (!item || typeof item !== "object") return [];
    const field = item as Record<string, unknown>;
    if (
      typeof field.key !== "string" ||
      typeof field.label !== "string" ||
      !["text", "email", "phone", "textarea", "select", "checkbox"].includes(String(field.type))
    ) return [];
    return [{
      key: field.key,
      label: field.label,
      type: field.type as CustomFormFieldType,
      required: field.required === true,
      width: field.width === "half" ? "half" : "full",
      ...(typeof field.placeholder === "string" ? { placeholder: field.placeholder.slice(0, 200) } : {}),
      ...(typeof field.helpText === "string" ? { helpText: field.helpText.slice(0, 500) } : {}),
      ...(typeof field.customCss === "string" ? { customCss: field.customCss.slice(0, 1000) } : {}),
      ...(Array.isArray(field.options) ? { options: field.options.filter((v): v is string => typeof v === "string") } : {}),
    }];
  });
}

const CUSTOM_FIELD_CSS_PROPERTIES: Record<string, keyof CSSProperties> = {
  color: "color",
  "background-color": "backgroundColor",
  "border-color": "borderColor",
  "border-width": "borderWidth",
  "border-style": "borderStyle",
  "border-radius": "borderRadius",
  padding: "padding",
  "padding-top": "paddingTop",
  "padding-right": "paddingRight",
  "padding-bottom": "paddingBottom",
  "padding-left": "paddingLeft",
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "text-align": "textAlign",
};

function safeCustomFieldCssDeclaration(declaration: string): { property: keyof CSSProperties; value: string } | null {
  const separator = declaration.indexOf(":");
  if (separator < 1) return null;
  const property = declaration.slice(0, separator).trim().toLowerCase();
  const value = declaration.slice(separator + 1).trim();
  const cssProperty = CUSTOM_FIELD_CSS_PROPERTIES[property];
  if (
    !cssProperty ||
    !value ||
    value.length > 100 ||
    /[{}\\@;]/.test(value) ||
    /\b(?:url|expression|var|attr|javascript)\s*\(/i.test(value) ||
    !/^[#a-zA-Z0-9\s.,()%+-]+$/.test(value)
  ) return null;
  return { property: cssProperty, value };
}

/** Parse a constrained set of declaration-only CSS into safe inline field styles. */
export function parseCustomFieldCss(css: string | undefined): CSSProperties {
  const styles: CSSProperties = {};
  if (!css) return styles;
  for (const declaration of css.split(";")) {
    if (!declaration.trim()) continue;
    const parsed = safeCustomFieldCssDeclaration(declaration);
    if (parsed) (styles as Record<string, string>)[parsed.property] = parsed.value;
  }
  return styles;
}

export function isCustomFieldCssValid(css: string | undefined): boolean {
  if (!css) return true;
  if (css.length > 1000) return false;
  return css.split(";").every((declaration) =>
    !declaration.trim() || safeCustomFieldCssDeclaration(declaration) !== null);
}

export function reorderCustomFormFields(fields: CustomFormField[], from: number, to: number): CustomFormField[] {
  if (from < 0 || from >= fields.length || to < 0 || to >= fields.length || from === to) return fields;
  const reordered = [...fields];
  const [field] = reordered.splice(from, 1);
  reordered.splice(to, 0, field);
  return reordered;
}

export function normalizeCustomFormSettings(value: unknown): CustomFormSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawLeadFields = raw.leadFields && typeof raw.leadFields === "object"
    ? raw.leadFields as Record<string, unknown>
    : {};
  const leadFields: CustomFormSettings["leadFields"] = {};
  for (const key of ["firstName", "lastName", "email", "phone", "message"] as const) {
    if (typeof rawLeadFields[key] === "string") leadFields[key] = rawLeadFields[key] as string;
  }
  return {
    ...DEFAULT_CUSTOM_FORM_SETTINGS,
    notifyTo: Array.isArray(raw.notifyTo) ? raw.notifyTo.filter((v): v is string => typeof v === "string") : [],
    from: typeof raw.from === "string" ? raw.from : "",
    subject: typeof raw.subject === "string" ? raw.subject : DEFAULT_CUSTOM_FORM_SETTINGS.subject,
    body: typeof raw.body === "string" ? raw.body : DEFAULT_CUSTOM_FORM_SETTINGS.body,
    confirmationEnabled: raw.confirmationEnabled === true,
    confirmationEmailField: typeof raw.confirmationEmailField === "string" ? raw.confirmationEmailField : "",
    confirmationSubject: typeof raw.confirmationSubject === "string" ? raw.confirmationSubject : DEFAULT_CUSTOM_FORM_SETTINGS.confirmationSubject,
    confirmationBody: typeof raw.confirmationBody === "string" ? raw.confirmationBody : DEFAULT_CUSTOM_FORM_SETTINGS.confirmationBody,
    createLead: raw.createLead === true,
    leadFields,
  };
}

export function validateCustomFormFields(value: unknown): { fields?: CustomFormField[]; error?: string } {
  const fields = normalizeCustomFormFields(value);
  if (!Array.isArray(value) || fields.length !== value.length) return { error: "Every form field needs a label and valid type." };
  if (!fields.length) return { error: "Add at least one field." };
  if (fields.length > 40) return { error: "A form can have at most 40 fields." };
  const keys = new Set<string>();
  for (const field of fields) {
    if (!/^[a-z][a-z0-9_]{0,49}$/.test(field.key)) return { error: `Invalid field key: ${field.key}` };
    if (keys.has(field.key)) return { error: `Field keys must be unique: ${field.key}` };
    keys.add(field.key);
    if (!field.label.trim() || field.label.length > 120) return { error: "Field labels must be between 1 and 120 characters." };
    if (field.width !== "full" && field.width !== "half") return { error: `Invalid layout width for "${field.label}".` };
    if ((field.placeholder?.length ?? 0) > 200 || (field.helpText?.length ?? 0) > 500 || (field.customCss?.length ?? 0) > 1000) {
      return { error: `Settings for "${field.label}" exceed the allowed length.` };
    }
    if (!isCustomFieldCssValid(field.customCss)) {
      return { error: `Custom CSS for "${field.label}" contains an unsupported property or value.` };
    }
    if (field.type === "select" && (!field.options?.length || field.options.length > 50 || field.options.some((option) => option.length > 120))) {
      return { error: `Select field "${field.label}" needs 1-50 options, each no longer than 120 characters.` };
    }
  }
  return { fields };
}

export function validateSubmission(fields: CustomFormField[], values: unknown): { data?: Record<string, string | boolean>; error?: string } {
  if (!values || typeof values !== "object" || Array.isArray(values)) return { error: "Invalid form submission." };
  const input = values as Record<string, unknown>;
  const data: Record<string, string | boolean> = {};
  for (const field of fields) {
    const value = input[field.key];
    if (field.type === "checkbox") {
      const checked = value === true || value === "true" || value === "on";
      if (field.required && !checked) return { error: `${field.label} is required.` };
      data[field.key] = checked;
      continue;
    }
    const text = typeof value === "string" ? value.trim().slice(0, 4000) : "";
    if (field.required && !text) return { error: `${field.label} is required.` };
    if (field.type === "email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { error: `Enter a valid ${field.label.toLowerCase()}.` };
    if (field.type === "select" && text && !field.options?.includes(text)) return { error: `Invalid selection for ${field.label}.` };
    data[field.key] = text;
  }
  return { data };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}
import type { CSSProperties } from "react";
