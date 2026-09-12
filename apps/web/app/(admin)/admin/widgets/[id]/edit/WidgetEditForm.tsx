"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWidget, deleteWidget, type ActionResult } from "../../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import ImageUploader from "@/components/admin/ImageUploader";
import WordCounter from "@/components/admin/WordCounter";

interface WidgetData {
  id: string;
  name: string;
  title?: string | null;
  url?: string | null;
  html: string;
  imageAssetId?: string | null;
  keywords?: string | null;
  companyId?: string | null;
  ctaDescription?: string | null;
  ctaStatement1?: string | null;
  ctaStatement2?: string | null;
  ctaButtonText?: string | null;
  phone?: string | null;
  usePhoneAsButtonLink: boolean;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  pinterestUrl?: string | null;
  linkedinUrl?: string | null;
  imageAsset?: { id: string } | null;
  company?: { id: string; name: string } | null;
}

interface CompanyOption {
  id: string;
  name: string;
}

export default function WidgetEditForm({
  widget,
  companyOptions,
}: {
  widget: WidgetData;
  companyOptions: CompanyOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(widget.title ?? widget.name);
  const [html, setHtml] = useState(widget.html);
  const [imageAssetId, setImageAssetId] = useState(widget.imageAssetId ?? "");

  function onSubmit(formData: FormData) {
    formData.set("title", title);
    formData.set("html", html);
    formData.set("imageAssetId", imageAssetId);
    setMessage(null);
    startTransition(async () => {
      const res = await updateWidget(widget.id, formData);
      setMessage(res);
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this widget?")) return;
    startTransition(async () => {
      await deleteWidget(widget.id);
      router.push("/admin/widgets");
    });
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}

      {/* Widget/Listing Content */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Widget/Listing Content</h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">Widget/Listing Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            Widget/Listing URL (page url) <span className="text-xs text-red-500">* This action can&apos;t be edit or &quot;Redirect&quot;</span>
          </label>
          <input
            name="url"
            defaultValue={widget.url ?? ""}
            placeholder="http://www.example.com"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* CTA Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            CTA Description <span className="text-xs text-zinc-400">* This is the top &quot;sales&quot; text in CTA widget. 150 character max. *Not required</span>
          </label>
          <input
            name="ctaDescription"
            defaultValue={widget.ctaDescription ?? ""}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* CTA Statement #1 */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            CTA Statement #1 <span className="text-xs text-zinc-400">* This is the understated paragraph space. 150 character max. *Not required</span>
          </label>
          <input
            name="ctaStatement1"
            defaultValue={widget.ctaStatement1 ?? ""}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* CTA Statement #2 */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            CTA Statement #2 <span className="text-xs text-zinc-400">* This is the understated paragraph space. 150 character max. *Not required</span>
          </label>
          <input
            name="ctaStatement2"
            defaultValue={widget.ctaStatement2 ?? ""}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* CTA Button Text */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            CTA Button Text <span className="text-xs text-zinc-400">* By default the button text links to the URL above (http://www.soulegria.com). 20 character max. **Required</span>
          </label>
          <input
            name="ctaButtonText"
            defaultValue={widget.ctaButtonText ?? ""}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            Phone Number <span className="text-xs text-zinc-400">* Use this field to override your default company phone. *Not required</span>
          </label>
          <input
            name="phone"
            defaultValue={widget.phone ?? ""}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Use Phone as Button Link */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            Use Phone (Call) as Button Link? <span className="text-xs text-zinc-400">Currently the button is linked to: 1-888. *Not required</span>
          </label>
          <select
            name="usePhoneAsButtonLink"
            defaultValue={widget.usePhoneAsButtonLink ? "on" : ""}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">No</option>
            <option value="on">Yes</option>
          </select>
        </div>
      </div>

      {/* Social Media Buttons */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Social Media Buttons (if needed) <span className="text-xs text-red-500">*by placing a URL (or text) in any of the social URLs an icon will show on CTA widget</span>
        </h2>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Facebook URL/link</label>
          <input
            name="facebookUrl"
            defaultValue={widget.facebookUrl ?? ""}
            placeholder="http://www.facebook.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Twitter URL/link</label>
          <input
            name="twitterUrl"
            defaultValue={widget.twitterUrl ?? ""}
            placeholder="http://www.twitter.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Instagram URL/link</label>
          <input
            name="instagramUrl"
            defaultValue={widget.instagramUrl ?? ""}
            placeholder="http://www.instagram.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">YouTube URL/link</label>
          <input
            name="youtubeUrl"
            defaultValue={widget.youtubeUrl ?? ""}
            placeholder="http://www.youtube.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Pinterest URL/link</label>
          <input
            name="pinterestUrl"
            defaultValue={widget.pinterestUrl ?? ""}
            placeholder="http://www.pinterest.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">LinkedIn URL/link</label>
          <input
            name="linkedinUrl"
            defaultValue={widget.linkedinUrl ?? ""}
            placeholder="http://www.linkedin.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Images/Media */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Images/Media <span className="text-xs text-zinc-400">*Upload your CTA widget image here. *TS Best to use square image. 500x500</span>
        </h2>

        <input type="hidden" name="imageAssetId" value={imageAssetId} />

        <div className="flex items-start gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600">UPLOAD FEATURED IMAGE</label>
            <p className="text-[10px] text-zinc-400">*Must be jpg, png, or gif (2MB max file size) ⓘ</p>
          </div>
        </div>

        {/* Featured Image */}
        {widget.imageAsset && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Featured Image:</p>
            <img
              src={`/api/assets/${widget.imageAsset.id}`}
              alt=""
              className="h-32 w-48 rounded-lg border border-zinc-200 object-cover"
            />
          </div>
        )}

        <ImageUploader
          name="imageAssetId"
          label="Upload Image"
          currentAssetId={imageAssetId || null}
          onUpload={(id) => setImageAssetId(id)}
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "UPDATE/SAVE CALL-TO-ACTION WIDGET"}
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

      <div className="mt-6">
        <WordCounter source={html} />
      </div>
    </form>
  );
}
