import Link from "next/link";
import { listHref, type ListParams } from "./params";

/**
 * Sortable table header. Clicking cycles the column between ascending and
 * descending and resets to page 1 — a normal link, so the navigation shows
 * the route loading state.
 */
export default function SortableTh({
  field,
  label,
  basePath,
  params,
  className = "px-4 py-2.5",
  align,
}: {
  field: string;
  label: string;
  basePath: string;
  params: ListParams;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const active = params.sort === field;
  const nextDir = active && params.dir === "asc" ? "desc" : "asc";
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <th
      scope="col"
      className={`${className} ${alignClass} ${
        active ? "text-zinc-700" : ""
      }`}
      aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <Link
        href={listHref(basePath, params, { sort: field, dir: nextDir, page: 1 })}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-zinc-900"
        title={`Sort by ${label}`}
      >
        {label}
        <span className="text-[10px] leading-none" aria-hidden="true">
          {active ? (params.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Link>
    </th>
  );
}
