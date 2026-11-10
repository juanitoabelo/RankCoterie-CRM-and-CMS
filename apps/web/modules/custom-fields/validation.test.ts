import { describe, expect, it } from "vitest";
import { expandCloneFields, parseDefinitions, validateFieldValues, validateFieldValue } from "./validation";
import type { CustomFieldDefinition } from "./types";

function field(overrides: Partial<CustomFieldDefinition> & Pick<CustomFieldDefinition, "key" | "type">): CustomFieldDefinition {
  return {
    label: overrides.label ?? overrides.key,
    required: false,
    options: [],
    ...overrides,
  } as CustomFieldDefinition;
}

describe("parseDefinitions", () => {
  it("rejects non-arrays and empty lists", () => {
    expect(parseDefinitions("nope").ok).toBe(false);
    expect(parseDefinitions([]).ok).toBe(false);
  });

  it("parses basic fields", () => {
    const result = parseDefinitions([
      { key: "subtitle", label: "Subtitle", type: "text", required: true },
      { key: "rating", label: "Rating", type: "range", min: 0, max: 5, step: 0.5 },
      { key: "bio", label: "Bio", type: "wysiwyg" },
      { key: "avatar", label: "Avatar", type: "image" },
      { key: "featured", label: "Featured", type: "true_false" },
      { key: "tags", label: "Tags", type: "checkbox", options: ["news", "ops"] },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields).toHaveLength(6);
    expect(result.fields[1].min).toBe(0);
    expect(result.fields[1].max).toBe(5);
    expect(result.fields[4].type).toBe("true_false");
    expect(result.fields[5].options).toEqual(["news", "ops"]);
  });

  it("requires options for choice types", () => {
    expect(parseDefinitions([{ key: "size", label: "Size", type: "select", options: [] }]).ok).toBe(false);
    expect(parseDefinitions([{ key: "size", label: "Size", type: "select", options: ["S", "M"] }]).ok).toBe(true);
  });

  it("parses relational fields with source and multiple", () => {
    const result = parseDefinitions([
      { key: "related", label: "Related", type: "relationship", source: "listing", multiple: true },
      { key: "owner", label: "Owner", type: "user" },
      { key: "home", label: "Home", type: "page_link" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields[0].source).toBe("listing");
    expect(result.fields[0].multiple).toBe(true);
    expect(result.fields[1].type).toBe("user");
    expect(result.fields[2].type).toBe("page_link");
  });

  it("parses group and repeater sub-fields", () => {
    const result = parseDefinitions([
      {
        key: "hero",
        label: "Hero",
        type: "group",
        subFields: [
          { key: "heading", label: "Heading", type: "text" },
          { key: "image", label: "Image", type: "image" },
        ],
      },
      {
        key: "team",
        label: "Team",
        type: "repeater",
        subFields: [
          { key: "name", label: "Name", type: "text", required: true },
          { key: "role", label: "Role", type: "text" },
        ],
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields[0].subFields).toHaveLength(2);
    expect(result.fields[1].subFields).toHaveLength(2);
  });

  it("rejects repeater without sub-fields", () => {
    const result = parseDefinitions([{ key: "rows", label: "Rows", type: "repeater", subFields: [] }]);
    expect(result.ok).toBe(false);
  });

  it("parses flexible content layouts", () => {
    const result = parseDefinitions([
      {
        key: "blocks",
        label: "Blocks",
        type: "flexible_content",
        layouts: [
          { key: "text_block", label: "Text", subFields: [{ key: "body", label: "Body", type: "textarea" }] },
          { key: "cta_block", label: "CTA", subFields: [{ key: "url", label: "URL", type: "url" }] },
        ],
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields[0].layouts).toHaveLength(2);
  });

  it("requires clone group id", () => {
    expect(parseDefinitions([{ key: "embed", label: "Embed", type: "clone" }]).ok).toBe(false);
    expect(parseDefinitions([{ key: "embed", label: "Embed", type: "clone", cloneGroupId: "abc" }]).ok).toBe(true);
  });

  it("rejects duplicate keys", () => {
    const result = parseDefinitions([
      { key: "a", label: "A", type: "text" },
      { key: "a", label: "A2", type: "text" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("parses layout-only message fields", () => {
    const result = parseDefinitions([{ key: "note", label: "Note", type: "message", message: "Hello" }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields[0].message).toBe("Hello");
  });
});

describe("validateFieldValue", () => {
  it("validates required empty values", () => {
    expect(validateFieldValue(field({ key: "t", type: "text", required: true }), "")).toMatch(/required/);
    expect(validateFieldValue(field({ key: "t", type: "text", required: true }), "hi")).toBeNull();
  });

  it("validates email and url", () => {
    expect(validateFieldValue(field({ key: "e", type: "email" }), "nope")).toMatch(/valid email/);
    expect(validateFieldValue(field({ key: "e", type: "email" }), "a@b.co")).toBeNull();
    expect(validateFieldValue(field({ key: "u", type: "url" }), "notaurl")).toMatch(/valid URL/);
    expect(validateFieldValue(field({ key: "u", type: "url" }), "https://x.com")).toBeNull();
  });

  it("validates choice options", () => {
    const f = field({ key: "s", type: "select", options: ["a", "b"] });
    expect(validateFieldValue(f, "c")).toMatch(/valid option/);
    expect(validateFieldValue(f, "a")).toBeNull();
  });

  it("validates true_false as boolean", () => {
    const f = field({ key: "tf", type: "true_false" });
    expect(validateFieldValue(f, "yes")).toMatch(/checked or unchecked/);
    expect(validateFieldValue(f, true)).toBeNull();
  });

  it("validates checkbox as multi-choice array (ACF)", () => {
    const f = field({ key: "cb", type: "checkbox", options: ["a", "b"] });
    expect(validateFieldValue(f, true)).toMatch(/list of selections/);
    expect(validateFieldValue(f, ["a", "z"])).toMatch(/valid options/);
    expect(validateFieldValue(f, ["a", "b"])).toBeNull();
  });

  it("validates multiselect arrays", () => {
    const f = field({ key: "m", type: "multiselect", options: ["a", "b"] });
    expect(validateFieldValue(f, ["a", "z"])).toMatch(/valid options/);
    expect(validateFieldValue(f, ["a", "b"])).toBeNull();
  });

  it("validates link objects", () => {
    const f = field({ key: "l", type: "link" });
    expect(validateFieldValue(f, { url: "bad", title: "T" })).toMatch(/valid URL/);
    expect(validateFieldValue(f, { url: "https://x.com", title: "T", target: "_blank" })).toBeNull();
  });

  it("validates gallery arrays", () => {
    const f = field({ key: "g", type: "gallery" });
    expect(validateFieldValue(f, ["a1", "b2"])).toBeNull();
    expect(validateFieldValue(f, "nope")).toMatch(/list of media/);
  });

  it("validates group nested values", () => {
    const f = field({
      key: "hero",
      type: "group",
      required: true,
      subFields: [field({ key: "heading", type: "text", required: true })],
    });
    expect(validateFieldValue(f, {})).toMatch(/required/);
    expect(validateFieldValue(f, { heading: "Hi" })).toBeNull();
  });

  it("validates repeater rows", () => {
    const f = field({
      key: "rows",
      type: "repeater",
      subFields: [field({ key: "name", type: "text", required: true })],
    });
    expect(validateFieldValue(f, [{ name: "" }])).toMatch(/required/);
    expect(validateFieldValue(f, [{ name: "A" }, { name: "B" }])).toBeNull();
  });

  it("validates flexible content layouts", () => {
    const f = field({
      key: "blocks",
      type: "flexible_content",
      layouts: [
        { key: "text_block", label: "Text", subFields: [field({ key: "body", type: "textarea" })] },
      ],
    });
    expect(validateFieldValue(f, [{ layout: "unknown", values: {} }])).toMatch(/unknown layout/);
    expect(validateFieldValue(f, [{ layout: "text_block", values: { body: "Hi" } }])).toBeNull();
  });

  it("validates relational multi vs single", () => {
    const single = field({ key: "p", type: "page_link" });
    const multi = field({ key: "ps", type: "relationship", multiple: true });
    expect(validateFieldValue(single, ["id1"])).toMatch(/must be a reference/);
    expect(validateFieldValue(single, "id1")).toBeNull();
    expect(validateFieldValue(multi, "id1")).toMatch(/list of references/);
    expect(validateFieldValue(multi, ["id1"])).toBeNull();
  });

  it("skips layout-only types", () => {
    expect(validateFieldValue(field({ key: "m", type: "message" }), undefined)).toBeNull();
    expect(validateFieldValue(field({ key: "t", type: "tab" }), undefined)).toBeNull();
  });
});

describe("validateFieldValues + expandCloneFields", () => {
  it("validates a bag of values", () => {
    const fields = [
      field({ key: "title", type: "text", required: true }),
      field({ key: "count", type: "number" }),
    ];
    expect(validateFieldValues(fields, { title: "", count: 1 })).toMatch(/required/);
    expect(validateFieldValues(fields, { title: "Hi", count: "x" })).toMatch(/must be a number/);
    expect(validateFieldValues(fields, { title: "Hi", count: "3" })).toBeNull();
  });

  it("expands clone fields once", () => {
    const shared = [field({ key: "seo_note", type: "text" })];
    const fields: CustomFieldDefinition[] = [
      field({ key: "local", type: "text" }),
      field({ key: "embed", type: "clone", cloneGroupId: "g1" }),
      field({ key: "embed2", type: "clone", cloneGroupId: "g1" }),
    ];
    const expanded = expandCloneFields(fields, (id) => (id === "g1" ? shared : null));
    expect(expanded.map((item) => item.key)).toEqual(["local", "seo_note"]);
  });
});
