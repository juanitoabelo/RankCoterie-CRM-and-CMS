"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createCustomPostTerm,
  deleteCustomPost,
  deleteCustomPostTerm,
  getCustomPostEditorData,
  listCustomPostRevisions,
  restoreCustomPostRevision,
  saveCustomPost,
} from "../../custom-fields/actions";
import type { CustomFieldDefinition } from "@/modules/custom-fields/types";
import FieldInput, { useRelationOptions } from "@/components/admin/custom-fields/FieldInput";
import RichTextEditor from "@/components/admin/page-builder/RichTextEditor";
import ImageUploader from "@/components/admin/ImageUploader";
import SeoFields, { DEFAULT_SEO_DATA, type SeoData } from "@/components/admin/SeoFields";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  status: string;
  values: unknown;
  updatedAt: Date;
  featuredImageAssetId: string | null;
  categoryId: string | null;
  customTermId: string | null;
  authorId: string | null;
  parentId: string | null;
  templateId: string | null;
  seoTitle: string | null;
  metaDesc: string | null;
  metaKeywords: string | null;
  focusKeyphrase: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  jsonSchema: string | null;
};

type PostType = {
  id: string;
  name: string;
  slug: string;
  singularLabel: string | null;
  pluralLabel: string | null;
  addNewLabel: string | null;
  parentLabel: string | null;
  hierarchical: boolean;
  coreFields: string[];
  posts: Post[];
};

type CategoryOption = { id: string; title: string; slug: string };
type TemplateOption = { id: string; name: string };
type AuthorOption = { id: string; firstName: string | null; lastName: string | null; email: string };
type Revision = { id: string; createdAt: Date; snapshot: unknown };

type Props = {
  postType: PostType & {
    categories?: CategoryOption[];
    templates?: TemplateOption[];
  };
};

function parseSeo(post: Post | null | undefined): SeoData {
  if (!post) return { ...DEFAULT_SEO_DATA };
  let metaKeywords: string[] = [];
  if (post.metaKeywords) {
    try {
      const parsed: unknown = JSON.parse(post.metaKeywords);
      if (Array.isArray(parsed)) metaKeywords = parsed.filter((k): k is string => typeof k === "string");
    } catch {
      metaKeywords = [];
    }
  }
  return {
    seoTitle: post.seoTitle ?? "",
    metaDesc: post.metaDesc ?? "",
    metaKeywords,
    focusKeyphrase: post.focusKeyphrase ?? "",
    ogImage: post.ogImage ?? "",
    canonicalUrl: post.canonicalUrl ?? "",
    robotsIndex: post.robotsIndex,
    robotsFollow: post.robotsFollow,
    jsonSchema: post.jsonSchema ?? "",
  };
}

