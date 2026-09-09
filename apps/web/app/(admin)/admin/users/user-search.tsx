"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserSearch({ department }: { department?: string }) {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState(department ?? "All");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dept && dept !== "All") params.set("department", dept);
    router.push(`/admin/users?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-4">
      <label className="block text-xs font-medium text-zinc-600 flex-1">
        Search Users
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or email..."
          className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600 w-48">
        Department
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="All">All</option>
          <option value="Administrators">Administrators</option>
          <option value="Editors">Editors</option>
          <option value="Marketing">Marketing</option>
          <option value="Sales">Sales</option>
          <option value="Support">Support</option>
        </select>
      </label>
      <button
        type="submit"
        className="rounded bg-zinc-900 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-zinc-700"
      >
        View Users
      </button>
    </form>
  );
}
