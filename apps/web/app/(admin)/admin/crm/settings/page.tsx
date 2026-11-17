import { requireSection } from "@/modules/auth";
import { getCrmSettings } from "@/modules/crm/settings";
import { getCrmStagesWithCounts } from "@/modules/crm/queries";
import {
  crmRecalculateScoresForm,
  crmSettingsForm,
  crmStageCreateForm,
  crmStageUpdateForm,
} from "@/modules/crm/actions";
import { FlashBanner } from "@/components/admin/FlashBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Settings | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";

export default async function CrmSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("crm");
  const { error, ok } = await searchParams;
  const [settings, stages] = await Promise.all([getCrmSettings(), getCrmStagesWithCounts()]);

  return (
    <div>
      <FlashBanner error={error} ok={ok} />
      <h1 className="text-2xl font-semibold text-zinc-900">CRM settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Pipeline stages, stale-deal thresholds, lead assignment, and score maintenance.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">General</h2>
          <form action={crmSettingsForm} className="mt-3 space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="autoAssignLeads"
                defaultChecked={settings.autoAssignLeads}
                className="mt-0.5 rounded border-zinc-300"
              />
              <span>
                <span className="font-medium text-zinc-800">Auto-assign new leads</span>
                <span className="block text-xs text-zinc-500">
                  Assign new leads to the active rep with the fewest open leads.
                </span>
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Stale deal threshold (days)</span>
              <input
                name="staleDealDays"
                type="number"
                min="1"
                max="365"
                defaultValue={settings.staleDealDays}
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-500">
                Open deals with no activity for this many days are highlighted on the pipeline.
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Default currency</span>
              <input
                name="defaultCurrency"
                maxLength={3}
                defaultValue={settings.defaultCurrency}
                className={inputCls}
              />
            </label>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
              Save settings
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Lead scoring</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Scores update when leads are created, edited, assigned, noted, or converted. Run a full
            recalculation after changing data outside the CRM.
          </p>
          <form action={crmRecalculateScoresForm} className="mt-4">
            <button className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
              Recalculate all lead scores
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Pipeline stages
          </h2>
          <p className="text-xs text-zinc-400">
            Keys are stable. Rename labels and tune probabilities without losing deals.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {stages.map((stage) => (
            <form
              key={stage.id}
              action={crmStageUpdateForm}
              className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-12"
            >
              <input type="hidden" name="stageId" value={stage.id} />
              <label className="block text-xs text-zinc-500 sm:col-span-3">
                Label
                <input name="label" defaultValue={stage.label} className={inputCls} />
              </label>
              <label className="block text-xs text-zinc-500 sm:col-span-1">
                Order
                <input name="order" type="number" defaultValue={stage.order} className={inputCls} />
              </label>
              <label className="block text-xs text-zinc-500 sm:col-span-2">
                Probability %
                <input
                  name="probability"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={stage.probability}
                  className={inputCls}
                />
              </label>
              <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
                <input type="checkbox" name="isWon" defaultChecked={stage.isWon} className="rounded border-zinc-300" />
                Won
              </label>
              <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
                <input type="checkbox" name="isLost" defaultChecked={stage.isLost} className="rounded border-zinc-300" />
                Lost
              </label>
              <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
                <input type="checkbox" name="active" defaultChecked={stage.active} className="rounded border-zinc-300" />
                Active
              </label>
              <div className="flex items-end sm:col-span-3">
                <button className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
                  Save stage · {stage.dealCount} deal(s)
                </button>
              </div>
            </form>
          ))}
        </div>

        <form action={crmStageCreateForm} className="mt-5 grid gap-2 rounded-lg border border-dashed border-zinc-300 p-3 sm:grid-cols-12">
          <label className="block text-xs text-zinc-500 sm:col-span-4">
            New stage label
            <input name="label" required placeholder="e.g. Contract sent" className={inputCls} />
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Order
            <input name="order" type="number" placeholder="auto" className={inputCls} />
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Probability %
            <input name="probability" type="number" min="0" max="100" defaultValue="0" className={inputCls} />
          </label>
          <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
            <input type="checkbox" name="isWon" className="rounded border-zinc-300" />
            Won
          </label>
          <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
            <input type="checkbox" name="isLost" className="rounded border-zinc-300" />
            Lost
          </label>
          <div className="flex items-end sm:col-span-2">
            <button className="w-full rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white">
              Add stage
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
