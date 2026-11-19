import { Prisma } from "@prisma/client";
import Link from "next/link";
import type { CrmActivityItem } from "@/modules/crm/activity";
import { CRM_ACTIVITY_LABELS, type CrmActivityType } from "@/modules/crm/constants";

const typeStyles: Record<string, string> = {
  NOTE: "bg-zinc-100 text-zinc-600",
  CALL: "bg-sky-50 text-sky-700",
  EMAIL: "bg-indigo-50 text-indigo-700",
  MEETING: "bg-violet-50 text-violet-700",
  STAGE_CHANGE: "bg-amber-50 text-amber-700",
  TASK: "bg-emerald-50 text-emerald-700",
  ASSIGNMENT: "bg-blue-50 text-blue-700",
  SYSTEM: "bg-zinc-100 text-zinc-500",
};

function labelFor(type: string): string {
  return CRM_ACTIVITY_LABELS[type as CrmActivityType] ?? type;
}

function formatWhen(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function metadataText(value: Prisma.JsonValue, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : null;
}

function metadataFlag(value: Prisma.JsonValue, key: string): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (value as Record<string, unknown>)[key] === true;
}

export default function CrmTimeline({
  items,
  emptyText = "No CRM activity yet.",
  compact = false,
}: {
  items: CrmActivityItem[];
  emptyText?: string;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyText}</p>;
  }

  return (
    <ol className={compact ? "space-y-3" : "space-y-4"}>
      {items.map((item) => {
        const emailTo = item.type === "EMAIL" ? metadataText(item.metadata, "to") : null;
        const emailFrom = item.type === "EMAIL" ? metadataText(item.metadata, "from") : null;
        const emailTracked = item.type === "EMAIL" && metadataFlag(item.metadata, "trackingEnabled");
        return (
        <li key={item.id} className="relative border-l border-zinc-200 pl-4">
          <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-zinc-300" />
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                typeStyles[item.type] ?? "bg-zinc-100 text-zinc-500"
              }`}
            >
              {labelFor(item.type)}
            </span>
            <span className="text-xs text-zinc-400">{formatWhen(item.occurredAt)}</span>
            {item.userName && <span className="text-xs text-zinc-400">· {item.userName}</span>}
          </div>
          {item.subject && <p className="mt-1 text-sm font-medium text-zinc-800">{item.subject}</p>}
          {item.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-600">{item.body}</p>}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
            {emailTo && <span>To: {emailTo}</span>}
            {emailFrom && <span>From: {emailFrom}</span>}
            {emailTracked && <span className="text-indigo-600">Tracked</span>}
            {item.dealId && item.dealTitle && (
              <Link href={`/admin/crm/deals/${item.dealId}`} className="underline hover:text-zinc-700">
                {item.dealTitle}
              </Link>
            )}
            {item.leadId && item.leadName && (
              <Link href={`/admin/leads/${item.leadId}`} className="underline hover:text-zinc-700">
                Lead: {item.leadName}
              </Link>
            )}
            {item.clientId && item.clientName && (
              <Link href={`/admin/clients/${item.clientId}`} className="underline hover:text-zinc-700">
                Client: {item.clientName}
              </Link>
            )}
          </div>
        </li>
        );
      })}
    </ol>
  );
}
