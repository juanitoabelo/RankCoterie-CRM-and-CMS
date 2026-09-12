"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateCategory,
  deleteCategory,
  updateCategorySections,
  type ActionResult,
} from "../../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import ImageUploader from "@/components/admin/ImageUploader";
import WordCounter from "@/components/admin/WordCounter";

interface TopicImage {
  id: string;
  position: string;
  imageAssetId: string;
}

interface TopicCategory {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  author?: string | null;
  sections?: { title: string; content: string }[] | null;
  images: TopicImage[];
}

interface GeoCategoryOption {
  id: string;
  title: string;
}

const SECTION_LABELS = ["Section One", "Section Two", "Section Three", "Section Four", "Section Five"];

export default function TopicEditForm({
  category,
  allCategories,
  geoCategoryOptions,
}: {
  category: TopicCategory;
  allCategories: { id: string; title: string; slug: string }[];
  geoCategoryOptions: GeoCategoryOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(category.title);
  const [sections, setSections] = useState<{ title: string; content: string }[]>(
    (() => {
      const raw = category.sections;
      if (!raw) return SECTION_LABELS.map((label) => ({ title: label, content: "" }));
      const parsed = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
      return Array.isArray(parsed) ? parsed : SECTION_LABELS.map((label) => ({ title: label, content: "" }));
    })()
  );
  const [featuredImage, setFeaturedImage] = useState<string>(
    category.images.find((i) => i.position === "PRIMARY")?.imageAssetId ?? ""
  );

  const featuredImageObj = category.images.find((i) => i.position === "PRIMARY");

  function updateSection(index: number, field: "title" | "content", value: string) {
    setSections((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = { title: "", content: "" };
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function onSubmit(formData: FormData) {
    formData.set("sections", JSON.stringify(sections));
    setMessage(null);
    startTransition(async () => {
      const res = await updateCategory(category.id, formData);
      setMessage(res);
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this topic?")) return;
    startTransition(async () => {
      await deleteCategory(category.id);
      router.push("/admin/categories");
    });
  }

  async function saveSections() {
    setMessage(null);
    const res = await updateCategorySections(category.id, sections);
    setMessage(res);
  }

  const previewUrl = `/g/${category.slug}`;

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/categories" className="hover:text-zinc-700">Topics</a> /{" "}
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
        <input type="hidden" name="id" value={category.id} />

        {/* Topic Page URL */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">Topic Page URL</label>
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

        {/* Topic Title */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">Topic Title</label>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Content Sections */}
        {sections.map((section, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <label className="block text-sm font-medium text-zinc-800">
              {category.title} ({section.title || SECTION_LABELS[i]})
            </label>
            <RichTextarea
              name={`section_${i}`}
              label=""
              value={section.content}
              onChange={(html) => updateSection(i, "content", html)}
              placeholder={`Write ${SECTION_LABELS[i].toLowerCase()} content...`}
            />
            <button
              type="button"
              onClick={saveSections}
              disabled={isPending}
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
            >
              Save Paragraph
            </button>
          </div>
        ))}

        {/* Featured Image */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <label className="block text-sm font-medium text-zinc-800">
            Upload Featured Image <span className="text-xs text-zinc-400">(Must be .jpg, .png, or .gif with max file size: 500kb)</span>
          </label>
          <input type="hidden" name="featuredImageAssetId" value={featuredImage} />
          {featuredImageObj && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Featured Image:</p>
              <img
                src={`/api/assets/${featuredImageObj.imageAssetId}`}
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

        {/* Author */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">Author</label>
          <input
            name="author"
            defaultValue={category.author ?? ""}
            placeholder="Author name"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* GeoCategory Widget */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">
            Choose a GeoCategory widget for this Topic to display
          </label>
          <select
            name="geoCategoryWidget"
            defaultValue=""
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {geoCategoryOptions.map((gc) => (
              <option key={gc.id} value={gc.id}>{gc.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {isPending ? "Saving..." : `UPDATE/SAVE ${title.toUpperCase()}`}
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

      <div className="mt-6">
        <WordCounter source={sections.map((s) => s.content).join(" ")} />
      </div>
    </div>
  );
}
