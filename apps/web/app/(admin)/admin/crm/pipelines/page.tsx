import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { getCrmPipelines } from "@/modules/crm/pipelines";
import { crmPipelineCreateForm, crmPipelineDefaultForm, crmStageCreateForm } from "@/modules/crm/parity-actions";
import { FlashBanner } from "@/components/admin/FlashBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Pipelines | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

export default async function CrmPipelinesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  if (!access.isAdmin) redirect("/admin/crm?error=Only+CRM+admins+can+manage+pipelines.");
  const { error, ok } = await searchParams;
  const pipelines = await getCrmPipelines();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500"><Link href="/admin/crm" className="hover:underline">Admin / CRM</Link> / Pipelines</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Pipelines</h1>
        <p className="mt-1 text-sm text-zinc-500">Create separate sales pipelines and choose which one is the default.</p>
      </div>
      <FlashBanner error={error} ok={ok} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Your pipelines</h2>
        <div className="mt-3 divide-y divide-zinc-100">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">
                    {pipeline.name}
                    {pipeline.isDefault ? <span className="ml-2 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Default</span> : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {pipeline.key} · {pipeline._count.stages} stages · {pipeline._count.deals} deals
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {pipeline.stages.map((stage) => stage.label).join(" → ") || "No stages yet"}
                  </p>
                </div>
                {!pipeline.isDefault ? (
                  <form action={crmPipelineDefaultForm}>
                    <input type="hidden" name="pipelineId" value={pipeline.id} />
                    <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
                      Make default
                    </button>
                  </form>
                ) : null}
              </div>
              <form action={crmStageCreateForm} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="pipelineId" value={pipeline.id} />
                <label className="block text-xs text-zinc-500">
                  Stage name
                  <input name="label" required maxLength={120} placeholder="Proposal sent" className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
                </label>
                <label className="block text-xs text-zinc-500">
                  Key
                  <input name="key" required maxLength={80} placeholder="proposal-sent" className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
                </label>
                <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
                  Add stage
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Add pipeline</h2>
        <form action={crmPipelineCreateForm} className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-zinc-600">
            Name
            <input name="name" required maxLength={120} placeholder="Partner sales" className={inputCls} />
          </label>
          <label className="block text-sm text-zinc-600">
            Key
            <input name="key" required maxLength={80} placeholder="partner-sales" className={inputCls} />
          </label>
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Create pipeline</button>
          </div>
        </form>
      </section>
    </div>
  );
}
