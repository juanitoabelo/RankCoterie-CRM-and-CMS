"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateSubTopic,
  deleteSubTopic,
  updateSubTopicSections,
  type ActionResult,
} from "../../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import ImageUploader from "@/components/admin/ImageUploader";
import WordCounter from "@/components/admin/WordCounter";

interface SubTopic {
  id: string;
  title: string;
  slug: string;
  body: string;
  author?: string | null;
  featuredImageAssetId?: string | null;
  displaySections?: unknown;
  categoryId?: string | null;
  category?: { id: string; title: string; slug: string } | null;
  featuredImage?: { id: string } | null;
  sectionLinks: {
    section: { id: string; title: string; slug: string; order: number };
  }[];
}

interface TopicOption {
  id: string;
  title: string;
}

interface SectionOption {
  id: string;
  title: string;
}

const SECTION_LABELS = ["Section One", "Section Two", "Section Three", "Section Four", "Section Five"];

export default function SubTopicEditForm({
  subtopic,
  topicOptions,
  sectionOptions,
}: {
  subtopic: SubTopic;
  topicOptions: TopicOption[];
  sectionOptions: SectionOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(subtopic.title);
  const [body, setBody] = useState(subtopic.body ?? "");
  const [featuredImage, setFeaturedImage] = useState<string>(
    subtopic.featuredImageAssetId ?? ""
  );
  const [categoryId, setCategoryId] = useState(subtopic.categoryId ?? "");
  const [author, setAuthor] = useState(subtopic.author ?? "");

  // Parse displaySections from JSON
  const initialDisplay: boolean[] = (() => {
    try {
      const raw = subtopic.displaySections;
      if (!raw) return [false, false, false, false, false];
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [false, false, false, false, false];
    } catch {
      return [false, false, false, false, false];
    }
  })();
  const [displaySections, setDisplaySections] = useState<boolean[]>(initialDisplay);

  const [linkedSectionIds, setLinkedSectionIds] = useState<string[]>(
    subtopic.sectionLinks.map((sl) => sl.section.id)
  );
  const [newSectionId, setNewSectionId] = useState("");

  const previewUrl = subtopic.category?.slug
    ? `/g/${subtopic.category.slug}`
    : `/g/${subtopic.slug}`;

  function onSubmit(formData: FormData) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    formData.set("slug", slug);
    formData.set("body", body);
    formData.set("categoryId", categoryId);
    formData.set("author", author);
    formData.set("featuredImageAssetId", featuredImage);
    formData.set("displaySections", JSON.stringify(displaySections));
    setMessage(null);
    startTransition(async () => {
      const res = await updateSubTopic(subtopic.id, formData);
      setMessage(res);
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this subtopic?")) return;
    startTransition(async () => {
      await deleteSubTopic(subtopic.id);
      router.push("/admin/templates");
    });
  }

  function toggleDisplaySection(index: number) {
    setDisplaySections((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  function addSection() {
    if (!newSectionId) return;
    if (linkedSectionIds.includes(newSectionId)) return;
    const updated = [...linkedSectionIds, newSectionId];
    setLinkedSectionIds(updated);
    setNewSectionId("");
    startTransition(async () => {
      const res = await updateSubTopicSections(subtopic.id, updated);
      setMessage(res);
    });
  }

  function removeSection(sectionId: string) {
    const updated = linkedSectionIds.filter((id) => id !== sectionId);
    setLinkedSectionIds(updated);
    startTransition(async () => {
      const res = await updateSubTopicSections(subtopic.id, updated);
      setMessage(res);
    });
  }

  const linkedSections = sectionOptions.filter((s) => linkedSectionIds.includes(s.id));

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/templates" className="hover:text-zinc-700">SubTopics</a> /{" "}
        <span className="text-zinc-700">Edit</span>
      </p>
      <div className="flex items-start justify-between">
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          Edit: <span className="text-blue-600">{title}</span>
        </h1>
        <span className="text-xs text-zinc-400">Help with SEO (search engine optimization)</span>
      </div>

      <form action={onSubmit} className="mt-8 space-y-6">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Saved." : message.error}
          </p>
        )}

        {/* SubTopic URL */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">SubTopic URL</label>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="text-sm text-zinc-600">{previewUrl}/</span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              – Preview Page 👁
            </a>
          </div>
        </div>

        {/* SubTopic Title */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">SubTopic Title</label>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Content */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <label className="block text-sm font-medium text-zinc-800">SubTopic Content</label>
          <input type="hidden" name="body" value={body} />
          <RichTextarea
            name="_body"
            label=""
            value={body}
            onChange={setBody}
            placeholder="Write subtopic content..."
          />
        </div>

        {/* Featured Image */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <label className="block text-sm font-medium text-zinc-800">
            Upload Featured Image <span className="text-xs text-zinc-400">(Must be .jpg, .png, or .gif with max file size: 500kb)</span>
          </label>
          <input type="hidden" name="featuredImageAssetId" value={featuredImage} />
          {subtopic.featuredImage && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Featured Image:</p>
              <img
                src={`/api/assets/${subtopic.featuredImage.id}`}
                alt=""
                className="h-32 w-48 rounded-lg border border-zinc-200 object-cover"
              />
            </div>
          )}
          <ImageUploader
            name="featuredImageAssetId"
            label="Upload New Image"
            currentAssetId={featuredImage || null}
            onUpload={(id) => setFeaturedImage(id)}
          />
        </div>

        {/* Topic Details */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Topic Details</h2>

          {/* Related Topic */}
          <div>
            <label className="block text-sm font-medium text-zinc-800">Related Topic</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">— Select Topic —</option>
              {topicOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* Display Section toggles */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-800">Display Sections</label>
            {SECTION_LABELS.map((label, i) => (
              <label key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={displaySections[i] ?? false}
                  onChange={() => toggleDisplaySection(i)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span className="text-sm text-zinc-700">{label}</span>
              </label>
            ))}
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-zinc-800">Author</label>
            <input
              name="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {isPending ? "Saving..." : `UPDATE/SAVE SUBTOPIC PAGE`}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </form>

      {/* Section List */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Section List</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-600">Add a Section</label>
            <select
              value={newSectionId}
              onChange={(e) => setNewSectionId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">— Select Section —</option>
              {sectionOptions
                .filter((s) => !linkedSectionIds.includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addSection}
            disabled={!newSectionId}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            Add Section
          </button>
        </div>
        {linkedSections.length > 0 && (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {linkedSections.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-zinc-800">{s.title}</span>
                <button
                  type="button"
                  onClick={() => removeSection(s.id)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {linkedSections.length === 0 && (
          <p className="text-xs text-zinc-400">No sections linked yet.</p>
        )}
      </div>

      <div className="mt-6">
        <WordCounter source={body} />
      </div>
    </div>
  );
}
