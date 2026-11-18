import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { getCrmTimeline } from "@/modules/crm/activity";
import {
  CRM_ACTIVITY_LABELS,
  CRM_ACTIVITY_TYPES,
  type CrmActivityType,
} from "@/modules/crm/constants";
import { FlashBanner } from "@/components/admin/FlashBanner";
import CrmTimeline from "@/components/admin/crm/CrmTimeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Activities | Admin" };

export default async function CrmActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string; error?: string; ok?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const type = (CRM_ACTIVITY_TYPES as readonly string[]).includes(params.type ?? "")
    ? (params.type as string)
    : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const timeline = await getCrmTimeline({ search, type: type || undefined, page, pageSize: 50, access });

  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (type) query.set("type", type);
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return suffix ? `/admin/crm/activities?${suffix}` : "/admin/crm/activities";
  };

  return (
    <div>
      <FlashBanner error={params.error} ok={params.ok} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Activities</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every call, email, meeting, note, task, and stage change in one timeline.
          </p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search subject or body…"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <select name="type" defaultValue={type} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="">All types</option>
            {CRM_ACTIVITY_TYPES.map((activityType) => (
              <option key={activityType} value={activityType}>
                {CRM_ACTIVITY_LABELS[activityType as CrmActivityType]}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Filter</button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-500">
            {timeline.total} activity record(s) · page {page} of {timeline.totalPages}
          </span>
          <div className="flex gap-2 text-sm">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5">
                Previous
              </Link>
            )}
            {page < timeline.totalPages && (
              <Link href={pageHref(page + 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5">
                Next
              </Link>
            )}
          </div>
        </div>
        <div className="mt-4">
          <CrmTimeline
            items={timeline.items}
            emptyText="No activities match these filters. Log activity from a deal, lead, or client."
          />
        </div>
      </div>
    </div>
  );
}
