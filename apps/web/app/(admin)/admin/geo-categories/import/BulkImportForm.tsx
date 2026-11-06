"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  previewGeoCategoryImport,
  importGeoCategoryImport,
  type GeoImportPreviewResult,
  type GeoImportCommitResult,
  type PreviewRow,
} from "./actions";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;
const ACCEPT = ".csv,.xlsx";

function actionBadge(row: PreviewRow) {
  if (row.errors.length) return { label: "Error", className: "bg-red-100 text-red-700" };
  switch (row.action) {
    case "create":
      return { label: "Create", className: "bg-emerald-100 text-emerald-700" };
    case "update":
      return { label: "Update", className: "bg-blue-100 text-blue-700" };
    default:
      return { label: "Skip", className: "bg-zinc-100 text-zinc-600" };
  }
}

export default function BulkImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [preview, setPreview] = useState<Extract<GeoImportPreviewResult, { ok: true }> | null>(null);
  const [result, setResult] = useState<Extract<GeoImportCommitResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset(all = false) {
    setPreview(null);
    setResult(null);
    setError(null);
    if (all) {
      setFile(null);
      setUpdateExisting(true);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    reset();
    const next = e.target.files?.[0] ?? null;
    if (!next) {
      setFile(null);
      return;
    }
    const ext = next.name.toLowerCase().slice(next.name.lastIndexOf("."));
    if (ext !== ".csv" && ext !== ".xlsx") {
      setFile(null);
      setError("Only .csv and .xlsx files are supported.");
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      setFile(null);
      setError(`File is ${(next.size / (1024 * 1024)).toFixed(1)} MB — the limit is 1.5 MB. Split it and import in batches.`);
      return;
    }
    setFile(next);
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    if (file) fd.append("file", file);
    fd.append("updateExisting", updateExisting ? "true" : "false");
    return fd;
  }

  async function handleDownloadTemplate() {
    setError(null);
    try {
      const response = await fetch("/api/admin/geo-categories/import-template");
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "geocategories-import-template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Template download failed — try again.");
    }
  }

  function handlePreview() {
    if (!file) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await previewGeoCategoryImport(buildFormData());
      if (!res.ok) {
        setPreview(null);
        setError(res.error);
      } else {
        setPreview(res);
      }
    });
  }

  function handleImport() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const res = await importGeoCategoryImport(buildFormData());
      if (!res.ok) {
        setError(res.error);
      } else {
        setResult(res);
        setPreview(null);
      }
    });
  }

  if (result) {
    const imported = result.created + result.updated;
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-sm font-medium text-emerald-900">Import complete</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Imported {imported} row{imported === 1 ? "" : "s"} from{" "}
          <span className="font-mono">{result.fileName}</span> — {result.created} created,{" "}
          {result.updated} updated, {result.skipped} skipped
          {result.failed.length ? `, ${result.failed.length} failed` : ""}.
        </p>
        {result.ignoredColumns.length > 0 && (
          <p className="mt-1 text-xs text-emerald-700">
            Ignored unknown columns: {result.ignoredColumns.join(", ")}.
          </p>
        )}
        {result.failed.length > 0 && (
          <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-red-200 bg-white p-3">
            <p className="text-xs font-medium text-red-700">Rows that were not imported:</p>
            <ul className="mt-1 space-y-1 text-xs text-zinc-700">
              {result.failed.map((f) => (
                <li key={f.row}>
                  <span className="font-mono">Row {f.row}</span>
                  {f.title !== "—" && <> — {f.title}</>}: {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <Link
            href="/admin/geo-categories"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            View GeoCategories
          </Link>
          <button
            type="button"
            onClick={() => reset(true)}
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  const summary = preview?.summary;
  const importable = summary ? summary.create + summary.update : 0;

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="import-file" className="block text-sm font-medium text-zinc-800">
            Spreadsheet file
          </label>
          <input
            id="import-file"
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={onFileChange}
            disabled={isPending}
            className="mt-2 block w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
          />
          <p className="mt-1 text-xs text-zinc-500">.csv or .xlsx · max 1.5 MB · up to 1,000 rows</p>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="mt-1 text-left text-xs font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            Download CSV template
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Update existing slugs
          </label>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!file || isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-40"
          >
            {isPending && !preview ? "Reading file…" : "Preview import"}
          </button>
        </div>
      </div>

      {file && !preview && !result && (
        <p className="mt-3 text-sm text-zinc-600">
          Selected: <span className="font-mono">{file.name}</span> (
          {(file.size / 1024).toFixed(1)} KB)
        </p>
      )}

      {preview && summary && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">
                Preview — <span className="font-mono font-normal">{preview.fileName}</span>
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                  {summary.create} create
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
                  {summary.update} update
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                  {summary.skip} skip
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    summary.error ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {summary.error} error{summary.error === 1 ? "" : "s"}
                </span>
              </div>
              {preview.ignoredColumns.length > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Ignored unknown columns: {preview.ignoredColumns.join(", ")}.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={isPending}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending || importable === 0}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-40"
              >
                {isPending
                  ? "Importing…"
                  : importable === 0
                    ? "Nothing to import"
                    : `Import ${importable} row${importable === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>

          {summary.error > 0 && (
            <p className="mt-3 text-xs text-red-600">
              Rows with errors are excluded from the import — fix them in the file and
              re-upload, or import now to process only the valid rows.
            </p>
          )}

          <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {preview.rows.map((r) => {
                  const badge = actionBadge(r);
                  return (
                    <tr key={r.row} className={r.errors.length ? "bg-red-50" : "hover:bg-zinc-50"}>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-500">{r.row}</td>
                      <td className="max-w-56 truncate px-3 py-2 text-zinc-900">{r.title || "—"}</td>
                      <td className="max-w-48 truncate px-3 py-2 font-mono text-xs text-zinc-600">
                        {r.slug || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600">{r.errors.join(" ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
