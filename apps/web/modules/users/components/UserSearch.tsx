/**
 * Users Module — Search Component
 * 
 * Search and filter controls for the users admin page.
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface UserSearchProps {
  department: string;
}

export function UserSearch({ department }: UserSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    const dept = formData.get("department") as string;
    
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dept && dept !== "All") params.set("department", dept);
    
    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="search"
        name="search"
        defaultValue={searchParams.get("search") ?? ""}
        placeholder="Search users…"
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
      />
      <select
        name="department"
        defaultValue={department}
        className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      >
        <option value="All">All departments</option>
        <option value="Editorial">Editorial</option>
        <option value="Marketing">Marketing</option>
        <option value="Sales">Sales</option>
        <option value="Support">Support</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
