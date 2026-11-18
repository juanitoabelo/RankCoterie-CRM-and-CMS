import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { getCrmDeals, getCrmStagesWithCounts, getCrmUsers } from "@/modules/crm/queries";
import { getCrmSettings } from "@/modules/crm/settings";
import { crmDealBulkForm } from "@/modules/crm/actions";
import { FlashBanner } from "@/components/admin/FlashBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Deals | Admin" };

function money(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CrmDealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    owner?: string;
    page?: string;
    error?: string;
    ok?: string;
  }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const stageFilter = params.stage?.trim() ?? "";
  const ownerFilter = params.owner?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const [{ items, total, totalPages }, stages, users, settings] = await Promise.all([
    getCrmDeals({
      search: query,
      stageId: stageFilter || undefined,
      ownerId: ownerFilter || undefined,
      page,
      access,
    }),
    getCrmStagesWithCounts(access),
    getCrmUsers(),
    getCrmSettings(),
  ]);
  const currency = settings.defaultCurrency;

  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (stageFilter) search.set("stage", stageFilter);
    if (ownerFilter) search.set("owner", ownerFilter);
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return suffix ? `/admin/crm/deals?${suffix}` : "/admin/crm/deals";
  };

  return (
    <div>
      <FlashBanner error={params.error} ok={params.ok} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Deals</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} deal(s) · {stages.filter((stage) => !stage.isWon && !stage.isLost).length} open
            stages
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Link
            href="/admin/crm/pipeline"
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Pipeline board
          </Link>
          <Link
            href="/admin/crm/deals/new"
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
          >
            New deal
          </Link>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search deals…"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <select
              name="stage"
              defaultValue={stageFilter}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">All stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label} ({stage.dealCount})
                </option>
              ))}
            </select>
            <select
              name="owner"
              defaultValue={ownerFilter}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">All owners</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Filter</button>
          </form>
        </div>
      </div>

      <form
        id="crm-bulk-form"
        action={crmDealBulkForm}
        className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-3"
      >
        <label className="block text-xs text-zinc-500">
          Bulk action
          <select name="bulkAction" defaultValue="stage" className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="stage">Move stage</option>
            <option value="owner">Reassign owner</option>
            <option value="delete">Delete deals</option>
          </select>
        </label>
        <label className="block text-xs text-zinc-500">
          Stage
          <select name="bulkStageId" defaultValue="" className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="">— choose stage —</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-zinc-500">
          Owner
          <select name="bulkOwnerId" defaultValue="" className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="">— unassigned —</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
          Apply to selected
        </button>
      </form>

      <table className="mt-4 w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">
              <span className="sr-only">Select</span>
            </th>
            <th className="py-2 pr-4">Deal</th>
            <th className="py-2 pr-4">Stage</th>
            <th className="py-2 pr-4">Value</th>
            <th className="py-2 pr-4">Owner</th>
            <th className="py-2 pr-4">Expected close</th>
            <th className="py-2 pr-4">Next task</th>
            <th className="py-2 pr-4">Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {items.map((deal) => (
            <tr key={deal.id} className="hover:bg-zinc-50">
              <td className="py-3 pr-4">
                <input
                  type="checkbox"
                  name="dealIds"
                  value={deal.id}
                  form="crm-bulk-form"
                  className="rounded border-zinc-300"
                />
              </td>
              <td className="py-3 pr-4">
                <Link
                  href={`/admin/crm/deals/${deal.id}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  {deal.title}
                </Link>
                <p className="text-xs text-zinc-400">
                  {deal.companyName ?? deal.contactName ?? "—"}
                  {deal.contactEmail ? ` · ${deal.contactEmail}` : ""}
                </p>
              </td>
              <td className="py-3 pr-4">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  {deal.stageLabel}
                </span>
              </td>
              <td className="py-3 pr-4 font-medium text-zinc-800">
                {money(deal.value, deal.currency)}
              </td>
              <td className="py-3 pr-4 text-zinc-600">{deal.ownerName ?? "Unassigned"}</td>
              <td className="py-3 pr-4 text-zinc-600">
                {deal.expectedCloseDate ? deal.expectedCloseDate.toISOString().slice(0, 10) : "—"}
              </td>
              <td className="py-3 pr-4 text-zinc-600">
                {deal.nextTask ? (
                  <>
                    {deal.nextTask.text}
                    <span className="block text-xs text-zinc-400">
                      {deal.nextTask.dueAt ? deal.nextTask.dueAt.toISOString().slice(0, 10) : "no due date"}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3 pr-4 text-zinc-500">{deal.activityCount} entries</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="py-10 text-center text-sm text-zinc-400">
                No deals match these filters.{" "}
                <Link href="/admin/crm/deals/new" className="text-zinc-600 underline hover:text-zinc-900">
                  Create the first deal
                </Link>
                .
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-zinc-500">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5">
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5">
              Next
            </Link>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-400">Currency: {currency}</p>
    </div>
  );
}
