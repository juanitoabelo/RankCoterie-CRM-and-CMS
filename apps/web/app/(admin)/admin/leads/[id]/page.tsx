import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/directory/prismaCatalog";
import { leadStatusForm, leadNoteForm, leadTodoForm } from "../actions";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Lead | Admin" };

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: "desc" } }, todos: { orderBy: { createdAt: "asc" } } },
  });
  if (!lead) notFound();

  const intake = (lead.intake ?? {}) as Record<string, unknown>;
  const phones = (lead.phones ?? []) as { number?: string; kind?: string }[];
  const addresses = (lead.addresses ?? []) as { city?: string; state?: string; zip?: string }[];

  const statusOptions = ["NEW", "OPEN", "CLOSED", "ARCHIVED"];
  const dispositions = [
    "NEW_INQUIRY",
    "CALLBACK_SCHEDULED",
    "BROCHURE_SENT",
    "QUALIFICATION_CALL",
    "PROGRAM_MATCHED",
    "ADMISSION_CONFIRMED",
    "LOST",
    "DUPLICATE",
  ];

  return (
    <div>
      <Link href="/admin/leads" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to leads
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {lead.email ?? "no email"} · created {lead.createdAt.toISOString().slice(0, 10)} ·{" "}
            {lead.status}
            {lead.disposition ? ` · ${lead.disposition}` : ""}
          </p>
        </div>
        <form action={leadStatusForm} className="flex gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <select name="status" defaultValue={lead.status} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {statusOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select name="disposition" defaultValue={lead.disposition ?? ""} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="">— no disposition —</option>
            {dispositions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
            Update status
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Contact</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Phone</dt>
              <dd className="text-zinc-900">
                {phones.length > 0 ? phones.map((p) => `${p.number} (${p.kind ?? "?"})`).join(", ") : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Address</dt>
              <dd className="text-zinc-900">
                {addresses.length > 0
                  ? addresses.map((a) => [a.city, a.state, a.zip].filter(Boolean).join(", ")).join("; ")
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Landing page</dt>
              <dd className="text-zinc-900">{lead.landingPageId ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Initial disposition</dt>
              <dd className="text-zinc-900">{lead.initialDisposition ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Attribution</dt>
              <dd className="text-zinc-900">
                {[lead.campaignId, lead.productId, lead.publisherId, lead.subId, lead.clickId]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Clinical intake</h2>
          {Object.keys(intake).length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No intake data captured.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(intake).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="max-w-[60%] text-right text-zinc-900">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            To-dos ({lead.todos.filter((t) => !t.finishedAt).length} open)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lead.todos.map((todo) => (
              <li key={todo.id} className="flex items-start justify-between gap-3">
                <form action={leadTodoForm} className="flex flex-1 items-start gap-2">
                  <input type="hidden" name="todoId" value={todo.id} />
                  <button
                    type="submit"
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                      todo.finishedAt ? "border-emerald-500 bg-emerald-500" : "border-zinc-300"
                    }`}
                    aria-label={todo.finishedAt ? "Reopen todo" : "Complete todo"}
                  />
                  <span className={todo.finishedAt ? "text-zinc-400 line-through" : "text-zinc-900"}>
                    {todo.text}
                    {todo.dueAt ? (
                      <span className="ml-2 text-xs text-zinc-400">
                        due {todo.dueAt.toISOString().slice(0, 10)}
                      </span>
                    ) : null}
                  </span>
                </form>
              </li>
            ))}
            {lead.todos.length === 0 && <li className="text-zinc-400">No to-dos.</li>}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Notes</h2>
          <form action={leadNoteForm} className="mt-3 flex gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <input
              type="text"
              name="note"
              required
              placeholder="Add a note…"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Add</button>
          </form>
          <ul className="mt-4 space-y-3">
            {lead.notes.map((note) => (
              <li key={note.id} className="border-l-2 border-zinc-200 pl-3">
                <p className="text-sm text-zinc-800">{note.note}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {note.userId ?? "admin"} · {note.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </p>
              </li>
            ))}
            {lead.notes.length === 0 && <li className="text-sm text-zinc-400">No notes yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