export default function CustomPostTypeEntries({ postType }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string; fields: CustomFieldDefinition[] }[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [seoData, setSeoData] = useState<SeoData>({ ...DEFAULT_SEO_DATA });
  const [categories, setCategories] = useState<CategoryOption[]>(postType.categories ?? []);
  const [templates, setTemplates] = useState<TemplateOption[]>(postType.templates ?? []);
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [history, setHistory] = useState<{ postId: string; revisions: Revision[] } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const core = postType.coreFields;
  const allFields = groups.flatMap((group) => group.fields);
  const { options: relationOptions, loading: relationLoading } = useRelationOptions(allFields, postType.id);

  async function openForm(post: Post | null) {
    setError("");
    try {
      const data = await getCustomPostEditorData(postType.id, post?.id);
      if (!data) {
        setError("Could not load this custom post type.");
        return;
      }
      setEditing(post);
      setGroups(data.groups);
      setValues(data.post?.values ?? {});
      setExcerpt(data.post?.excerpt ?? "");
      setBody(data.post?.body ?? "");
      setSeoData(parseSeo(data.post));
      setCategories(data.categories ?? []);
      setTemplates(data.templates ?? []);
      setAuthors(data.authors ?? []);
      setFormOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this custom post type.");
    }
  }

  function removePost(post: Post) {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteCustomPost(postType.id, post.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete custom post.");
      }
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("postTypeId", postType.id);
    formData.set("customFieldValues", JSON.stringify(values));
    formData.set("excerpt", excerpt);
    formData.set("body", body);
    if (core.includes("seo")) {
      formData.set("seoTitle", seoData.seoTitle);
      formData.set("metaDesc", seoData.metaDesc);
      formData.set("metaKeywords", JSON.stringify(seoData.metaKeywords));
      formData.set("focusKeyphrase", seoData.focusKeyphrase);
      formData.set("ogImage", seoData.ogImage);
      formData.set("canonicalUrl", seoData.canonicalUrl);
      formData.set("robotsIndex", seoData.robotsIndex ? "true" : "false");
      formData.set("robotsFollow", seoData.robotsFollow ? "true" : "false");
      formData.set("jsonSchema", seoData.jsonSchema);
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await saveCustomPost(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setFormOpen(false);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save custom post.");
      }
    });
  }

  function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await createCustomPostTerm(postType.id, formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setNewCategoryName("");
        const data = await getCustomPostEditorData(postType.id);
        if (data) setCategories(data.categories);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not create category.");
      }
    });
  }

  function removeCategory(categoryId: string) {
    startTransition(async () => {
      try {
        const result = await deleteCustomPostTerm(postType.id, categoryId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setCategories((current) => current.filter((category) => category.id !== categoryId));
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete category.");
      }
    });
  }

  async function showHistory(post: Post) {
    setError("");
    try {
      const revisions = await listCustomPostRevisions(postType.id, post.id);
      if (!revisions) {
        setError("Revision history is unavailable for this entry.");
        return;
      }
      setHistory({ postId: post.id, revisions });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load revision history.");
    }
  }

  function restoreRevision(postId: string, revisionId: string) {
    setError("");
    startTransition(async () => {
      try {
        const result = await restoreCustomPostRevision(postType.id, postId, revisionId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setHistory(null);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not restore revision.");
      }
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{postType.pluralLabel || postType.name} ({postType.posts.length})</h2>
        <button type="button" onClick={() => void openForm(null)} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">{postType.addNewLabel || `Add New ${postType.singularLabel || postType.name}`}</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {core.includes("category") && (
        <form onSubmit={addCategory} className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-800">{postType.name} categories</h3>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="min-w-52 flex-1 text-sm font-medium text-zinc-700">Add a category
              <input name="name" required value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="min-w-40 flex-1 text-sm font-medium text-zinc-700">Slug (optional)
              <input name="slug" placeholder="generated from name" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <button disabled={pending} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50">Add category</button>
          </div>
          {categories.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                  {category.title}
                  <button type="button" disabled={pending} onClick={() => removeCategory(category.id)} className="text-red-700 hover:underline disabled:opacity-50" aria-label={`Delete ${category.title}`}>×</button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}
      {formOpen && (
        <form key={editing?.id ?? "new"} onSubmit={submit} className="mt-4 space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
          {editing && <input type="hidden" name="postId" value={editing.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Title
              <input name="title" required defaultValue={editing?.title ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            {core.includes("slug") && <label className="text-sm font-medium">Slug
              <input name="slug" defaultValue={editing?.slug ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>}
            {core.includes("status") && <label className="text-sm font-medium">Status
              <select name="status" defaultValue={editing?.status ?? "DRAFT"} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2">
                <option>DRAFT</option><option>PUBLISHED</option>
              </select>
            </label>}
            {core.includes("category") && (
              <label className="text-sm font-medium">Category
                <select name="customTermId" defaultValue={editing?.customTermId ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2">
                  <option value="">None</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.title}</option>)}
                </select>
              </label>
            )}
            {postType.hierarchical && <label className="text-sm font-medium">{postType.parentLabel || `Parent ${postType.singularLabel || postType.name}`}
              <select name="parentId" defaultValue={editing?.parentId ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2">
                <option value="">No parent</option>
                {postType.posts.filter((post) => post.id !== editing?.id).map((post) => (
                  <option key={post.id} value={post.id}>{post.title}</option>
                ))}
              </select>
            </label>}
            {core.includes("author") && <label className="text-sm font-medium">Author
              <select name="authorId" defaultValue={editing?.authorId ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2">
                <option value="">Unassigned</option>
                {authors.map((author) => {
                  const fullName = [author.firstName, author.lastName].filter(Boolean).join(" ");
                  return <option key={author.id} value={author.id}>{fullName || author.email}</option>;
                })}
              </select>
            </label>}
            {core.includes("template") && (
              <label className="text-sm font-medium">Template (single page)
                <select name="templateId" defaultValue={editing?.templateId ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2">
                  <option value="">Default layout</option>
                  {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                </select>
              </label>
            )}
          </div>
          {core.includes("excerpt") && (
            <div>
              <span className="text-sm font-medium text-zinc-700">Excerpt</span>
              <div className="mt-1">
                <RichTextEditor
                  value={excerpt}
                  onChange={setExcerpt}
                  showSource
                  minHeight={100}
                  placeholder="Short summary shown in lists and previews…"
                />
                <input type="hidden" name="excerpt" value={excerpt} />
              </div>
            </div>
          )}
          {core.includes("body") && (
            <div>
              <span className="text-sm font-medium text-zinc-700">Body / Content</span>
              <div className="mt-1">
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  showSource
                  minHeight={240}
                  placeholder="Write the full content…"
                />
                <input type="hidden" name="body" value={body} />
              </div>
            </div>
          )}
          {core.includes("featuredImage") && (
            <div className="rounded-lg border border-zinc-200 p-4">
              <h3 className="text-sm font-medium text-zinc-800">Featured image</h3>
              <p className="mt-1 text-xs text-zinc-500">Recommended dimensions: 1200 × 630 px (1.91:1 landscape).</p>
              <div className="mt-3">
                <ImageUploader
                  name="featuredImageAssetId"
                  label="Upload featured image"
                  currentAssetId={editing?.featuredImageAssetId ?? null}
                />
              </div>
            </div>
          )}
          {core.includes("seo") && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-zinc-900">SEO &amp; Social</h3>
              <SeoFields data={seoData} onChange={setSeoData} slugPreview={(editing?.slug ?? "") || undefined} />
            </div>
          )}
          {groups.map((group) => (
            <fieldset key={group.id} className="space-y-3 rounded-lg border border-zinc-200 p-4">
              <legend className="px-1 text-sm font-semibold">{group.name}</legend>
              {group.fields.map((field) => {
                if (field.type === "tab") {
                  return (
                    <h3 key={field.key} className="border-b border-zinc-200 pb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      {field.label}
                    </h3>
                  );
                }
                if (field.type === "message") {
                  return (
                    <div
                      key={field.key}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                      dangerouslySetInnerHTML={{ __html: field.message ?? field.label }}
                    />
                  );
                }
                return (
                  <label key={field.key} className="block text-sm font-medium text-zinc-700">
                    <span>
                      {field.label}
                      {field.required && <span className="text-red-600"> *</span>}
                      {field.instructions && (
                        <span className="mt-0.5 block text-xs font-normal text-zinc-500">{field.instructions}</span>
                      )}
                    </span>
                    <FieldInput
                      field={field}
                      value={values[field.key]}
                      onChange={(next) => setValues((current) => ({ ...current, [field.key]: next }))}
                      relationOptions={relationOptions}
                      relationLoading={relationLoading}
                    />
                  </label>
                );
              })}
            </fieldset>
          ))}
          <div className="flex gap-2">
            <button disabled={pending} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save Entry"}</button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3"></th></tr></thead>
          <tbody>
            {postType.posts.map((post) => (
              <tr key={post.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium">{post.title}</td>
                <td className="px-4 py-3 text-zinc-500">{post.slug}</td>
                <td className="px-4 py-3">{post.status}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(post.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => void openForm(post)} className="text-amber-700 hover:underline">Edit</button>
                    {core.includes("revisions") && (
                      <button type="button" onClick={() => void showHistory(post)} className="text-zinc-700 hover:underline">History</button>
                    )}
                    {post.status === "PUBLISHED" && (
                      <Link
                        href={`/custom-post/${postType.slug}/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline"
                      >
                        View
                      </Link>
                    )}
                    <button type="button" disabled={pending} onClick={() => removePost(post)} className="text-red-700 hover:underline disabled:opacity-50">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {postType.posts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {history && (
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-zinc-900">Revision history</h3>
            <button type="button" onClick={() => setHistory(null)} className="text-sm text-zinc-600 hover:underline">Close</button>
          </div>
          {history.revisions.length ? (
            <ul className="mt-3 divide-y divide-zinc-100">
              {history.revisions.map((revision) => {
                const title = revision.snapshot && typeof revision.snapshot === "object" && "title" in revision.snapshot
                  ? String(revision.snapshot.title)
                  : "Saved version";
                return (
                  <li key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span>{title} <span className="text-zinc-500">· {new Date(revision.createdAt).toLocaleString()}</span></span>
                    <button type="button" disabled={pending} onClick={() => restoreRevision(history.postId, revision.id)} className="text-amber-700 hover:underline disabled:opacity-50">Restore</button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-3 text-sm text-zinc-500">No revisions yet. A revision is saved each time an entry is edited.</p>}
        </section>
      )}
    </section>
  );
}
