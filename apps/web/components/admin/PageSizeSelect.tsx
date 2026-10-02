"use client";

import { useRouter } from "next/navigation";

export default function PageSizeSelect({
  pageSize,
  filterParams,
  options,
}: {
  pageSize: string;
  filterParams: Record<string, string>;
  options: number[];
}) {
  const router = useRouter();

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-sm text-zinc-500">Show {pageSize} per page</span>
      <select
        value={pageSize}
        onChange={(e) => {
          const qs = new URLSearchParams({
            ...filterParams,
            pageSize: e.target.value,
            page: "1",
          });
          router.push(`/admin/products?${qs.toString()}`);
        }}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}
