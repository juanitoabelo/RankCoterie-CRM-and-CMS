"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import {
  CONTENT_TYPES,
  type ContentType,
  type CustomFieldDefinition,
  type RelationOption,
  type RelationalSource,
} from "@/modules/custom-fields/types";
import {
  expandCloneFields,
  parseDefinitions,
  validateFieldValues,
} from "@/modules/custom-fields/validation";

export type CustomFieldsActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const SECTION_BY_CONTENT_TYPE: Record<ContentType, string> = {
  page: "pages",
  product: "products",
  article: "articles",
  topic: "topics",
  subtopic: "templates",
  "geo-category": "categories",
  listing: "listings",
  "company-listing": "listings",
  lead: "leads",
  client: "clients",
  company: "myCompany",
  region: "regions",
  section: "sections",
};

function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.some((item) => item.value === value);
}

function parseStoredFields(raw: unknown): CustomFieldDefinition[] {
  const result = parseDefinitions(Array.isArray(raw) ? raw : []);
  if (!result.ok) {
    // Stored definitions may predate stricter validation — fall back to a loose parse.
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const key = typeof row.key === "string" ? row.key.trim() : "";
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const type = typeof row.type === "string" ? row.type : "";
      if (!key || !label || !type) return [];
      return [{
        key,
        label,
        type: type as CustomFieldDefinition["type"],
        required: row.required === true,
        options: Array.isArray(row.options)
          ? row.options.filter((option): option is string => typeof option === "string")
          : [],
        ...(typeof row.message === "string" ? { message: row.message } : {}),
        ...(typeof row.instructions === "string" ? { instructions: row.instructions } : {}),
        ...(typeof row.source === "string" ? { source: row.source as RelationalSource } : {}),
        ...(row.multiple !== undefined ? { multiple: row.multiple === true } : {}),
        ...(Array.isArray(row.subFields) ? { subFields: row.subFields as CustomFieldDefinition[] } : {}),
        ...(Array.isArray(row.layouts) ? { layouts: row.layouts as CustomFieldDefinition["layouts"] } : {}),
        ...(typeof row.cloneGroupId === "string" ? { cloneGroupId: row.cloneGroupId } : {}),
        ...(typeof row.min === "number" ? { min: row.min } : {}),
        ...(typeof row.max === "number" ? { max: row.max } : {}),
        ...(typeof row.step === "number" ? { step: row.step } : {}),
      }];
    });
  }
  return result.fields;
}

async function loadCloneMap(): Promise<Map<string, CustomFieldDefinition[]>> {
  const groups = await prisma.customFieldGroup.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, fields: true },
  });
  return new Map(groups.map((group) => [group.id, parseStoredFields(group.fields)]));
}

type ParseGroupResult =
  | { error: string }
  | {
      name: string;
      description: string | null;
      /** Built-in content type values and/or custom post type slugs. */
      contentTypes: string[];
      definitions: CustomFieldDefinition[];
    };

function parseGroupInput(formData: FormData): ParseGroupResult {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const contentTypes = Array.from(new Set(formData.getAll("contentTypes").map(String)))
    .map((value) => value.trim())
    .filter(Boolean);
  let definitions: CustomFieldDefinition[];
  try {
    const rawFields: unknown = JSON.parse(String(formData.get("fields") ?? "[]"));
    const parsed = parseDefinitions(rawFields);
    if (!parsed.ok) return { error: parsed.error };
    definitions = parsed.fields;
  } catch {
    return { error: "Field definitions must be valid JSON." };
  }
  if (!name) return { error: "Field group name is required." };
  if (contentTypes.length === 0) return { error: "Assign this field group to at least one content type." };
  if (definitions.length === 0) return { error: "Add at least one valid custom field." };

  // Clone fields must reference an existing group (checked below async — collect ids).
  return { name, description, contentTypes, definitions };
}

/** Validate that every content type is a built-in type or an existing CPT slug. */
async function validateContentTypes(contentTypes: string[]): Promise<string | null> {
  const unknown = contentTypes.filter((value) => !isContentType(value));
  if (unknown.length === 0) return null;
  const cpts = await prisma.customPostType.findMany({
    where: { tenantId: TENANT_ID, slug: { in: unknown } },
    select: { slug: true },
  });
  const known = new Set(cpts.map((cpt) => cpt.slug));
  const missing = unknown.filter((slug) => !known.has(slug));
  if (missing.length > 0) {
    return `Unknown content type${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`;
  }
  return null;
}

/**
 * Keep CustomPostType.fieldGroupIds in sync with field-group contentTypes
 * that reference this group's custom post type slugs.
 */
async function syncCptFieldGroupLinks(groupId: string, contentTypes: string[]): Promise<void> {
  const postTypes = await prisma.customPostType.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, slug: true, fieldGroupIds: true },
  });
  for (const postType of postTypes) {
    const shouldLink = contentTypes.includes(postType.slug);
    const isLinked = postType.fieldGroupIds.includes(groupId);
    if (shouldLink && !isLinked) {
      await prisma.customPostType.update({
        where: { id: postType.id },
        data: { fieldGroupIds: { push: groupId } },
      });
    } else if (!shouldLink && isLinked) {
      await prisma.customPostType.update({
        where: { id: postType.id },
        data: { fieldGroupIds: postType.fieldGroupIds.filter((id) => id !== groupId) },
      });
    }
  }
}

async function validateClones(definitions: CustomFieldDefinition[]): Promise<string | null> {
  const cloneIds = definitions
    .filter((field) => field.type === "clone" && field.cloneGroupId)
    .map((field) => field.cloneGroupId as string);
  if (cloneIds.length === 0) return null;
  const found = await prisma.customFieldGroup.findMany({
    where: { tenantId: TENANT_ID, id: { in: cloneIds } },
    select: { id: true },
  });
  if (found.length !== new Set(cloneIds).size) {
    return "One or more cloned field groups are unavailable.";
  }
  return null;
}

export async function listCustomFieldAdminData() {
  await requireSection("general");
  const [groups, postTypes, templates] = await Promise.all([
    prisma.customFieldGroup.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma.customPostType.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      include: { _count: { select: { posts: true } } },
    }),
    prisma.blogTemplate.findMany({
      where: { tenantId: TENANT_ID, type: "single" },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, customPostTypeId: true },
    }),
  ]);
  return {
    groups: groups.map((group) => ({
      ...group,
      fields: parseStoredFields(group.fields),
    })),
    postTypes,
    templates,
  };
}

