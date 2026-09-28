"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomFonts } from "@/components/admin/CustomFontProvider";
import {
  FONT_WEIGHTS,
  MAX_FONT_BYTES,
  fontStackFor,
  sanitizeFontFamily,
  type CustomFontFile,
} from "@/lib/custom-fonts";

const ACCEPT = ".woff2,.woff,.ttf,.otf";

/** Best-effort family name from an uploaded filename, e.g. "CanopyDisplay-Bold.woff2". */
function familyFromFilename(name: string): string {
  return sanitizeFontFamily(
    name
      .replace(/\.(woff2|woff|ttf|otf)$/i, "")
      .replace(/[-_](regular|bold|italic|oblique|light|medium|semibold|black|thin)$/i, "")
      .replace(/[-_](100|200|300|400|500|600|700|800|900)$/i, ""),
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function weightLabel(weight: string): string {
  if (weight === "variable") return "Variable";
  return weight;
}

type Status = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string } | { kind: "ok"; message: string };

export default function CustomFontsEditor() {
  const router = useRouter();
  const fonts = useCustomFonts();
  const fileRef = useRef<HTMLInputElement>(null);

  const [family, setFamily] = useState("");
  const [weight, setWeight] = useState("400");
  const [style, setStyle] = useState<"normal" | "italic">("normal");
  const [mono, setMono] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  /** Families collapsed to one row, each showing the weights it ships with. */
  const grouped = useMemo(() => {
    const map = new Map<string, CustomFontFile[]>();
    for (const font of fonts) {
      const list = map.get(font.family) ?? [];
      list.push(font);
      map.set(font.family, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [fonts]);

  const totalBytes = fonts.reduce((sum, f) => sum + f.size, 0);

  function handleFileChange(file: File | undefined) {
    if (!file) return;
    // Only prefill when the admin has not already named the family.
    if (!family.trim()) setFamily(familyFromFilename(file.name));
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ kind: "error", message: "Choose a font file first." });
      return;
    }
    if (file.size > MAX_FONT_BYTES) {
      setStatus({ kind: "error", message: "Font files must be 5 MB or smaller." });
      return;
    }

    setStatus({ kind: "busy" });
    const body = new FormData();
    body.set("file", file);
    body.set("family", family);
    body.set("weight", weight);
    body.set("style", style);
    if (mono) body.set("mono", "on");

    try {
      const res = await fetch("/api/custom-fonts", { method: "POST", body });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error ?? "Upload failed." });
        return;
      }
      setStatus({ kind: "ok", message: `Added “${sanitizeFontFamily(family)}” to every font dropdown.` });
      setFamily("");
      setWeight("400");
      setStyle("normal");
      setMono(false);
      if (fileRef.current) fileRef.current.value = "";
      // Re-render the admin layout so the new family reaches all font dropdowns.
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: "Upload failed. Check your connection and try again." });
    }
  }

  async function handleDelete(id: string) {
    setStatus({ kind: "busy" });
    try {
      const res = await fetch(`/api/custom-fonts/${id}?family=1`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({ kind: "error", message: data.error ?? "Delete failed." });
        return;
      }
      setStatus({ kind: "ok", message: "Font removed." });
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: "Delete failed. Check your connection and try again." });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-snug text-zinc-500">
        Upload a font once and it becomes selectable in <strong>every</strong> font
        dropdown across the page, page-layout, header/footer, and blog-template
        builders, plus the theme typography selects above. WOFF2 is smallest; TTF
        and OTF work too (max 5 MB). Upload one file per weight — extra weights of
        the same family show up as one entry.
      </p>

      <form onSubmit={handleUpload} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Font file
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              required
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
            />
            <span className="mt-1 block text-[10px] text-zinc-400">WOFF2, WOFF, TTF, or OTF</span>
          </label>

          <label className="block text-xs font-medium text-zinc-600">
            Font family name
            <input
              type="text"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              required
              maxLength={60}
              placeholder="Canopy Display"
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[10px] text-zinc-400">
              This is the name editors pick from. Letters, numbers, spaces, hyphens.
            </span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-medium text-zinc-600">
            Weight
            <select
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-zinc-600">
            Style
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as "normal" | "italic")}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
            </select>
          </label>

          <label className="flex items-end gap-2 pb-2 text-xs font-medium text-zinc-600">
            <input
              type="checkbox"
              checked={mono}
              onChange={(e) => setMono(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Monospace fallback
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-100 pt-3">
          <button
            type="submit"
            disabled={status.kind === "busy"}
            className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.kind === "busy" ? "Uploading…" : "Upload font"}
          </button>
          {status.kind === "error" && <span className="text-xs text-red-600">{status.message}</span>}
          {status.kind === "ok" && <span className="text-xs text-green-700">{status.message}</span>}
        </div>
      </form>

      {/* ── Uploaded families ───────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            Uploaded fonts
          </h3>
          {fonts.length > 0 && (
            <span className="text-[10px] text-zinc-400">
              {grouped.length} {grouped.length === 1 ? "family" : "families"} · {formatSize(totalBytes)}
            </span>
          )}
        </div>

        {grouped.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-400">
            No custom fonts yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {grouped.map(([name, files]) => {
              const mono = files.some((f) => f.mono);
              return (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                >
                  <span
                    className="truncate text-sm text-zinc-800"
                    style={{ fontFamily: fontStackFor(name, mono) }}
                  >
                    {name}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {files.map((f) => (
                      <span
                        key={f.id}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
                      >
                        {weightLabel(f.weight)}
                        {f.style === "italic" ? " · Italic" : ""}
                      </span>
                    ))}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(files[0].id)}
                    disabled={status.kind === "busy"}
                    className="ml-auto shrink-0 text-[10px] font-bold uppercase text-red-600 hover:text-red-800 disabled:opacity-50"
                    title="Delete this family and all of its weights"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
