"use client";

import { useMemo, useState, useTransition } from "react";
import RegionPicker, { type PickerRegion } from "@/components/regions/RegionPicker";
import {
  previewRegion,
  publishTemplate,
  type PreviewResult,
  type PublishResult,
} from "@/app/(admin)/admin/content/actions";

export interface TemplateOption {
  id: string;
  title: string;
  status: string;
  variantCount: number;
}

/**
 * Content-template variant publisher (§6.5b): pick a template, select target
 * regions (RegionPicker), preview rendered output, then publish — inline in dev,
 * via the Inngest job in production.
 */
export default function VariantPublisher({
  templates,
  regions,
  onPublished,
}: {
  templates: TemplateOption[];
  regions: PickerRegion[];
  onPublished?: () => void;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewRegionId, setPreviewRegionId] = useState<string>("");
  const [result, setResult] = useState<PublishResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const template = templates.find((t) => t.id === templateId);

  const previewTarget = useMemo(() => {
    if (previewRegionId && regionIds.includes(previewRegionId)) return previewRegionId;
    return regionIds[0] ?? "";
  }, [regionIds, previewRegionId]);

  const onPreview = () => {
    if (!previewTarget) return;
    setResult(null);
    startTransition(async () => {
      const res = await previewRegion(templateId, previewTarget);
      setPreview(res);
    });
  };

  const onPublish = () => {
    if (regionIds.length === 0) return;
    setResult(null);
    startTransition(async () => {
      const res = await publishTemplate(templateId, regionIds);
      setResult(res);
      if (res.ok) {
        setPreview(null);
        onPublished?.();
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <label className="block text-sm font-medium text-zinc-800">Content template</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} — {t.status.toLowerCase()} ({t.variantCount} variants)
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-800">Target regions</h3>
        <p className="mt-1 text-xs text-zinc-500">
          A variant is materialized per selected region. Pick 1 or more — no cap.
        </p>
        <div className="mt-3">
          <RegionPicker
            regions={regions}
            value={regionIds}
            onChange={setRegionIds}
            min={1}
            max={undefined}
            minHint="Select at least one region."
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-800">
            Preview region
          </label>
          <select
            value={previewTarget}
            onChange={(e) => setPreviewRegionId(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            disabled={regionIds.length === 0}
          >
            {regionIds.length === 0 && <option value="">Select regions first</option>}
            {regionIds.map((id) => {
              const r = regions.find((x) => x.id === id);
              return (
                <option key={id} value={id}>
                  {r ? (r.city ?? `${r.stateFull} (statewide)`) : id}
                </option>
              );
            })}
          </select>
        </div>
        <button
          onClick={onPreview}
          disabled={isPending || !previewTarget}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 disabled:opacity-40"
        >
          {isPending && !result ? "Rendering…" : "Preview"}
        </button>
        <button
          onClick={onPublish}
          disabled={isPending || regionIds.length === 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          Publish to {regionIds.length} region{regionIds.length === 1 ? "" : "s"}
        </button>
      </div>

      {preview?.ok && (
        <div>
          <h3 className="text-sm font-medium text-zinc-800">
            Preview — {template?.title}
          </h3>
          <div
            className="prose-sm mt-2 max-w-3xl rounded-xl border border-zinc-200 bg-white p-5 text-zinc-700"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        </div>
      )}
      {preview && !preview.ok && (
        <p className="text-sm text-red-600">{preview.error}</p>
      )}

      {result && (
        <p
          className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-600"}`}
          aria-live="polite"
        >
          {result.ok
            ? result.mode === "queued"
              ? "Publish job queued (Inngest). Variants will materialize shortly."
              : result.written === 0
                ? "No changes — selected regions already have current LIVE variants. Existing variants were kept."
                : `Published — ${result.written} variant${result.written === 1 ? "" : "s"} written.`
            : result.error}
        </p>
      )}
    </div>
  );
}