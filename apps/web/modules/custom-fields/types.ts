export const CONTENT_TYPES = [
  { value: "page", label: "Page" },
  { value: "product", label: "Product" },
  { value: "article", label: "Article / Post" },
  { value: "topic", label: "Topic" },
  { value: "subtopic", label: "Sub Topic" },
  { value: "geo-category", label: "Geo Category" },
  { value: "listing", label: "Listing" },
  { value: "company-listing", label: "Company Listing" },
  { value: "lead", label: "Lead" },
  { value: "client", label: "Client" },
  { value: "company", label: "Company Profile" },
  { value: "region", label: "Region" },
  { value: "section", label: "Section" },
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number]["value"];

/** ACF-style field type catalog, grouped for the field-group builder. */
export const FIELD_TYPE_CATEGORIES = [
  {
    value: "basic",
    label: "Basic",
    types: ["text", "textarea", "number", "range", "email", "url", "password", "date"],
  },
  {
    value: "content",
    label: "Content",
    types: ["image", "file", "wysiwyg", "oembed"],
  },
  {
    value: "choice",
    label: "Choice",
    types: ["select", "multiselect", "checkbox", "radio", "button_group", "true_false"],
  },
  {
    value: "relational",
    label: "Relational",
    types: ["link", "post_object", "page_link", "relationship", "taxonomy", "user"],
  },
  {
    value: "layout",
    label: "Layout",
    types: ["message", "tab", "accordion", "group"],
  },
  {
    value: "pro",
    label: "PRO",
    types: ["repeater", "flexible_content", "gallery", "clone"],
  },
] as const;

export const FIELD_TYPES = FIELD_TYPE_CATEGORIES.flatMap((category) => [...category.types]) as readonly string[];

export type CustomFieldType = (typeof FIELD_TYPE_CATEGORIES)[number]["types"][number];

/** Human-readable labels for every field type (shown in pickers and the catalog). */
export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  textarea: "Textarea",
  number: "Number",
  range: "Range (slider)",
  email: "Email",
  url: "URL",
  password: "Password",
  date: "Date",
  image: "Image",
  file: "File",
  wysiwyg: "WYSIWYG / Rich text",
  oembed: "oEmbed (video)",
  select: "Select (dropdown)",
  multiselect: "Multi select",
  checkbox: "Checkbox (multi)",
  radio: "Radio buttons",
  button_group: "Button group",
  true_false: "True / False",
  link: "Link",
  post_object: "Post object",
  page_link: "Page link",
  relationship: "Relationship",
  taxonomy: "Taxonomy / Category",
  user: "User",
  message: "Message (HTML)",
  tab: "Tab",
  accordion: "Accordion",
  group: "Group (nested)",
  repeater: "Repeater (rows)",
  flexible_content: "Flexible content",
  gallery: "Gallery",
  clone: "Clone field group",
};

export function fieldTypeLabel(type: string): string {
  return FIELD_TYPE_LABELS[type as CustomFieldType] ?? type;
}

/** Layout-only types store no value. */
export const LAYOUT_ONLY_TYPES = ["message", "tab", "accordion"] as const satisfies readonly CustomFieldType[];

export type RelationalSource = "page" | "article" | "category" | "listing" | "user" | "custom_post";

export const RELATIONAL_SOURCES = [
  { value: "page", label: "Pages" },
  { value: "article", label: "Articles" },
  { value: "category", label: "Categories" },
  { value: "listing", label: "Listings" },
  { value: "user", label: "Users" },
  { value: "custom_post", label: "Custom Posts" },
] as const satisfies readonly { value: RelationalSource; label: string }[];

export type RelationalFieldType = "link" | "post_object" | "page_link" | "relationship" | "taxonomy" | "user";

export type FlexibleLayout = {
  key: string;
  label: string;
  subFields: CustomFieldDefinition[];
};

export type CustomFieldDefinition = {
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
  /** Optional helper text shown under the label. */
  instructions?: string;
  /** message type body (plain text / simple HTML). */
  message?: string;
  /** number / range constraints. */
  min?: number;
  max?: number;
  step?: number;
  /** relational source (defaults per type when omitted). */
  source?: RelationalSource;
  /** allow multi-select for relational types. */
  multiple?: boolean;
  /** group / repeater sub-fields. */
  subFields?: CustomFieldDefinition[];
  /** flexible_content layouts. */
  layouts?: FlexibleLayout[];
  /** clone — id of another field group to embed. */
  cloneGroupId?: string;
};

export type CustomFieldGroupData = {
  id: string;
  name: string;
  description: string | null;
  contentTypes: string[];
  fields: CustomFieldDefinition[];
  updatedAt: Date;
};

export type CustomPostTypeData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coreFields: string[];
  fieldGroupIds: string[];
  _count: { posts: number };
};

export type RelationOption = { id: string; label: string };

export function isLayoutOnlyType(type: CustomFieldType): boolean {
  return (LAYOUT_ONLY_TYPES as readonly string[]).includes(type);
}

export function hasSubFields(type: CustomFieldType): type is "group" | "repeater" {
  return type === "group" || type === "repeater";
}

export function isChoiceType(type: CustomFieldType): boolean {
  return type === "select" || type === "multiselect" || type === "checkbox" || type === "radio" || type === "button_group";
}

export function isRelationalType(type: CustomFieldType): type is RelationalFieldType {
  return type === "link" || type === "post_object" || type === "page_link" || type === "relationship" || type === "taxonomy" || type === "user";
}

/** Default relational source when the field does not specify one. */
export function defaultSourceFor(type: CustomFieldType): RelationalSource | null {
  switch (type) {
    case "page_link":
      return "page";
    case "taxonomy":
      return "category";
    case "user":
      return "user";
    case "post_object":
    case "relationship":
      return "article";
    default:
      return null;
  }
}

export function sourceForField(field: CustomFieldDefinition): RelationalSource | null {
  return field.source ?? defaultSourceFor(field.type);
}
