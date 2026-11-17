import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { getCrmDeal, getCrmUsers } from "@/modules/crm/queries";
import { getCrmTimeline } from "@/modules/crm/activity";
import { getCrmStages } from "@/modules/crm/stages";
import {
  CRM_ACTIVITY_TYPES,
  CRM_ACTIVITY_LABELS,
  CRM_DEAL_SOURCES,
  CRM_TASK_PRIORITIES,
  type CrmActivityType,
} from "@/modules/crm/constants";
import {
  crmActivityForm,
  crmDealUpdateForm,
  crmTaskForm,
  crmDealDeleteForm,
} from "@/modules/crm/actions";
import { FlashBanner } from "@/components/admin/FlashBanner";
import CrmTaskList from "@/components/admin/crm/CrmTaskList";
import CrmTimeline from "@/components/admin/crm/CrmTimeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Deal | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";
const selectCls = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function personName(person: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.email || "Unnamed";
}

export default async function CrmDealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("crm");
  const { id } = await params;
  const { error, ok } = await searchParams;
  const [deal, stages, users, timeline] = await Promise.all([
    getCrmDeal(id),
    getCrmStages(),
    getCrmUsers(),
    getCrmTimeline({ dealId: id, pageSize: 30 }),
  ]);
  if (!deal) notFound();

  const userById = new Map(users.map((user) => [user.id, user]));
  const returnTo = `/admin/crm/deals/${deal.id}`;
  const taskRows = deal.tasks.map((task) => ({
    ...task,
    assigneeName: task.assigneeId
      ? `${userById.get(task.assigneeId)?.firstName ?? ""} ${
          userById.get(task.assigneeId)?.lastName ?? ""
        }`.trim() || userById.get(task.assigneeId)?.email
      : null,
  }));
  const openTasks = taskRows.filter((task) => !task.finishedAt);
  const closedTasks = taskRows.filter((task) => task.finishedAt);

  return (
    <div>
      <Link href="/admin/crm/deals" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to deals
      </Link>
      <FlashBanner error={error} ok={ok} />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{deal.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {deal.stage.label} · {money(deal.valueNumber, deal.currency)} ·{" "}
            {deal.probability ?? deal.stage.probability}% ·{" "}
            {deal.ownerName ? `owner ${deal.ownerName}` : "unassigned"}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {deal.lead && (
              <Link href={`/admin/leads/${deal.lead.id}`} className="text-zinc-600 underline">
                Lead: {personName(deal.lead)}
              </Link>
            )}
            {deal.client && (
              <Link href={`/admin/clients/${deal.client.id}`} className="text-zinc-600 underline">
                Client: {personName(deal.client)}
              </Link>
            )}
            {!deal.lead && !deal.client && <span className="text-zinc-400">No linked record</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={crmDealUpdateForm} className="flex items-center gap-2">
            <input type="hidden" name="dealId" value={deal.id} />
            <input type="hidden" name="title" value={deal.title} />
            <input type="hidden" name="value" value={deal.valueNumber} />
            <input type="hidden" name="currency" value={deal.currency} />
            <input type="hidden" name="probability" value={deal.probability ?? ""} />
            <input type="hidden" name="expectedCloseDate" value={deal.expectedCloseDate?.toISOString().slice(0, 10) ?? ""} />
            <input type="hidden" name="source" value={deal.source ?? ""} />
            <input type="hidden" name="ownerId" value={deal.ownerId ?? ""} />
            <input type="hidden" name="leadId" value={deal.leadId ?? ""} />
            <input type="hidden" name="clientId" value={deal.clientId ?? ""} />
            <input type="hidden" name="companyName" value={deal.companyName ?? ""} />
            <input type="hidden" name="contactName" value={deal.contactName ?? ""} />
            <input type="hidden" name="contactEmail" value={deal.contactEmail ?? ""} />
            <input type="hidden" name="contactPhone" value={deal.contactPhone ?? ""} />
            <input type="hidden" name="notes" value={deal.notes ?? ""} />
            <input type="hidden" name="lostReason" value={deal.lostReason ?? ""} />
            <select name="stageId" defaultValue={deal.stageId} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
              Move stage
            </button>
          </form>
          <form action={crmDealDeleteForm}>
            <input type="hidden" name="dealId" value={deal.id} />
            <button className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Deal details</h2>
          <form action={crmDealUpdateForm} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="dealId" value={deal.id} />
            <input type="hidden" name="leadId" value={deal.leadId ?? ""} />
            <input type="hidden" name="clientId" value={deal.clientId ?? ""} />
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">Title</span>
              <input name="title" required defaultValue={deal.title} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Value</span>
              <input name="value" type="number" min="0" step="0.01" defaultValue={deal.valueNumber} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Currency</span>
              <input name="currency" maxLength={3} defaultValue={deal.currency} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Stage</span>
              <select name="stageId" defaultValue={deal.stageId} className={selectCls}>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label} ({stage.probability}%)
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Probability override</span>
              <input
                name="probability"
                type="number"
                min="0"
                max="100"
                defaultValue={deal.probability ?? ""}
                placeholder="Use stage default"
                className={inputCls}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Owner</span>
              <select name="ownerId" defaultValue={deal.ownerId ?? ""} className={selectCls}>
                <option value="">— unassigned —</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Expected close date</span>
              <input
                name="expectedCloseDate"
                type="date"
                defaultValue={deal.expectedCloseDate?.toISOString().slice(0, 10) ?? ""}
                className={inputCls}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Source</span>
              <select name="source" defaultValue={deal.source ?? ""} className={selectCls}>
                <option value="">— none —</option>
                {deal.source && !(CRM_DEAL_SOURCES as readonly string[]).includes(deal.source) && (
                  <option value={deal.source}>{deal.source}</option>
                )}
                {CRM_DEAL_SOURCES.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Lost reason</span>
              <input name="lostReason" defaultValue={deal.lostReason ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Company</span>
              <input name="companyName" defaultValue={deal.companyName ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Contact name</span>
              <input name="contactName" defaultValue={deal.contactName ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Contact email</span>
              <input name="contactEmail" type="email" defaultValue={deal.contactEmail ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Contact phone</span>
              <input name="contactPhone" type="tel" defaultValue={deal.contactPhone ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">Notes</span>
              <textarea name="notes" rows={4} defaultValue={deal.notes ?? ""} className={inputCls} />
            </label>
            <div className="sm:col-span-2">
              <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
                Save deal
              </button>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Open tasks ({openTasks.length})
            </h2>
            <form action={crmTaskForm} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                name="text"
                required
                placeholder="Follow up, send proposal…"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm sm:col-span-2"
              />
              <input name="dueAt" type="date" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm" />
              <select name="priority" defaultValue="NORMAL" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
                {CRM_TASK_PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
              <select name="assigneeId" defaultValue={deal.ownerId ?? ""} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2">
                <option value="">— unassigned —</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white sm:col-span-2">
                Add task
              </button>
            </form>
            <div className="mt-4">
              <CrmTaskList tasks={openTasks} returnTo={returnTo} emptyText="No open tasks." />
            </div>
            {closedTasks.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-zinc-400">
                  Completed tasks ({closedTasks.length})
                </summary>
                <div className="mt-2">
                  <CrmTaskList tasks={closedTasks} returnTo={returnTo} />
                </div>
              </details>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Log activity
            </h2>
            <form action={crmActivityForm} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <select name="type" defaultValue="CALL" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
                {CRM_ACTIVITY_TYPES.filter((type) => type !== "SYSTEM" && type !== "STAGE_CHANGE").map((type) => (
                  <option key={type} value={type}>
                    {CRM_ACTIVITY_LABELS[type as CrmActivityType]}
                  </option>
                ))}
              </select>
              <input name="occurredAt" type="datetime-local" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm" />
              <input
                name="subject"
                placeholder="Subject"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm sm:col-span-2"
              />
              <textarea
                name="body"
                rows={3}
                placeholder="What happened?"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm sm:col-span-2"
              />
              <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white sm:col-span-2">
                Log activity
              </button>
            </form>
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Timeline</h2>
          <span className="text-xs text-zinc-400">{timeline.total} entries</span>
        </div>
        <div className="mt-4">
          <CrmTimeline items={timeline.items} emptyText="No activity on this deal yet." />
        </div>
      </section>
    </div>
  );
}
