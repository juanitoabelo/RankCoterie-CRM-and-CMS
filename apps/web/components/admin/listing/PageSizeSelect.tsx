"use client";

import { useRouter } from "next/navigation";
import {
  listHref,
  PAGE_SIZE_OPTIONS,
  type ListParams,
} from "./params";

/** Client page-size picker — pushes a fresh href so the server re-queries. */
export default function PageSizeSelect({
  basePath,
  params,
  options = PAGE_SIZE_OPTIONS as unknown as number[],
}: {
  basePath: string;
  params: ListParams;
  options?: number[];
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-500">
      <span>Per page</span>
      <select
        value={params.pageSize}
        onChange={(e) => {
          router.push(
            listHref(basePath, params, {
              pageSize: Number(e.target.value),
              page: 1,
            }),
          );
        }}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
