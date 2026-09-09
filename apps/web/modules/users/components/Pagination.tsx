/**
 * Users Module — Pagination Component
 * 
 * Pagination controls for the users admin page.
 */
import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  search?: string;
  department?: string;
}

export function Pagination({ page, totalPages, totalCount, search, department }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (department && department !== "All") params.set("department", department);
    if (p > 1) params.set("page", String(p));
    const query = params.toString();
    return `/admin/users${query ? `?${query}` : ""}`;
  };

  return (
    <nav className="mt-6 flex items-center justify-between">
      <p className="text-sm text-zinc-500">
        Page {page} of {totalPages} ({totalCount} users)
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildHref(page - 1)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-300"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildHref(page + 1)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-300"
          >
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
