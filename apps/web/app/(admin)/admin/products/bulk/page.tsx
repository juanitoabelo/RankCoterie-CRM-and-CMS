"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BulkActionsPage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="ids"]');
    if (e.target.checked) {
      setSelectedIds(Array.from(checkboxes).map((cb) => cb.value));
    } else {
      setSelectedIds([]);
    }
  };

  const handleIdChange = (id: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((id) => id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIds.length) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      selectedIds.forEach((id) => formData.append("ids", id));
      formData.append("action", action);
      if (value) formData.append("value", value);

      const response = await fetch("/api/admin/products/bulk", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (data.ok) {
        setMessage({ type: "success", text: `Successfully updated ${data.count} listing(s)` });
        setSelectedIds([]);
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to process request" });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIds.length) return;
    
    try {
      const formData = new FormData();
      selectedIds.forEach((id) => formData.append("ids", id));
      formData.append("format", "csv");

      const response = await fetch("/api/admin/products/export", {
        method: "POST",
        body: formData,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `listings-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setMessage({ type: "error", text: "Export failed" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Bulk Actions</h1>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 rounded-lg p-4 ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && document.querySelectorAll('input[name="ids"]').length === selectedIds.length}
                onChange={(e) => {
                  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="ids"]');
                  if (e.target.checked) {
                    setSelectedIds(Array.from(checkboxes).map((cb) => cb.value));
                  } else {
                    setSelectedIds([]);
                  }
                }}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-zinc-900">Select All</span>
              {selectedIds.length > 0 && (
                <span className="ml-2 text-sm text-zinc-500">({selectedIds.length} selected)</span>
              )}
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0}
                      onChange={(e) => {
                        const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="ids"]');
                        if (e.target.checked) {
                          setSelectedIds(Array.from(checkboxes).map((cb) => cb.value));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-3 text-left font-medium text-zinc-500">Title</th>
                  <th className="p-3 text-left font-medium text-zinc-500">Tier</th>
                  <th className="p-3 text-left font-medium text-zinc-500">Status</th>
                  <th className="p-3 text-left font-medium text-zinc-500">City/State</th>
                  <th className="p-3 text-left font-medium text-zinc-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-500">
                    This page lists all listings for bulk actions.
                    <br />
                    In a full implementation, listings would be server-rendered here.
                    <br />
                    Use the checkboxes to select listings, then choose an action below.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Bulk Action</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Action</label>
              <select
                name="action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Action</option>
                <option value="status">Change Status</option>
                <option value="tier">Change Tier</option>
                <option value="featured">Toggle Featured</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Value</label>
              <select
                name="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Value</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="LIVE">LIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="FREE">FREE</option>
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="FEATURED">FEATURED</option>
                <option value="SUPPRESSED">SUPPRESSED</option>
                <option value="true">Featured</option>
                <option value="false">Not Featured</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={!action || !value || loading}
                className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Apply to Selected"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}