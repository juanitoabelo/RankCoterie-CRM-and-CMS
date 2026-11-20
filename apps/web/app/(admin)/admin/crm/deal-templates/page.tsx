import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { listDealTemplates } from "@/modules/crm/deal-templates";
import { crmDealTemplateCreateForm, crmDealTemplateDeleteForm } from "@/modules/crm/parity-actions";
import { FlashBanner } from "@/components/admin/FlashBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Deal Templates | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const exampleDefaults = JSON.stringify({
  title: "Annual listing package",
  value: 12000,
  currency: "USD",
  stageKey: "new",
  probability: 20,
  source: "Inbound",
  notes: "Created from a reusable deal template.",
  lineItems: [{ name: "Setup", quantity: 1, unitPrice: 12000 }],
}, null, 2);

export default async function DealTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  if (!access.isAdmin) redirect("/admin/crm?error=Only+CRM+admins+can+manage+deal+templates.");
  const { error, ok } = await searchParams;
  const templates = await listDealTemplates();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500"><Link href="/admin/crm" className="hover:underline">Admin / CRM</Link> / Deal templates</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Deal templates</h1>
        <p className="mt-1 text-sm text-zinc-500">Reuse default fields and line items when creating common deal types.</p>
      </div>
      <FlashBanner error={error} ok={ok} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Saved templates</h2>
        <div className="mt-3 divide-y divide-zinc-100">
          {templates.length === 0 ? <p className="py-3 text-sm text-zinc-500">No deal templates yet.</p> : null}
          {templates.map((template) => (
            <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-zinc-900">{template.name}</p>
                <p className="text-xs text-zinc-500">
                  {template.description || "No description"} · {template.defaults.lineItems.length} line items
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/crm/deals/new?template=${template.id}`} className="text-sm text-zinc-700 underline">
                  Use template
                </Link>
                <form action={crmDealTemplateDeleteForm}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <button className="text-sm text-red-700 underline">Archive</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">New template</h2>
        <form action={crmDealTemplateCreateForm} className="mt-3 grid gap-4">
          <label className="block text-sm text-zinc-600">
            Name
            <input name="name" required maxLength={120} className={inputCls} />
          </label>
          <label className="block text-sm text-zinc-600">
            Description
            <input name="description" maxLength={500} className={inputCls} />
          </label>
          <label className="block text-sm text-zinc-600">
            Defaults (JSON)
            <textarea name="defaults" rows={12} defaultValue={exampleDefaults} className={`${inputCls} font-mono text-xs`} />
          </label>
          <div>
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Create template</button>
          </div>
        </form>
      </section>
    </div>
  );
}