export async function saveCustomFieldGroup(formData: FormData): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const input = parseGroupInput(formData);
  if ("error" in input) return { ok: false, error: input.error };
  const id = String(formData.get("id") ?? "").trim();
  try {
    const contentTypeError = await validateContentTypes(input.contentTypes);
    if (contentTypeError) return { ok: false, error: contentTypeError };
    const cloneError = await validateClones(input.definitions);
    if (cloneError) return { ok: false, error: cloneError };

    const overlappingGroups = await prisma.customFieldGroup.findMany({
      where: {
        tenantId: TENANT_ID,
        ...(id ? { id: { not: id } } : {}),
        contentTypes: { hasSome: input.contentTypes },
      },
      select: { name: true, fields: true },
    });
    const proposedKeys = new Set(collectTopLevelKeys(input.definitions));
    for (const group of overlappingGroups) {
      const duplicate = parseStoredFields(group.fields).find((field) => proposedKeys.has(field.key));
      if (duplicate) {
        return { ok: false, error: `Field key "${duplicate.key}" is already used in "${group.name}" for an assigned content type.` };
      }
    }
    const group = id
      ? await prisma.customFieldGroup.updateMany({
          where: { id, tenantId: TENANT_ID },
          data: {
            name: input.name,
            description: input.description,
            contentTypes: input.contentTypes,
            fields: input.definitions as unknown as Prisma.InputJsonValue,
          },
        }).then(async (result) => {
          if (!result.count) throw new Error("Field group not found.");
          return { id };
        })
      : await prisma.customFieldGroup.create({
          data: {
            tenantId: TENANT_ID,
            name: input.name,
            description: input.description,
            contentTypes: input.contentTypes,
            fields: input.definitions as unknown as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
    await syncCptFieldGroupLinks(group.id, input.contentTypes);
    revalidatePath("/admin/custom-fields");
    revalidatePath("/admin/custom-post-types");
    return { ok: true, id: group.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save field group." };
  }
}

function collectTopLevelKeys(fields: CustomFieldDefinition[]): string[] {
  return fields
    .filter((field) => field.type !== "message" && field.type !== "tab" && field.type !== "accordion")
    .map((field) => field.key);
}

export async function deleteCustomFieldGroup(id: string): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const usage = await prisma.customPostType.findFirst({
    where: { tenantId: TENANT_ID, fieldGroupIds: { has: id } },
    select: { name: true },
  });
  if (usage) return { ok: false, error: `Remove this group from custom post type "${usage.name}" before deleting it.` };
  const cloneUsage = await prisma.customFieldGroup.findFirst({
    where: { tenantId: TENANT_ID, id: { not: id } },
    select: { id: true, name: true, fields: true },
  });
  if (cloneUsage) {
    const clones = parseStoredFields(cloneUsage.fields).filter((field) => field.type === "clone" && field.cloneGroupId === id);
    if (clones.length > 0) {
      return { ok: false, error: `Remove this group from clone field "${clones[0].label}" in "${cloneUsage.name}" before deleting it.` };
    }
  }
  try {
    const result = await prisma.customFieldGroup.deleteMany({ where: { id, tenantId: TENANT_ID } });
    if (!result.count) return { ok: false, error: "Field group not found." };
    revalidatePath("/admin/custom-fields");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete field group." };
  }
}

export async function saveCustomPostType(formData: FormData): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const rawSlug = String(formData.get("slug") ?? "").trim() || name;
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const CORE_FIELD_WHITELIST = [
    "title",
    "slug",
    "excerpt",
    "body",
    "status",
    "featuredImage",
    "category",
    "template",
    "seo",
    "author",
    "comments",
    "revisions",
  ];
  const coreFields = Array.from(new Set(formData.getAll("coreFields").map(String)))
    .filter((field) => CORE_FIELD_WHITELIST.includes(field));
  const fieldGroupIds = Array.from(new Set(formData.getAll("fieldGroupIds").map(String).filter(Boolean)));
  const singularLabel = String(formData.get("singularLabel") ?? "").trim() || name;
  const pluralLabel = String(formData.get("pluralLabel") ?? "").trim() || `${name}s`;
  const addNewLabel = String(formData.get("addNewLabel") ?? "").trim() || `Add New ${singularLabel}`;
  const archivesLabel = String(formData.get("archivesLabel") ?? "").trim() || `${pluralLabel} Archives`;
  const parentLabel = String(formData.get("parentLabel") ?? "").trim() || `Parent ${singularLabel}`;
  const rewriteInput = String(formData.get("rewriteSlug") ?? "").trim() || slug;
  const rewriteSlug = slugify(rewriteInput);
  const isPublic = formData.get("isPublic") === "on";
  const hasArchive = formData.get("hasArchive") === "on";
  const hierarchical = formData.get("hierarchical") === "on";
  const showInRest = formData.get("showInRest") === "on";
  const defaultTemplateId = String(formData.get("defaultTemplateId") ?? "").trim() || null;
  if (!name || !slug) return { ok: false, error: "Name and slug are required." };
  if (!rewriteSlug) return { ok: false, error: "A valid rewrite slug is required." };
  if (CONTENT_TYPES.some((type) => type.value === slug)) {
    return { ok: false, error: `The slug "${slug}" is reserved for a built-in content type.` };
  }
  const reservedPaths = new Set([
    "admin", "api", "apply", "article", "blog", "cart", "checkout", "claim", "company",
    "custom-post", "g", "landingpage", "listing", "orders", "pay", "subtopic", "topic",
    "upgrade", "wishlist",
  ]);
  if (reservedPaths.has(slug) || reservedPaths.has(rewriteSlug)) {
    return { ok: false, error: "The post type slug conflicts with a reserved site route." };
  }
  const pathSlugs = [...new Set([slug, rewriteSlug])];
  const [routeConflict, productConflict, pageConflict] = await Promise.all([
    prisma.customPostType.findFirst({
      where: {
        tenantId: TENANT_ID,
        ...(id ? { id: { not: id } } : {}),
        OR: [{ slug: { in: pathSlugs } }, { rewriteSlug: { in: pathSlugs } }],
      },
      select: { slug: true, rewriteSlug: true },
    }),
    prisma.product.findFirst({ where: { slug: { in: pathSlugs } }, select: { slug: true } }),
    prisma.page.findFirst({ where: { tenantId: TENANT_ID, slug: { in: pathSlugs } }, select: { slug: true } }),
  ]);
  if (routeConflict || productConflict || pageConflict) {
    return { ok: false, error: "The post type or rewrite slug is already used by another public route." };
  }
  if (!isPublic && hasArchive) return { ok: false, error: "A private custom post type cannot expose a public archive." };
  if (!coreFields.includes("title")) return { ok: false, error: "Title must be enabled for every custom post type." };
  if (defaultTemplateId) {
    const template = await prisma.blogTemplate.findFirst({
      where: {
        id: defaultTemplateId,
        tenantId: TENANT_ID,
        type: "single",
        OR: [{ customPostTypeId: id || "__new_custom_post_type__" }, { customPostTypeId: null }],
      },
      select: { id: true },
    });
    if (!template) return { ok: false, error: "The selected single template is not assigned to this custom post type." };
  }
  if (fieldGroupIds.length) {
    const validGroups = await prisma.customFieldGroup.findMany({
      where: { tenantId: TENANT_ID, id: { in: fieldGroupIds } },
      select: { id: true },
    });
    if (validGroups.length !== fieldGroupIds.length) return { ok: false, error: "One or more selected field groups are unavailable." };
    const selectedGroups = await prisma.customFieldGroup.findMany({
      where: { tenantId: TENANT_ID, id: { in: fieldGroupIds } },
      select: { name: true, fields: true },
    });
    const fieldKeys = new Set<string>();
    for (const group of selectedGroups) {
      for (const field of parseStoredFields(group.fields)) {
        if (field.type === "message" || field.type === "tab" || field.type === "accordion") continue;
        if (fieldKeys.has(field.key)) {
          return { ok: false, error: `Field key "${field.key}" is duplicated in custom post type field groups.` };
        }
        fieldKeys.add(field.key);
      }
    }
  }
  try {
    const row = await prisma.$transaction(async (tx) => {
      const existing = id
        ? await tx.customPostType.findFirst({
            where: { id, tenantId: TENANT_ID },
            select: { id: true, slug: true, rewriteSlug: true },
          })
        : null;
      if (id && !existing) throw new Error("Custom post type not found.");

      const saved = existing
        ? await tx.customPostType.update({
            where: { id: existing.id },
            data: {
              name,
              slug,
              singularLabel,
              pluralLabel,
              addNewLabel,
              archivesLabel,
              parentLabel,
              description,
              isPublic,
              hasArchive,
              hierarchical,
              rewriteSlug,
              showInRest,
              defaultTemplateId,
              coreFields,
              fieldGroupIds,
            },
            select: { id: true },
          })
        : await tx.customPostType.create({
            data: {
              tenantId: TENANT_ID,
              name,
              slug,
              singularLabel,
              pluralLabel,
              addNewLabel,
              archivesLabel,
              parentLabel,
              description,
              isPublic,
              hasArchive,
              hierarchical,
              rewriteSlug,
              showInRest,
              defaultTemplateId,
              coreFields,
              fieldGroupIds,
            },
            select: { id: true },
          });

      const linked = await tx.customFieldGroup.findMany({
        where: { tenantId: TENANT_ID },
        select: { id: true, contentTypes: true },
      });
      for (const group of linked) {
        const nextContentTypes = group.contentTypes.filter(
          (contentType) => contentType !== existing?.slug && contentType !== slug,
        );
        if (fieldGroupIds.includes(group.id)) nextContentTypes.push(slug);
        if (nextContentTypes.length !== group.contentTypes.length
          || nextContentTypes.some((contentType, index) => contentType !== group.contentTypes[index])) {
          await tx.customFieldGroup.update({
            where: { id: group.id },
            data: { contentTypes: nextContentTypes },
          });
        }
      }
      return { saved, previousRewriteSlug: existing?.rewriteSlug ?? null };
    });
    revalidatePath("/admin/custom-fields");
    revalidatePath("/admin/custom-post-types");
    if (row.previousRewriteSlug) revalidatePath(`/${row.previousRewriteSlug}`);
    revalidatePath(`/${rewriteSlug}`);
    revalidatePath(`/${slug}`);
    revalidatePath(`/custom-post/${slug}`);
    return { ok: true, id: row.saved.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save custom post type." };
  }
}

export async function deleteCustomPostType(id: string): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  try {
    const slug = await prisma.$transaction(async (tx) => {
      const postType = await tx.customPostType.findFirst({
        where: { id, tenantId: TENANT_ID },
        select: { slug: true },
      });
      if (!postType) return null;

      const groups = await tx.customFieldGroup.findMany({
        where: { tenantId: TENANT_ID, contentTypes: { has: postType.slug } },
        select: { id: true, contentTypes: true },
      });
      for (const group of groups) {
        await tx.customFieldGroup.update({
          where: { id: group.id },
          data: { contentTypes: group.contentTypes.filter((contentType) => contentType !== postType.slug) },
        });
      }
      await tx.blogTemplate.deleteMany({
        where: { tenantId: TENANT_ID, customPostTypeId: id },
      });
      await tx.customPostType.deleteMany({ where: { id, tenantId: TENANT_ID } });
      return postType.slug;
    });
    if (!slug) return { ok: false, error: "Custom post type not found." };
    revalidatePath("/admin/custom-fields");
    revalidatePath(`/admin/custom-post-types/${id}`);
    revalidatePath(`/${slug}`);
    revalidatePath(`/custom-post/${slug}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete custom post type." };
  }
}

export async function getCustomFieldEditorData(contentType: string, recordId?: string) {
  if (!isContentType(contentType)) throw new Error("Unknown content type.");
  await requireSection(SECTION_BY_CONTENT_TYPE[contentType]);
  const groups = await prisma.customFieldGroup.findMany({
    where: { tenantId: TENANT_ID, contentTypes: { has: contentType } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, fields: true },
  });
  const cloneMap = await loadCloneMap();
  let values: Record<string, unknown> = {};
  if (recordId) {
    const entry = await prisma.customFieldValue.findUnique({
      where: { tenantId_contentType_recordId: { tenantId: TENANT_ID, contentType, recordId } },
      select: { values: true },
    });
    if (entry && typeof entry.values === "object" && entry.values !== null && !Array.isArray(entry.values)) {
      values = entry.values as Record<string, unknown>;
    }
  }
  return {
    groups: await Promise.all(
      groups.map(async (group) => {
        const fields = expandCloneFields(
          parseStoredFields(group.fields),
          (groupId) => cloneMap.get(groupId) ?? null,
        );
        return { id: group.id, name: group.name, fields };
      }),
    ),
    values,
  };
}

async function recordBelongsToTenant(contentType: ContentType, recordId: string): Promise<boolean> {
  switch (contentType) {
    case "page": return Boolean(await prisma.page.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
    case "product": return Boolean(await prisma.product.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
    case "article":
    case "subtopic": return Boolean(await prisma.contentTemplate.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
    case "topic":
    case "geo-category": return Boolean(await prisma.category.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
    case "listing":
    case "company-listing": return Boolean(await prisma.listing.findFirst({
      where: { id: recordId, tenantId: TENANT_ID, isLandingPage: contentType === "company-listing" },
      select: { id: true },
    }));
    case "lead": return Boolean(await prisma.lead.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
    case "client": return Boolean(await prisma.client.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
    case "company": return Boolean(await prisma.company.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
    case "region": return Boolean(await prisma.region.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
    case "section": return Boolean(await prisma.section.findFirst({ where: { id: recordId, tenantId: TENANT_ID }, select: { id: true } }));
  }
}

export async function saveCustomFieldValues(
  contentType: string,
  recordId: string,
  rawValues: string,
): Promise<CustomFieldsActionResult> {
  if (!isContentType(contentType)) return { ok: false, error: "Unknown content type." };
  await requireSection(SECTION_BY_CONTENT_TYPE[contentType]);
  if (!recordId || !(await recordBelongsToTenant(contentType, recordId))) {
    return { ok: false, error: "Content record not found." };
  }
  let submitted: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawValues);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    submitted = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Custom field values are malformed." };
  }
  const groups = await prisma.customFieldGroup.findMany({
    where: { tenantId: TENANT_ID, contentTypes: { has: contentType } },
    select: { fields: true },
  });
  const cloneMap = await loadCloneMap();
  const definitions = groups.flatMap((group) =>
    expandCloneFields(parseStoredFields(group.fields), (groupId) => cloneMap.get(groupId) ?? null),
  );
  if (definitions.length === 0) return { ok: true };

  const validationError = validateFieldValues(definitions, submitted);
  if (validationError) return { ok: false, error: validationError };

  // Persist only known top-level keys (skip layout-only / clone shells).
  const values: Record<string, unknown> = {};
  const knownKeys = new Set(
    definitions
      .filter((field) => field.type !== "message" && field.type !== "tab" && field.type !== "accordion" && field.type !== "clone")
      .map((field) => field.key),
  );
  for (const [key, value] of Object.entries(submitted)) {
    if (knownKeys.has(key)) values[key] = value;
  }

  try {
    await prisma.customFieldValue.upsert({
      where: { tenantId_contentType_recordId: { tenantId: TENANT_ID, contentType, recordId } },
      create: { tenantId: TENANT_ID, contentType, recordId, values: values as Prisma.InputJsonValue },
      update: { values: values as Prisma.InputJsonValue },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save custom field values." };
  }
}

export async function getCustomPostTypeData(id: string) {
  await requireSection("general");
  return prisma.customPostType.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      posts: { orderBy: [{ updatedAt: "desc" }, { id: "asc" }] },
    },
  });
}

export async function createCustomPostTerm(
  typeId: string,
  formData: FormData,
): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
  if (!name || !slug) return { ok: false, error: "Category name and slug are required." };
  const postType = await prisma.customPostType.findFirst({
    where: { id: typeId, tenantId: TENANT_ID },
    select: { id: true, slug: true, rewriteSlug: true, coreFields: true },
  });
  if (!postType) return { ok: false, error: "Custom post type not found." };
  if (!postType.coreFields.includes("category")) {
    return { ok: false, error: "Enable Categories in the custom post type's built-in fields first." };
  }
  try {
    const existing = await prisma.customPostTerm.findFirst({
      where: { tenantId: TENANT_ID, postTypeId: typeId, taxonomy: "category", slug },
      select: { id: true },
    });
    if (existing) return { ok: false, error: "A category with that slug already exists for this custom post type." };
    await prisma.customPostTerm.create({
      data: { tenantId: TENANT_ID, postTypeId: typeId, taxonomy: "category", name, slug },
    });
    revalidatePath(`/admin/custom-post-types/${typeId}`);
    revalidatePath(`/${postType.rewriteSlug || postType.slug}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create category." };
  }
}

export async function deleteCustomPostTerm(typeId: string, termId: string): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const postType = await prisma.customPostType.findFirst({
    where: { id: typeId, tenantId: TENANT_ID },
    select: { slug: true, rewriteSlug: true },
  });
  if (!postType) return { ok: false, error: "Custom post type not found." };
  try {
    const result = await prisma.customPostTerm.deleteMany({
      where: { id: termId, tenantId: TENANT_ID, postTypeId: typeId, taxonomy: "category" },
    });
    if (!result.count) return { ok: false, error: "Category not found for this custom post type." };
    revalidatePath(`/admin/custom-post-types/${typeId}`);
    revalidatePath(`/${postType.rewriteSlug || postType.slug}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete category." };
  }
}

export async function getCustomPostEditorData(typeId: string, postId?: string) {
  await requireSection("general");
  const postType = await prisma.customPostType.findFirst({
    where: { id: typeId, tenantId: TENANT_ID },
  });
  if (!postType) return null;
  // Load via fieldGroupIds and via field groups assigned to this CPT slug.
  const groups = await prisma.customFieldGroup.findMany({
    where: {
      tenantId: TENANT_ID,
      OR: [
        { id: { in: postType.fieldGroupIds } },
        { contentTypes: { has: postType.slug } },
      ],
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, fields: true },
  });
  const cloneMap = await loadCloneMap();
  const post = postId
    ? await prisma.customPost.findFirst({ where: { id: postId, postTypeId: typeId, tenantId: TENANT_ID } })
    : null;
  if (postId && !post) return null;
  const values = post?.values && typeof post.values === "object" && !Array.isArray(post.values)
    ? post.values as Record<string, unknown>
    : {};
  const core = postType.coreFields;
  const [categories, templates, authors] = await Promise.all([
    core.includes("category")
      ? prisma.customPostTerm.findMany({
          where: { tenantId: TENANT_ID, postTypeId: typeId, taxonomy: "category" },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    core.includes("template")
      ? prisma.blogTemplate.findMany({
          where: { tenantId: TENANT_ID, type: "single" },
          orderBy: [{ name: "asc" }],
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    core.includes("author")
      ? prisma.user.findMany({
          where: { tenantId: TENANT_ID, active: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : Promise.resolve([]),
  ]);
  return {
    postType: { ...postType, coreFields: postType.coreFields, fieldGroupIds: postType.fieldGroupIds },
    groups: await Promise.all(
      groups.map(async (group) => {
        const fields = expandCloneFields(
          parseStoredFields(group.fields),
          (groupId) => cloneMap.get(groupId) ?? null,
        );
        return { id: group.id, name: group.name, fields };
      }),
    ),
    post: post ? { ...post, values } : null,
    categories: categories.map((category) => ({
      id: category.id,
      title: "name" in category ? category.name : category.title,
      slug: category.slug,
    })),
    templates,
    authors,
  };
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function saveCustomPost(formData: FormData): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const typeId = String(formData.get("postTypeId") ?? "").trim();
  const postId = String(formData.get("postId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  if (!typeId || !title) return { ok: false, error: "Post type and title are required." };
  const postType = await prisma.customPostType.findFirst({
    where: { id: typeId, tenantId: TENANT_ID },
  });
  if (!postType) return { ok: false, error: "Custom post type not found." };
  const groups = await prisma.customFieldGroup.findMany({
    where: {
      tenantId: TENANT_ID,
      OR: [
        { id: { in: postType.fieldGroupIds } },
        { contentTypes: { has: postType.slug } },
      ],
    },
    select: { fields: true },
  });
  const cloneMap = await loadCloneMap();
  const fields = groups.flatMap((group) =>
    expandCloneFields(parseStoredFields(group.fields), (groupId) => cloneMap.get(groupId) ?? null),
  );

  let submitted: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(String(formData.get("customFieldValues") ?? "{}"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    submitted = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Custom field values are malformed." };
  }

  const validationError = validateFieldValues(fields, submitted);
  if (validationError) return { ok: false, error: validationError };

  const values: Record<string, unknown> = {};
  const knownKeys = new Set(
    fields
      .filter((field) => field.type !== "message" && field.type !== "tab" && field.type !== "accordion" && field.type !== "clone")
      .map((field) => field.key),
  );
  for (const [key, value] of Object.entries(submitted)) {
    if (knownKeys.has(key)) values[key] = value;
  }

  const slug = postType.coreFields.includes("slug") ? slugify(slugInput || title) : slugify(title);
  if (!slug) return { ok: false, error: "A valid slug could not be generated from the title." };
  const statusInput = String(formData.get("status") ?? "DRAFT");
  const status = postType.coreFields.includes("status") && statusInput === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const core = postType.coreFields;
  const featuredImageAssetId = core.includes("featuredImage")
    ? String(formData.get("featuredImageAssetId") ?? "").trim() || null
    : null;
  const customTermId = core.includes("category")
    ? String(formData.get("customTermId") ?? "").trim() || null
    : null;
  const authorId = core.includes("author")
    ? String(formData.get("authorId") ?? "").trim() || null
    : null;
  const parentId = postType.hierarchical
    ? String(formData.get("parentId") ?? "").trim() || null
    : null;
  const templateId = core.includes("template")
    ? String(formData.get("templateId") ?? "").trim() || null
    : null;
  const [featuredImage, customTerm, template, author] = await Promise.all([
    featuredImageAssetId
      ? prisma.asset.findFirst({
          where: { id: featuredImageAssetId, tenantId: TENANT_ID, kind: "image" },
          select: { id: true },
        })
      : Promise.resolve(null),
    customTermId
      ? prisma.customPostTerm.findFirst({
          where: { id: customTermId, tenantId: TENANT_ID, postTypeId: typeId, taxonomy: "category" },
          select: { id: true },
        })
      : Promise.resolve(null),
    templateId
      ? prisma.blogTemplate.findFirst({
          where: {
            id: templateId,
            tenantId: TENANT_ID,
            type: "single",
            OR: [{ customPostTypeId: typeId }, { customPostTypeId: null }],
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    authorId
      ? prisma.user.findFirst({
          where: { id: authorId, tenantId: TENANT_ID, active: true },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (featuredImageAssetId && !featuredImage) {
    return { ok: false, error: "Featured image is unavailable for this tenant." };
  }
  if (customTermId && !customTerm) {
    return { ok: false, error: "Category is unavailable for this custom post type." };
  }
  if (templateId && !template) {
    return { ok: false, error: "Single-page template is unavailable for this tenant." };
  }
  if (authorId && !author) {
    return { ok: false, error: "Author is unavailable for this tenant." };
  }
  if (parentId) {
    if (parentId === postId) return { ok: false, error: "An entry cannot be its own parent." };
    let ancestorId: string | null = parentId;
    const seen = new Set<string>();
    while (ancestorId) {
      if (ancestorId === postId || seen.has(ancestorId)) {
        return { ok: false, error: "The selected parent would create a hierarchy cycle." };
      }
      seen.add(ancestorId);
      const ancestor = await prisma.customPost.findFirst({
        where: { id: ancestorId, tenantId: TENANT_ID, postTypeId: typeId },
        select: { id: true, parentId: true },
      });
      if (!ancestor) return { ok: false, error: "Parent entry is unavailable for this custom post type." };
      ancestorId = ancestor.parentId;
    }
  }

  const metaKeywordsRaw = String(formData.get("metaKeywords") ?? "[]");
  let metaKeywords: string | null = null;
  if (core.includes("seo")) {
    try {
      const parsed: unknown = JSON.parse(metaKeywordsRaw || "[]");
      if (!Array.isArray(parsed) || parsed.some((keyword) => typeof keyword !== "string")) {
        return { ok: false, error: "SEO keywords must be a JSON array of strings." };
      }
      metaKeywords = JSON.stringify(parsed);
    } catch {
      return { ok: false, error: "SEO keywords must be valid JSON." };
    }
  }
  const jsonSchemaRaw = String(formData.get("jsonSchema") ?? "").trim();
  let jsonSchema: string | null = null;
  if (core.includes("seo") && jsonSchemaRaw) {
    try {
      jsonSchema = JSON.stringify(JSON.parse(jsonSchemaRaw));
    } catch {
      return { ok: false, error: "Structured data must be valid JSON." };
    }
  }
  const data = {
    title,
    slug,
    excerpt: core.includes("excerpt") ? String(formData.get("excerpt") ?? "").trim() || null : null,
    // Body is rich-text HTML from the Advanced Text Editor.
    body: core.includes("body") ? String(formData.get("body") ?? "") : null,
    status,
    values: values as Prisma.InputJsonValue,
    featuredImageAssetId,
    categoryId: null,
    customTermId,
    authorId,
    parentId,
    templateId,
    ...(core.includes("seo")
      ? {
          seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
          metaDesc: String(formData.get("metaDesc") ?? "").trim() || null,
          metaKeywords,
          focusKeyphrase: String(formData.get("focusKeyphrase") ?? "").trim() || null,
          ogImage: String(formData.get("ogImage") ?? "").trim() || null,
          canonicalUrl: String(formData.get("canonicalUrl") ?? "").trim() || null,
          robotsIndex: String(formData.get("robotsIndex") ?? "true") !== "false",
          robotsFollow: String(formData.get("robotsFollow") ?? "true") !== "false",
          jsonSchema,
        }
      : {}),
  };
  try {
    if (postId) {
      const result = await prisma.$transaction(async (tx) => {
        const previous = await tx.customPost.findFirst({
          where: { id: postId, tenantId: TENANT_ID, postTypeId: typeId },
        });
        if (!previous) return false;
        if (core.includes("revisions")) {
          await tx.customPostRevision.create({
            data: {
              tenantId: TENANT_ID,
              postId,
              snapshot: {
                title: previous.title,
                slug: previous.slug,
                parentId: previous.parentId,
                excerpt: previous.excerpt,
                body: previous.body,
                status: previous.status,
                values: previous.values as Prisma.InputJsonValue,
                featuredImageAssetId: previous.featuredImageAssetId,
                customTermId: previous.customTermId,
                authorId: previous.authorId,
                templateId: previous.templateId,
                seoTitle: previous.seoTitle,
                metaDesc: previous.metaDesc,
                metaKeywords: previous.metaKeywords,
                focusKeyphrase: previous.focusKeyphrase,
                ogImage: previous.ogImage,
                canonicalUrl: previous.canonicalUrl,
                robotsIndex: previous.robotsIndex,
                robotsFollow: previous.robotsFollow,
                jsonSchema: previous.jsonSchema,
              },
            },
          });
        }
        await tx.customPost.update({
          where: { id: postId },
          data,
        });
        return true;
      });
      if (!result) return { ok: false, error: "Custom post not found." };
    } else {
      await prisma.customPost.create({ data: { ...data, tenantId: TENANT_ID, postTypeId: typeId } });
    }
    revalidatePath(`/admin/custom-post-types/${typeId}`);
    revalidatePath(`/custom-post/${postType.slug}`);
    revalidatePath(`/${postType.rewriteSlug || postType.slug}`);
    revalidatePath(`/${postType.slug}`);
    revalidatePath(`/custom-post/${postType.slug}/${slug}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save custom post." };
  }
}

export async function deleteCustomPost(postTypeId: string, postId: string): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  try {
    const postType = await prisma.customPostType.findFirst({
      where: { id: postTypeId, tenantId: TENANT_ID },
      select: { slug: true, rewriteSlug: true },
    });
    const result = await prisma.customPost.deleteMany({
      where: { id: postId, postTypeId, tenantId: TENANT_ID },
    });
    if (!result.count) return { ok: false, error: "Custom post not found." };
    revalidatePath(`/admin/custom-post-types/${postTypeId}`);
    if (postType) revalidatePath(`/${postType.rewriteSlug || postType.slug}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete custom post." };
  }
}

export async function listCustomPostRevisions(postTypeId: string, postId: string) {
  await requireSection("general");
  const post = await prisma.customPost.findFirst({
    where: { id: postId, postTypeId, tenantId: TENANT_ID, postType: { is: { coreFields: { has: "revisions" } } } },
    select: { id: true },
  });
  if (!post) return null;
  return prisma.customPostRevision.findMany({
    where: { tenantId: TENANT_ID, postId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, createdAt: true, snapshot: true },
  });
}

export async function restoreCustomPostRevision(
  postTypeId: string,
  postId: string,
  revisionId: string,
): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const post = await prisma.customPost.findFirst({
    where: { id: postId, postTypeId, tenantId: TENANT_ID, postType: { is: { coreFields: { has: "revisions" } } } },
  });
  if (!post) return { ok: false, error: "Custom post not found or revision history is disabled." };
  const revision = await prisma.customPostRevision.findFirst({
    where: { id: revisionId, postId, tenantId: TENANT_ID },
    select: { snapshot: true },
  });
  if (!revision || !revision.snapshot || typeof revision.snapshot !== "object" || Array.isArray(revision.snapshot)) {
    return { ok: false, error: "Revision is unavailable or malformed." };
  }
  const snapshot = revision.snapshot as Prisma.JsonObject;
  if (
    typeof snapshot.title !== "string"
    || typeof snapshot.slug !== "string"
    || typeof snapshot.status !== "string"
    || !snapshot.values
    || typeof snapshot.values !== "object"
    || Array.isArray(snapshot.values)
  ) {
    return { ok: false, error: "Revision is missing required post data." };
  }
  const optionalString = (key: string) => {
    const value = snapshot[key];
    return typeof value === "string" ? value : null;
  };
  const optionalBoolean = (key: string, fallback: boolean) => {
    const value = snapshot[key];
    return typeof value === "boolean" ? value : fallback;
  };

  try {
    const restored = await prisma.$transaction(async (tx) => {
      await tx.customPostRevision.create({
        data: {
          tenantId: TENANT_ID,
          postId,
          snapshot: {
            title: post.title,
            slug: post.slug,
            parentId: post.parentId,
            excerpt: post.excerpt,
            body: post.body,
            status: post.status,
            values: post.values as Prisma.InputJsonValue,
            featuredImageAssetId: post.featuredImageAssetId,
            customTermId: post.customTermId,
            authorId: post.authorId,
            templateId: post.templateId,
            seoTitle: post.seoTitle,
            metaDesc: post.metaDesc,
            metaKeywords: post.metaKeywords,
            focusKeyphrase: post.focusKeyphrase,
            ogImage: post.ogImage,
            canonicalUrl: post.canonicalUrl,
            robotsIndex: post.robotsIndex,
            robotsFollow: post.robotsFollow,
            jsonSchema: post.jsonSchema,
          },
        },
      });
      return tx.customPost.updateMany({
        where: { id: postId, postTypeId, tenantId: TENANT_ID },
        data: {
          title: snapshot.title,
          slug: snapshot.slug,
          parentId: optionalString("parentId"),
          excerpt: optionalString("excerpt"),
          body: optionalString("body"),
          status: snapshot.status,
          values: snapshot.values as Prisma.InputJsonValue,
          featuredImageAssetId: optionalString("featuredImageAssetId"),
          customTermId: optionalString("customTermId"),
          categoryId: null,
          authorId: optionalString("authorId"),
          templateId: optionalString("templateId"),
          seoTitle: optionalString("seoTitle"),
          metaDesc: optionalString("metaDesc"),
          metaKeywords: optionalString("metaKeywords"),
          focusKeyphrase: optionalString("focusKeyphrase"),
          ogImage: optionalString("ogImage"),
          canonicalUrl: optionalString("canonicalUrl"),
          robotsIndex: optionalBoolean("robotsIndex", true),
          robotsFollow: optionalBoolean("robotsFollow", true),
          jsonSchema: optionalString("jsonSchema"),
        },
      });
    });
    if (!restored.count) return { ok: false, error: "Custom post not found." };
    const postType = await prisma.customPostType.findFirst({
      where: { id: postTypeId, tenantId: TENANT_ID },
      select: { slug: true, rewriteSlug: true },
    });
    revalidatePath(`/admin/custom-post-types/${postTypeId}`);
    if (postType) {
      revalidatePath(`/${postType.rewriteSlug || postType.slug}`);
      revalidatePath(`/custom-post/${postType.slug}`);
      revalidatePath(`/custom-post/${postType.slug}/${snapshot.slug}`);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not restore revision." };
  }
}

export async function listCustomPostComments(postTypeId: string) {
  await requireSection("general");
  const postType = await prisma.customPostType.findFirst({
    where: { id: postTypeId, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!postType) return null;
  return prisma.customPostComment.findMany({
    where: { tenantId: TENANT_ID, post: { is: { tenantId: TENANT_ID, postTypeId } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { post: { select: { title: true, slug: true } } },
  });
}

export async function updateCustomPostCommentStatus(
  postTypeId: string,
  commentId: string,
  status: string,
): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  if (!["PENDING", "APPROVED", "SPAM"].includes(status)) {
    return { ok: false, error: "Unknown comment status." };
  }
  const postType = await prisma.customPostType.findFirst({
    where: { id: postTypeId, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!postType) return { ok: false, error: "Custom post type not found." };
  try {
    const result = await prisma.customPostComment.updateMany({
      where: { id: commentId, tenantId: TENANT_ID, post: { is: { tenantId: TENANT_ID, postTypeId } } },
      data: { status },
    });
    if (!result.count) return { ok: false, error: "Comment not found." };
    revalidatePath(`/admin/custom-post-types/${postTypeId}/comments`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update comment status." };
  }
}

export async function deleteCustomPostComment(
  postTypeId: string,
  commentId: string,
): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const postType = await prisma.customPostType.findFirst({
    where: { id: postTypeId, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!postType) return { ok: false, error: "Custom post type not found." };
  try {
    const result = await prisma.customPostComment.deleteMany({
      where: { id: commentId, tenantId: TENANT_ID, post: { is: { tenantId: TENANT_ID, postTypeId } } },
    });
    if (!result.count) return { ok: false, error: "Comment not found." };
    revalidatePath(`/admin/custom-post-types/${postTypeId}/comments`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not delete comment." };
  }
}

const RELATION_SOURCE_LABELS: Record<RelationalSource, (row: Record<string, unknown>) => string> = {
  page: (row) => String(row.name || row.title || row.slug || row.id),
  article: (row) => String(row.title || row.slug || row.id),
  category: (row) => String(row.title || row.slug || row.id),
  listing: (row) => String(row.title || row.slug || row.id),
  user: (row) => {
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
    return name || String(row.username || row.email || row.id);
  },
  custom_post: (row) => String(row.title || row.slug || row.id),
};

async function fetchRelationOptions(source: RelationalSource, customPostTypeId?: string): Promise<RelationOption[]> {
  const take = 200;
  switch (source) {
    case "page": {
      const rows = await prisma.page.findMany({
        where: { tenantId: TENANT_ID },
        orderBy: { name: "asc" },
        take,
        select: { id: true, name: true, title: true, slug: true },
      });
      return rows.map((row) => ({ id: row.id, label: RELATION_SOURCE_LABELS.page(row as unknown as Record<string, unknown>) }));
    }
    case "article": {
      const rows = await prisma.contentTemplate.findMany({
        where: { tenantId: TENANT_ID },
        orderBy: { title: "asc" },
        take,
        select: { id: true, title: true, slug: true },
      });
      return rows.map((row) => ({ id: row.id, label: row.title || row.slug || row.id }));
    }
    case "category": {
      if (customPostTypeId) {
        const rows = await prisma.customPostTerm.findMany({
          where: { tenantId: TENANT_ID, postTypeId: customPostTypeId, taxonomy: "category" },
          orderBy: { name: "asc" },
          take,
          select: { id: true, name: true, slug: true },
        });
        return rows.map((row) => ({ id: row.id, label: row.name || row.slug || row.id }));
      }
      const rows = await prisma.category.findMany({
        where: { tenantId: TENANT_ID },
        orderBy: { title: "asc" },
        take,
        select: { id: true, title: true, slug: true },
      });
      return rows.map((row) => ({ id: row.id, label: row.title || row.slug || row.id }));
    }
    case "listing": {
      const rows = await prisma.listing.findMany({
        where: { tenantId: TENANT_ID },
        orderBy: { title: "asc" },
        take,
        select: { id: true, title: true, slug: true },
      });
      return rows.map((row) => ({ id: row.id, label: row.title || row.slug || row.id }));
    }
    case "user": {
      const rows = await prisma.user.findMany({
        where: { tenantId: TENANT_ID, active: true },
        orderBy: [{ firstName: "asc" }, { email: "asc" }],
        take,
        select: { id: true, firstName: true, lastName: true, username: true, email: true },
      });
      return rows.map((row) => ({ id: row.id, label: RELATION_SOURCE_LABELS.user(row as unknown as Record<string, unknown>) }));
    }
    case "custom_post": {
      const rows = await prisma.customPost.findMany({
        where: { tenantId: TENANT_ID },
        orderBy: { title: "asc" },
        take,
        select: { id: true, title: true, slug: true },
      });
      return rows.map((row) => ({ id: row.id, label: row.title || row.slug || row.id }));
    }
    default:
      return [];
  }
}

/** Batch-load relational option lists for the custom-fields editor. */
export async function getCustomFieldRelationOptions(
  sources: string[],
  customPostTypeId?: string,
): Promise<Record<string, RelationOption[]>> {
  await requireSection("general");
  if (customPostTypeId) {
    const type = await prisma.customPostType.findFirst({
      where: { id: customPostTypeId, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (!type) throw new Error("Custom post type not found.");
  }
  const unique = [...new Set(sources)] as RelationalSource[];
  const allowed: RelationalSource[] = ["page", "article", "category", "listing", "user", "custom_post"];
  const entries = await Promise.all(
    unique
      .filter((source): source is RelationalSource => allowed.includes(source))
      .map(async (source) => [source, await fetchRelationOptions(source, customPostTypeId)] as const),
  );
  return Object.fromEntries(entries);
}

export async function createCustomPostTypeTemplate(
  nameInput: string,
  customPostTypeId: string,
): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const name = nameInput.trim();
  if (!name) return { ok: false, error: "Template name is required." };
  const postType = await prisma.customPostType.findFirst({
    where: { id: customPostTypeId, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!postType) return { ok: false, error: "Select an available custom post type." };
  try {
    const template = await prisma.blogTemplate.create({
      data: {
        tenantId: TENANT_ID,
        name,
        type: "single",
        customPostTypeId: postType.id,
        data: "[]",
      },
      select: { id: true },
    });
    revalidatePath("/admin/custom-fields");
    return { ok: true, id: template.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "A template with this name already exists." };
    }
    throw error;
  }
}

async function findCustomPostTypeTemplate(id: string) {
  return prisma.blogTemplate.findFirst({
    where: { id, tenantId: TENANT_ID, type: "single", customPostTypeId: { not: null } },
    include: {
      revisions: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
}

export async function getCustomPostTypeTemplateEditorData(id: string) {
  await requireSection("general");
  const template = await findCustomPostTypeTemplate(id);
  if (!template || !template.customPostTypeId) return null;
  const postType = await prisma.customPostType.findFirst({
    where: { id: template.customPostTypeId, tenantId: TENANT_ID },
    select: {
      id: true,
      name: true,
      slug: true,
      coreFields: true,
      fieldGroupIds: true,
    },
  });
  if (!postType) return null;
  const groups = await prisma.customFieldGroup.findMany({
    where: {
      tenantId: TENANT_ID,
      OR: [
        { id: { in: postType.fieldGroupIds } },
        { contentTypes: { has: postType.slug } },
      ],
    },
    select: { fields: true },
  });
  const fieldMap = new Map<string, CustomFieldDefinition>();
  for (const group of groups) {
    for (const field of parseStoredFields(group.fields)) {
      if (!fieldMap.has(field.key)) fieldMap.set(field.key, field);
    }
  }
  return {
    template: {
      id: template.id,
      name: template.name,
      data: template.data,
      isDefault: template.isDefault,
      customPostTypeId: template.customPostTypeId,
    },
    postType,
    customFields: [...fieldMap.values()],
  };
}

export async function updateCustomPostTypeTemplateBlocks(
  id: string,
  data: string,
  opts: { createRevision?: boolean } = {},
): Promise<CustomFieldsActionResult & { data?: string }> {
  await requireSection("general");
  const template = await findCustomPostTypeTemplate(id);
  if (!template) return { ok: false, error: "Custom post type template not found." };
  try {
    await prisma.blogTemplate.update({ where: { id: template.id }, data: { data } });
    if (opts.createRevision) {
      await prisma.blogTemplateRevision.create({
        data: { blogTemplateId: id, data },
      });
      const oldRevisions = await prisma.blogTemplateRevision.findMany({
        where: { blogTemplateId: id },
        orderBy: { createdAt: "desc" },
        skip: 30,
        select: { id: true },
      });
      if (oldRevisions.length > 0) {
        await prisma.blogTemplateRevision.deleteMany({
          where: { id: { in: oldRevisions.map((revision) => revision.id) } },
        });
      }
    }
    revalidatePath(`/admin/custom-fields/templates/${id}/edit`);
    revalidatePath(`/custom-post`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save template." };
  }
}

export async function updateCustomPostTypeTemplateMeta(
  id: string,
  formData: FormData,
): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const template = await findCustomPostTypeTemplate(id);
  if (!template) return { ok: false, error: "Custom post type template not found." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Template name is required." };
  try {
    await prisma.blogTemplate.update({ where: { id }, data: { name } });
    revalidatePath(`/admin/custom-fields/templates/${id}/edit`);
    revalidatePath("/admin/custom-fields");
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "A template with this name already exists." };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Failed to update template." };
  }
}

export async function deleteCustomPostTypeTemplate(id: string): Promise<CustomFieldsActionResult> {
  await requireSection("general");
  const template = await findCustomPostTypeTemplate(id);
  if (!template) return { ok: false, error: "Custom post type template not found." };
  try {
    await prisma.$transaction([
      prisma.customPost.updateMany({
        where: { tenantId: TENANT_ID, templateId: id },
        data: { templateId: null },
      }),
      prisma.customPostType.updateMany({
        where: { tenantId: TENANT_ID, defaultTemplateId: id },
        data: { defaultTemplateId: null },
      }),
      prisma.blogTemplate.delete({ where: { id } }),
    ]);
    revalidatePath("/admin/custom-fields");
    revalidatePath(`/admin/custom-post-types/${template.customPostTypeId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete template." };
  }
}

export async function listCustomPostTypeTemplateRevisions(id: string) {
  await requireSection("general");
  const template = await findCustomPostTypeTemplate(id);
  if (!template) return [];
  return template.revisions.map(({ id: revisionId, blogTemplateId, data, createdAt }) => ({
    id: revisionId,
    blogTemplateId,
    data,
    createdAt,
  }));
}

export async function restoreCustomPostTypeTemplateRevision(
  id: string,
  revisionId: string,
): Promise<CustomFieldsActionResult & { data?: string }> {
  await requireSection("general");
  const template = await findCustomPostTypeTemplate(id);
  if (!template) return { ok: false, error: "Custom post type template not found." };
  const revision = template.revisions.find((item) => item.id === revisionId);
  if (!revision) return { ok: false, error: "Template revision not found." };
  const result = await updateCustomPostTypeTemplateBlocks(id, revision.data);
  return result.ok ? { ok: true, data: revision.data } : result;
}
