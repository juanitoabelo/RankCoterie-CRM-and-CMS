"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteCustomFieldGroup,
  deleteCustomPostType,
  deleteCustomPostTypeTemplate,
  createCustomPostTypeTemplate,
  saveCustomFieldGroup,
  saveCustomPostType,
  type CustomFieldsActionResult,
} from "./actions";
import {
  CONTENT_TYPES,
  FIELD_TYPE_CATEGORIES,
  fieldTypeLabel,
  type CustomFieldDefinition,
} from "@/modules/custom-fields/types";
import { FieldListEditor, blankField } from "@/components/admin/custom-fields/FieldListEditor";

type Group = {
  id: string;
  name: string;
  description: string | null;
  contentTypes: string[];
  fields: CustomFieldDefinition[];
  updatedAt: Date;
};

type PostType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  singularLabel: string | null;
  pluralLabel: string | null;
  addNewLabel: string | null;
  archivesLabel: string | null;
  parentLabel: string | null;
  isPublic: boolean;
  hasArchive: boolean;
  hierarchical: boolean;
  rewriteSlug: string | null;
  showInRest: boolean;
  defaultTemplateId: string | null;
  coreFields: string[];
  fieldGroupIds: string[];
  _count: { posts: number };
};

type Template = { id: string; name: string; customPostTypeId: string | null };

const CORE_FIELDS = [
  { value: "title", label: "Title" },
  { value: "slug", label: "URL slug" },
  { value: "excerpt", label: "Excerpt" },
  { value: "body", label: "Body / content" },
  { value: "status", label: "Draft / published status" },
  { value: "featuredImage", label: "Featured image" },
  { value: "category", label: "Categories (this post type only)" },
  { value: "template", label: "Per-entry template override" },
  { value: "author", label: "Author" },
  { value: "comments", label: "Comments" },
  { value: "revisions", label: "Revision history" },
  { value: "seo", label: "SEO tabs" },
];

const DEFAULT_CORE_FIELDS = CORE_FIELDS
  .filter((field) => !["author", "comments", "revisions"].includes(field.value))
  .map((field) => field.value);

const blankFieldLegacy = blankField;

