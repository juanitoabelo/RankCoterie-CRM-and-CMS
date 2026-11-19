import { requireSection } from "@/modules/auth";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { CRM_WORKFLOW_EVENTS } from "@/modules/crm/workflows";
import { getCrmWorkflowRuns, getCrmWorkflows } from "@/modules/crm/workflow-runner";
import {
  createWorkflowForm,
  deleteWorkflowForm,
  toggleWorkflowForm,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Workflows | CRM" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export default async function CrmWorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSection("crm");
  const { error } = await searchParams;
  const [workflows, runs] = await Promise.all([getCrmWorkflows(), getCrmWorkflowRuns(25)]);

  return (
    <div>
      <FlashBanner error={error} />
      <h1 className="text-2xl font-semibold text-zinc-900">Workflow automation</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Trigger tasks, notes, notifications, and webhooks when CRM events happen.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">New workflow</h2>
          <form action={createWorkflowForm} className="mt-3 space-y-3">
            <label className="block text-sm">
              <span className="text-zinc-600">Name</span>
              <input name="name" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Description</span>
              <input name="description" className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Trigger event</span>
              <select name="event" className={inputCls}>
                {CRM_WORKFLOW_EVENTS.map((event) => (
                  <option key={event} value={event}>
                    {event}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Condition</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input name="conditionField" placeholder="Field, e.g. stageLabel" className={inputCls} />
                <select name="conditionOperator" className={inputCls}>
                  {[
                    "equals",
                    "not_equals",
                    "contains",
                    "not_contains",
                    "gte",
                    "lte",
                    "gt",
                    "lt",
                    "is_empty",
                    "not_empty",
                  ].map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
                <input name="conditionValue" placeholder="Value" className={inputCls} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Leave the field blank to run on every trigger event.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Action</p>
              <div className="mt-2 space-y-2">
                <select name="actionType" className={inputCls}>
                  <option value="log_note">Log note</option>
                  <option value="create_task">Create task</option>
                  <option value="notify">Notify user</option>
                </select>
                <input name="actionText" placeholder="Action text" className={inputCls} />
                <input
                  name="actionAssigneeId"
                  placeholder="Assignee user ID (optional)"
                  className={inputCls}
                />
              </div>
            </div>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
              Create workflow
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Workflows</h2>
          <div className="mt-3 space-y-3 overflow-x-auto">
            {workflows.length === 0 ? (
              <p className="text-sm text-zinc-500">No workflows yet.</p>
            ) : (
              workflows.map((workflow) => {
                const conditions = asArray(workflow.conditions) as {
                  field?: string;
                  operator?: string;
                  value?: unknown;
                }[];
                const actions = asArray(workflow.actions) as { type?: string; text?: string }[];
                return (
                  <div key={workflow.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{workflow.name}</p>
                        <p className="text-xs text-zinc-500">
                          {workflow.event} · {workflow._count.runs} runs
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <form action={toggleWorkflowForm}>
                          <input type="hidden" name="id" value={workflow.id} />
                          <input type="hidden" name="enabled" value={workflow.enabled ? "false" : "true"} />
                          <button className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700">
                            {workflow.enabled ? "Pause" : "Enable"}
                          </button>
                        </form>
                        <form action={deleteWorkflowForm}>
                          <input type="hidden" name="id" value={workflow.id} />
                          <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-600">
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      When {conditions.map((item) => `${item.field} ${item.operator} ${String(item.value ?? "")}`).join(" AND ") || "triggered"}
                      {" → "}
                      {actions.map((item) => item.text || item.type).join(", ") || "no actions"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent runs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Workflow</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-zinc-500">
                    No workflow runs yet.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="border-t border-zinc-100">
                    <td className="py-2 pr-4 text-zinc-800">{run.workflow.name}</td>
                    <td className="py-2 pr-4 text-zinc-600">{run.event}</td>
                    <td className="py-2 pr-4 text-zinc-600">{run.status}</td>
                    <td className="py-2 text-zinc-600">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(run.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
