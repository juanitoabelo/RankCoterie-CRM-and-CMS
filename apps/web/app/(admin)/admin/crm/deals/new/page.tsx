import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { getCrmLinkOptions, getCrmUsers } from "@/modules/crm/queries";
import { getCrmStages } from "@/modules/crm/stages";
import { getCrmSettings } from "@/modules/crm/settings";
import { getDealTemplate } from "@/modules/crm/deal-templates";
import { CRM_DEAL_SOURCES } from "@/modules/crm/constants";
import { crmDealCreateForm } from "@/modules/crm/actions";
import { FlashBanner } from "@/components/admin/FlashBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "New Deal | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";
const selectCls = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

function personName(person: { firstName: string | null; lastName: string | null; email: string | null }) {
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.email || "Unnamed";
}

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; template?: string }>;
}) {
  await requireSection("crm");
  const { error, ok, template: templateId } = await searchParams;
  const [stages, users, settings, links, template] = await Promise.all([
    getCrmStages(),
    getCrmUsers(),
    getCrmSettings(),
    getCrmLinkOptions(),
    templateId ? getDealTemplate(templateId) : Promise.resolve(null),
  ]);
  const defaults = template?.defaults;
  const fallbackStage = stages.find((stage) => !stage.isWon && !stage.isLost) ?? stages[0];
  const defaultStage = defaults?.stageKey
    ? stages.find((stage) => stage.key.toLowerCase() === defaults.stageKey?.toLowerCase()) ?? fallbackStage
    : fallbackStage;
  const defaultSource = defaults?.source && CRM_DEAL_SOURCES.includes(defaults.source as (typeof CRM_DEAL_SOURCES)[number])
    ? defaults.source
    : "Inbound";

  return (
    <div>
      <Link href="/admin/crm/deals" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to deals
      </Link>
      <FlashBanner error={error} ok={ok} />
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">New deal</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Add a deal to the pipeline. You can link it to a lead or client, or keep it standalone.
      </p>

      <form action={crmDealCreateForm} className="mt-6 grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 lg:grid-cols-2">
        {template ? <input type="hidden" name="templateId" value={template.id} /> : null}
        {template ? <input type="hidden" name="lineItemsJson" value={JSON.stringify(defaults?.lineItems ?? [])} /> : null}
        {defaultStage?.pipelineId ? <input type="hidden" name="pipelineId" value={defaultStage.pipelineId} /> : null}
        <label className="block text-sm lg:col-span-2">
          <span className="text-zinc-600">Deal title *</span>
          <input name="title" required defaultValue={defaults?.title ?? ""} placeholder="e.g. Annual listing package" className={inputCls} />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-600">Value</span>
          <input name="value" type="number" min="0" step="0.01" defaultValue={defaults?.value ?? 0} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Currency</span>
          <input name="currency" defaultValue={defaults?.currency || settings.defaultCurrency} maxLength={3} className={inputCls} />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-600">Stage</span>
          <select name="stageId" defaultValue={defaultStage?.id ?? ""} className={selectCls}>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label} ({stage.probability}%)
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Probability override</span>
          <input name="probability" type="number" min="0" max="100" defaultValue={defaults?.probability ?? ""} placeholder="Use stage default" className={inputCls} />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-600">Owner</span>
          <select name="ownerId" defaultValue="" className={selectCls}>
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
          <input name="expectedCloseDate" type="date" className={inputCls} />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-600">Source</span>
          <select name="source" defaultValue={defaultSource} className={selectCls}>
            {CRM_DEAL_SOURCES.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Linked lead</span>
          <select name="leadId" defaultValue="" className={selectCls}>
            <option value="">— none —</option>
            {links.leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {personName(lead)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Linked client</span>
          <select name="clientId" defaultValue="" className={selectCls}>
            <option value="">— none —</option>
            {links.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {personName(client)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-zinc-600">Company</span>
          <input name="companyName" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Contact name</span>
          <input name="contactName" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Contact email</span>
          <input name="contactEmail" type="email" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Contact phone</span>
          <input name="contactPhone" type="tel" className={inputCls} />
        </label>

        <label className="block text-sm lg:col-span-2">
          <span className="text-zinc-600">Notes</span>
          <textarea name="notes" rows={3} defaultValue={defaults?.notes ?? ""} className={inputCls} />
        </label>

        <div className="flex items-center gap-3 lg:col-span-2">
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Create deal</button>
          <Link href="/admin/crm/deals" className="text-sm text-zinc-500 hover:text-zinc-800">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
