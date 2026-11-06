import Link from "next/link";
import { GEO_IMPORT_COLUMNS } from "@/lib/admin/geo-category-import";
import BulkImportForm from "./BulkImportForm";

export const revalidate = 0;

export default function GeoCategoryImportPage() {
  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Geo-Targeting</span> /{" "}
        <span className="text-zinc-700">Bulk Import</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Bulk Import GeoCategories</h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-600">
        Upload a CSV or Excel file with one row per GeoCategory. You&apos;ll get a preview
        with per-row validation before anything is written. Rows whose slug already exists
        are created as updates (or skipped, if you turn that off).
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/geo-categories"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ← Back to GeoCategories
        </Link>
      </div>

      <BulkImportForm />

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-900">Columns</h2>
          <p className="mt-1 text-xs text-zinc-500">
            The first row must be the header row. Headers are matched
            case-insensitively; common legacy spellings (Domain Key, StateDesc,
            Keywords, …) are accepted too. Up to 1,000 rows per file.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Column</th>
              <th className="px-4 py-2.5">Format</th>
              <th className="px-4 py-2.5">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {GEO_IMPORT_COLUMNS.map((col) => (
              <tr key={col.key} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {col.header}
                  {col.required && <span className="ml-1 text-red-600">*</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{col.format ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{col.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
          <p>
            <strong>Not part of the sheet:</strong> alternate state intros, content sections and
            section assignments — manage those on each GeoCategory&apos;s edit page after import.
          </p>
          <p className="mt-1">
            Parent/State/City images must already be in the Media Library: paste the asset ID or
            its <code className="rounded bg-zinc-200 px-1 py-0.5">/api/assets/…</code> URL (open
            the image in the Media Library and copy the path).
          </p>
          <p className="mt-1">
            On update, blank cells leave the existing value unchanged; filled cells overwrite
            it. The slug column is the matching key.
          </p>
        </div>
      </div>
    </div>
  );
}
