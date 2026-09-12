"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWidget, type ActionResult } from "../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import ImageUploader from "@/components/admin/ImageUploader";
import WordCounter from "@/components/admin/WordCounter";

interface CompanyOption {
  id: string;
  name: string;
}

export default function NewWidgetForm({
  companyOptions,
}: {
  companyOptions: CompanyOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [html, setHtml] = useState("");
  const [imageAssetId, setImageAssetId] = useState("");

  function onSubmit(formData: FormData) {
    formData.set("html", html);
    formData.set("imageAssetId", imageAssetId);
    setMessage(null);
    startTransition(async () => {
      const res = await createWidget(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/widgets");
    });
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Widget created." : message.error}
        </p>
      )}

      {/* Widget/Listing Content */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Widget/Listing Content</h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">Widget Title</label>
          <input
            name="title"
            required
            placeholder="Enter widget title"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">Widget URL (page url)</label>
          <input
            name="url"
            placeholder="http://www.example.com"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Widget Text */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900">Widget Text</label>
          <input type="hidden" name="html" value={html} />
          <div className="mt-2">
            <RichTextarea
              name="_html"
              label=""
              value={html}
              onChange={setHtml}
              placeholder="Write widget content..."
            />
          </div>
        </div>

        {/* Keywords/Tags */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">Keywords/Tags (comma separated)</label>
          <input
            name="keywords"
            placeholder="keyword1, keyword2, keyword3"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">Company</label>
          <select
            name="companyId"
            defaultValue=""
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">— Select Company —</option>
            {companyOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* CTA Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            CTA Description <span className="text-xs text-zinc-400">* This is the top &quot;sales&quot; text in CTA widget. 150 character max. *Not required</span>
          </label>
          <input
            name="ctaDescription"
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
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* CTA Button Text */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            CTA Button Text <span className="text-xs text-zinc-400">* By default the button text links to the URL above. 20 character max. **Required</span>
          </label>
          <input
            name="ctaButtonText"
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
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Use Phone as Button Link */}
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            Use Phone (Call) as Button Link? <span className="text-xs text-zinc-400">*Not required</span>
          </label>
          <select
            name="usePhoneAsButtonLink"
            defaultValue=""
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
            placeholder="http://www.facebook.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Twitter URL/link</label>
          <input
            name="twitterUrl"
            placeholder="http://www.twitter.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Instagram URL/link</label>
          <input
            name="instagramUrl"
            placeholder="http://www.instagram.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">YouTube URL/link</label>
          <input
            name="youtubeUrl"
            placeholder="http://www.youtube.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Pinterest URL/link</label>
          <input
            name="pinterestUrl"
            placeholder="http://www.pinterest.com/yourbusinesspage"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">LinkedIn URL/link</label>
          <input
            name="linkedinUrl"
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

        <ImageUploader
          name="imageAssetId"
          label="Upload Image"
          currentAssetId={imageAssetId || null}
          onUpload={(id) => setImageAssetId(id)}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
      >
        {isPending ? "Saving..." : "SAVE NEW LISTING"}
      </button>

      <div className="mt-6">
        <WordCounter source={html} />
      </div>
    </form>
  );
}