export default function CustomFieldsAdmin({
  groups,
  postTypes,
  templates,
}: {
  groups: Group[];
  postTypes: PostType[];
  templates: Template[];
}) {
  const router = useRouter();
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingType, setEditingType] = useState<PostType | null>(null);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templatePostTypeId, setTemplatePostTypeId] = useState("");
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [typeFields, setTypeFields] = useState<string[]>(DEFAULT_CORE_FIELDS);
  const [typeGroups, setTypeGroups] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const availableGroups = groups
    .filter((group) => !editingGroup || group.id !== editingGroup.id)
    .map((group) => ({ id: group.id, name: group.name }));

  function editGroup(group: Group | null) {
    setEditingGroup(group);
    setGroupFormOpen(true);
    setFields(group?.fields ?? [blankFieldLegacy()]);
    setContentTypes(group?.contentTypes ?? []);
    setError("");
  }

  function editPostType(postType: PostType | null) {
    setEditingType(postType);
    setTypeFormOpen(true);
    setTypeFields(postType?.coreFields ?? DEFAULT_CORE_FIELDS);
    setTypeGroups(postType?.fieldGroupIds ?? []);
    setError("");
  }

  function runAction(action: (formData: FormData) => Promise<CustomFieldsActionResult>, formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setGroupFormOpen(false);
        setTypeFormOpen(false);
        setEditingGroup(null);
        setEditingType(null);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save changes.");
      }
    });
  }

  function saveGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("fields", JSON.stringify(fields.map((field) => ({
      ...field,
      options: field.options,
    }))));
    runAction(saveCustomFieldGroup, formData);
  }

  function saveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("coreFields", "");
    typeFields.forEach((value) => formData.append("coreFields", value));
    formData.set("fieldGroupIds", "");
    typeGroups.forEach((value) => formData.append("fieldGroupIds", value));
    runAction(saveCustomPostType, formData);
  }

  function toggleList(setter: (values: string[]) => void, current: string[], value: string) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function removeGroup(id: string) {
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteCustomFieldGroup(id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete field group.");
      }
    });
  }

  function removePostType(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" and all of its entries?`)) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteCustomPostType(id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete custom post type.");
      }
    });
  }

  function removeTemplate(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Entries using it will return to the post type default.`)) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteCustomPostTypeTemplate(id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete template.");
      }
    });
  }

  function createTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = templateName.trim();
    if (!name || !templatePostTypeId) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await createCustomPostTypeTemplate(name, templatePostTypeId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setTemplateName("");
        router.push(`/admin/custom-fields/templates/${result.id}/edit`);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not create template.");
      }
    });
  }

  return (
    <div className="space-y-10">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Custom Field Groups</h2>
            <p className="mt-1 max-w-3xl text-sm text-zinc-600">Create reusable groups of typed fields and assign each group to one or more content types. Assigned fields appear in the corresponding content editors.</p>
          </div>
          <button type="button" onClick={() => editGroup(null)} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">New Field Group</button>
        </div>

        {groupFormOpen ? (
          <form key={editingGroup?.id ?? "new"} onSubmit={saveGroup} className="mt-5 space-y-5 rounded-xl border border-zinc-200 bg-white p-5">
            {editingGroup?.id && <input type="hidden" name="id" value={editingGroup.id} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-700">Group name
                <input name="name" required defaultValue={editingGroup?.name ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-zinc-700">Description
                <input name="description" defaultValue={editingGroup?.description ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-zinc-800">Assign to content types</legend>
              <p className="mt-1 text-xs text-zinc-500">
                Built-in types and your Custom Post Types both appear here — checking a Custom Post Type links this field group to its entries editor.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <p className="sm:col-span-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Built-in</p>
                {CONTENT_TYPES.map((type) => (
                  <label key={type.value} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" name="contentTypes" value={type.value} checked={contentTypes.includes(type.value)} onChange={() => toggleList(setContentTypes, contentTypes, type.value)} />
                    {type.label}
                  </label>
                ))}
                {postTypes.length > 0 && (
                  <>
                    <p className="sm:col-span-3 mt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Custom Post Types</p>
                    {postTypes.map((postType) => (
                      <label key={postType.id} className="flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          name="contentTypes"
                          value={postType.slug}
                          checked={contentTypes.includes(postType.slug)}
                          onChange={() => toggleList(setContentTypes, contentTypes, postType.slug)}
                        />
                        {postType.name}
                        <span className="text-xs text-zinc-400">/{postType.slug}</span>
                      </label>
                    ))}
                  </>
                )}
                {postTypes.length === 0 && (
                  <p className="sm:col-span-3 text-xs text-zinc-500">No custom post types yet — create one below first.</p>
                )}
              </div>
            </fieldset>

            <FieldListEditor fields={fields} onChange={setFields} availableGroups={availableGroups} />
            <div className="flex gap-2">
              <button disabled={pending} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save Field Group"}</button>
              <button type="button" onClick={() => setGroupFormOpen(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Cancel</button>
            </div>
          </form>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <article key={group.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-zinc-900">{group.name}</h3>
                <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{group.fields.length} fields</span>
              </div>
              {group.description && <p className="mt-1 text-sm text-zinc-600">{group.description}</p>}
              <p className="mt-2 text-xs text-zinc-500">
                {group.contentTypes
                  .map((key) => {
                    const builtIn = CONTENT_TYPES.find((type) => type.value === key);
                    if (builtIn) return builtIn.label;
                    const cpt = postTypes.find((type) => type.slug === key);
                    return cpt ? cpt.name : key;
                  })
                  .join(", ")}
              </p>
              <div className="mt-3 flex gap-3">
                <button type="button" onClick={() => editGroup(group)} className="text-sm font-medium text-amber-700 hover:underline">Edit</button>
                <button type="button" disabled={pending} onClick={() => removeGroup(group.id)} className="text-sm text-red-700 hover:underline disabled:opacity-50">Delete</button>
              </div>
            </article>
          ))}
          {groups.length === 0 && <p className="text-sm text-zinc-500">No field groups yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-zinc-900">Available Field Types</h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
          Every type you can pick when building a field group — use <strong>Add field…</strong> inside the field-group form (or the Type dropdown on each row).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FIELD_TYPE_CATEGORIES.map((category) => (
            <article key={category.value} className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{category.label}</h3>
              <ul className="mt-2 space-y-1">
                {category.types.map((type) => (
                  <li key={type} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-zinc-800">{fieldTypeLabel(type)}</span>
                    <code className="text-[11px] text-zinc-400">{type}</code>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Custom Post Types</h2>
            <p className="mt-1 max-w-3xl text-sm text-zinc-600">Configure labels, public and archive behavior, hierarchy, REST exposure, single templates, built-in supports, and fields for each content type.</p>
          </div>
          <button type="button" onClick={() => editPostType(null)} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">New Custom Post Type</button>
        </div>

        {typeFormOpen ? (
          <form key={editingType?.id ?? "new"} onSubmit={saveType} className="mt-5 space-y-5 rounded-xl border border-zinc-200 bg-white p-5">
            {editingType?.id && <input type="hidden" name="id" value={editingType.id} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-700">Post type name
                <input name="name" required defaultValue={editingType?.name ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-zinc-700">URL slug
                <input name="slug" defaultValue={editingType?.slug ?? ""} placeholder="case-studies" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-zinc-700">Singular label
                <input name="singularLabel" defaultValue={editingType?.singularLabel ?? editingType?.name ?? ""} placeholder="Book" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-zinc-700">Plural label
                <input name="pluralLabel" defaultValue={editingType?.pluralLabel ?? ""} placeholder="Books" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-zinc-700">Add new label
                <input name="addNewLabel" defaultValue={editingType?.addNewLabel ?? ""} placeholder="Add New Book" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-zinc-700">Archives label
                <input name="archivesLabel" defaultValue={editingType?.archivesLabel ?? ""} placeholder="Books Archives" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-zinc-700">Parent label
                <input name="parentLabel" defaultValue={editingType?.parentLabel ?? ""} placeholder="Parent Book" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-zinc-700 sm:col-span-2">Rewrite / archive slug
                <input name="rewriteSlug" defaultValue={editingType?.rewriteSlug ?? editingType?.slug ?? ""} placeholder="library" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
                <span className="mt-1 block text-xs font-normal text-zinc-500">The archive URL will be /{editingType?.rewriteSlug || editingType?.slug || "your-slug"}/.</span>
              </label>
              <label className="text-sm font-medium text-zinc-700 sm:col-span-2">Description
                <textarea name="description" defaultValue={editingType?.description ?? ""} rows={2} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-zinc-800">Registration options</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {[
                  ["isPublic", "Publicly visible"],
                  ["hasArchive", "Enable archive"],
                  ["hierarchical", "Parent / child entries"],
                  ["showInRest", "Expose read-only REST API"],
                ].map(([value, label]) => {
                  const enabled = value === "isPublic"
                    ? editingType?.isPublic ?? true
                    : value === "hasArchive"
                      ? editingType?.hasArchive ?? true
                      : value === "hierarchical"
                        ? editingType?.hierarchical ?? false
                        : editingType?.showInRest ?? false;
                  return (
                    <label key={value} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" name={value} defaultChecked={enabled} />
                      {label}
                    </label>
                  );
                })}
              </div>
              <label className="mt-4 block max-w-xl text-sm font-medium text-zinc-700">Default single-page template
                <select name="defaultTemplateId" defaultValue={editingType?.defaultTemplateId ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2">
                  <option value="">Use the general single template</option>
                  {templates.filter((template) => (
                    template.customPostTypeId === editingType?.id
                    || (template.customPostTypeId === null && template.id === editingType?.defaultTemplateId)
                  )).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium text-zinc-800">Built-in fields</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {CORE_FIELDS.map((field) => (
                  <label key={field.value} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" checked={typeFields.includes(field.value)} disabled={field.value === "title"} onChange={() => toggleList(setTypeFields, typeFields, field.value)} />
                    {field.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium text-zinc-800">Custom field groups</legend>
              {groups.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.map((group) => (
                    <label key={group.id} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" checked={typeGroups.includes(group.id)} onChange={() => toggleList(setTypeGroups, typeGroups, group.id)} />
                      {group.name}
                    </label>
                  ))}
                </div>
              ) : <p className="mt-2 text-sm text-zinc-500">Create a field group to assign custom fields.</p>}
            </fieldset>
            <div className="flex gap-2">
              <button disabled={pending} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save Post Type"}</button>
              <button type="button" onClick={() => setTypeFormOpen(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Cancel</button>
            </div>
          </form>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {postTypes.map((postType) => (
            <article key={postType.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-semibold text-zinc-900">{postType.name}</h3><p className="mt-1 text-xs text-zinc-500">/{postType.rewriteSlug || postType.slug}</p></div>
                <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{postType._count.posts} entries</span>
              </div>
              {postType.description && <p className="mt-2 text-sm text-zinc-600">{postType.description}</p>}
              <p className="mt-2 text-xs text-zinc-500">{postType.coreFields.length} built-in fields · {postType.fieldGroupIds.length} field groups</p>
              <div className="mt-3 flex gap-3">
                <button type="button" onClick={() => editPostType(postType)} className="text-sm font-medium text-amber-700 hover:underline">Edit</button>
                <Link href={`/admin/custom-post-types/${postType.id}`} className="text-sm font-medium text-zinc-700 hover:underline">Manage entries</Link>
                <button type="button" disabled={pending} onClick={() => removePostType(postType.id, postType.name)} className="text-sm text-red-700 hover:underline disabled:opacity-50">Delete</button>
              </div>
            </article>
          ))}
          {postTypes.length === 0 && <p className="text-sm text-zinc-500">No custom post types yet.</p>}
        </div>
      </section>

      <section>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Custom Post Type Single Templates</h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-600">
            Build a single-page layout for one custom post type. Its enabled fields and assigned custom fields are available as block data bindings.
          </p>
        </div>
        <form onSubmit={createTemplate} className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-medium text-zinc-700">Template name
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" placeholder="Book detail page" />
          </label>
          <label className="text-sm font-medium text-zinc-700">Custom post type
            <select value={templatePostTypeId} onChange={(event) => setTemplatePostTypeId(event.target.value)} required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2">
              <option value="">Select a post type</option>
              {postTypes.map((postType) => <option key={postType.id} value={postType.id}>{postType.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={pending || postTypes.length === 0} className="self-end rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? "Creating…" : "Create Template"}
          </button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.filter((template) => template.customPostTypeId).map((template) => {
            const postType = postTypes.find((item) => item.id === template.customPostTypeId);
            return (
              <article key={template.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <h3 className="font-semibold text-zinc-900">{template.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">Single template for {postType?.name ?? "unavailable post type"}</p>
                <div className="mt-3 flex gap-3">
                  <Link href={`/admin/custom-fields/templates/${template.id}/edit`} className="text-sm font-medium text-amber-700 hover:underline">
                    Edit template
                  </Link>
                  <button type="button" disabled={pending} onClick={() => removeTemplate(template.id, template.name)} className="text-sm text-red-700 hover:underline disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
          {templates.length === 0 && <p className="text-sm text-zinc-500">Create a custom post type first, then add its single-page template here.</p>}
        </div>
      </section>
    </div>
  );
}
