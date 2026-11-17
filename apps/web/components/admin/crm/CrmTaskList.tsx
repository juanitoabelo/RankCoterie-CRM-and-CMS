import { crmTaskDeleteForm, crmTaskToggleForm } from "@/modules/crm/actions";
import { CRM_TASK_PRIORITY_BADGE, type CrmTaskPriority } from "@/modules/crm/constants";

export type CrmTaskRow = {
  id: string;
  text: string;
  priority: string;
  dueAt: Date | null;
  finishedAt: Date | null;
  status: string;
  assigneeName?: string | null;
  context?: string | null;
  leadName?: string | null;
  clientName?: string | null;
  dealTitle?: string | null;
};

function formatDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "no due date";
}

export default function CrmTaskList({
  tasks,
  returnTo,
  emptyText = "No tasks.",
  showContext = false,
}: {
  tasks: CrmTaskRow[];
  returnTo: string;
  emptyText?: string;
  showContext?: boolean;
}) {
  if (tasks.length === 0) return <p className="text-sm text-zinc-400">{emptyText}</p>;

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const done = task.finishedAt !== null;
        const overdue = !done && task.dueAt !== null && task.dueAt < new Date();
        const context =
          task.context ??
          [task.dealTitle, task.leadName, task.clientName].filter(Boolean).join(" · ");
        return (
          <li
            key={task.id}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
              overdue ? "border-amber-200 bg-amber-50/50" : "border-zinc-200 bg-white"
            }`}
          >
            <form action={crmTaskToggleForm} className="pt-0.5">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                title={done ? "Reopen task" : "Complete task"}
                className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                  done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-zinc-300 text-transparent hover:border-zinc-500"
                }`}
              >
                ✓
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${done ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                {task.text}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    CRM_TASK_PRIORITY_BADGE[task.priority as CrmTaskPriority] ??
                    "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {task.priority}
                </span>
                <span className={overdue ? "font-medium text-amber-700" : ""}>
                  {formatDate(task.dueAt)}
                </span>
                {task.assigneeName && <span>· {task.assigneeName}</span>}
                {showContext && context && <span>· {context}</span>}
              </div>
            </div>
            <form action={crmTaskDeleteForm}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button className="text-xs text-zinc-400 hover:text-red-600">delete</button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
