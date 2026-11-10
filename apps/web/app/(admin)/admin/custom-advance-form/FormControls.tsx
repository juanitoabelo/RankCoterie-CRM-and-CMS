"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomForm, replyToCustomSubmission, saveCustomForm, type FormActionResult } from "./actions";
import type { CustomFormField, CustomFormSettings } from "@/modules/custom-forms/types";
import { reorderCustomFormFields } from "@/modules/custom-forms/types";

const input = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const label = "block text-sm font-medium text-zinc-700";

type FormDataState = { id: string; name: string; status: string; fields: CustomFormField[]; settings: CustomFormSettings };

export function NewCustomForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError("");
        startTransition(async () => {
          const result = await createCustomForm(data);
          if (result.ok && result.id) router.push(`/admin/custom-advance-form/${result.id}`);
          else setError((result as Extract<FormActionResult, { ok: false }>).error);
        });
      }}
    >
      <label className={`flex-1 ${label}`}>New form name
        <input className={input} name="name" required maxLength={120} placeholder="Contact form" />
      </label>
      <button disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? "Creating…" : "Create form"}
      </button>
      {error && <p className="basis-full text-sm text-red-700">{error}</p>}
    </form>
  );
}

export function CustomFormEditor({ initial }: { initial: FormDataState }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [status, setStatus] = useState(initial.status);
  const [fields, setFields] = useState(initial.fields);
  const [settings, setSettings] = useState(initial.settings);
  const [notifyTo, setNotifyTo] = useState(settings.notifyTo.join(", "));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [draggedField, setDraggedField] = useState<number | null>(null);
  const setSettingsPatch = (patch: Partial<CustomFormSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const updateField = (index: number, patch: Partial<CustomFormField>) =>
    setFields((current) => current.map((field, i) => i === index ? { ...field, ...patch } : field));
  const moveField = (from: number, to: number) => setFields((current) => reorderCustomFormFields(current, from, to));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    data.set("name", name);
    data.set("status", status);
    data.set("fields", JSON.stringify(fields));
    data.set("settings", JSON.stringify({ ...settings, notifyTo: notifyTo.split(",").map((email) => email.trim()).filter(Boolean) }));
    setMessage("");
    startTransition(async () => {
      const result = await saveCustomForm(initial.id, data);
      setMessage(result.ok ? "Saved." : (result as Extract<FormActionResult, { ok: false }>).error);
      if (result.ok) router.refresh();
    });
  }

  const mappedFields = [{ value: "", label: "Not mapped" }, ...fields.map((field) => ({ value: field.key, label: field.label }))];
  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Form name
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
          </label>
          <label className={label}>Form status
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="DRAFT">Draft (not public)</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="font-semibold">Form fields</h2><p className="text-sm text-zinc-500">Field keys are stable identifiers used in emails and Lead mappings.</p></div>
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setFields([...fields, { key: `field_${fields.length + 1}`, label: "New field", type: "text", required: false, width: "full" }])}>Add field</button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={`${field.key}-${index}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedField !== null) moveField(draggedField, index);
                setDraggedField(null);
              }}
              className={`space-y-3 rounded-lg border p-3 ${draggedField === index ? "border-blue-400 bg-blue-50" : "border-zinc-200"}`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                    setDraggedField(index);
                  }}
                  onDragEnd={() => setDraggedField(null)}
                  aria-label={`Drag to reorder ${field.label}`}
                  title="Drag to reorder"
                  className="cursor-grab touch-none rounded border border-zinc-300 px-2 py-1 text-zinc-500 active:cursor-grabbing"
                >⠿</button>
                <span className="flex-1 text-sm font-medium">{index + 1}. {field.label || "Untitled field"}</span>
                <button type="button" disabled={index === 0} onClick={() => moveField(index, index - 1)} aria-label={`Move ${field.label} up`} className="rounded border px-2 py-1 text-xs disabled:opacity-40">↑</button>
                <button type="button" disabled={index === fields.length - 1} onClick={() => moveField(index, index + 1)} aria-label={`Move ${field.label} down`} className="rounded border px-2 py-1 text-xs disabled:opacity-40">↓</button>
                <button type="button" aria-label={`Remove ${field.label}`} className="text-sm text-red-700" onClick={() => setFields(fields.filter((_, i) => i !== index))}>Remove</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <label className={label}>Label
                  <input className={input} value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} />
                </label>
                <label className={label}>Field key
                  <input className={input} value={field.key} onChange={(e) => updateField(index, { key: e.target.value })} />
                </label>
                <label className={label}>Type
                  <select className={input} value={field.type} onChange={(e) => updateField(index, { type: e.target.value as CustomFormField["type"] })}>
                    {["text", "email", "phone", "textarea", "select", "checkbox"].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className={label}>Width
                  <select className={input} value={field.width} onChange={(e) => updateField(index, { width: e.target.value as CustomFormField["width"] })}>
                    <option value="full">Full width</option>
                    <option value="half">Half width (side by side)</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} />Required</label>
                <label className={`${label} sm:col-span-2`}>Placeholder
                  <input className={input} value={field.placeholder ?? ""} maxLength={200} onChange={(e) => updateField(index, { placeholder: e.target.value })} placeholder="Shown inside the input" />
                </label>
                <label className={`${label} sm:col-span-2`}>Help text
                  <input className={input} value={field.helpText ?? ""} maxLength={500} onChange={(e) => updateField(index, { helpText: e.target.value })} placeholder="Optional instructions below the field" />
                </label>
                {field.type === "select" && (
                  <label className={`${label} sm:col-span-4`}>Options (one per line)
                    <textarea className={input} rows={3} value={(field.options ?? []).join("\n")} onChange={(e) => updateField(index, { options: e.target.value.split("\n").map((option) => option.trim()).filter(Boolean) })} />
                  </label>
                )}
                <label className={`${label} sm:col-span-4`}>Custom CSS declarations
                  <textarea className={`${input} font-mono`} rows={3} value={field.customCss ?? ""} maxLength={1000} onChange={(e) => updateField(index, { customCss: e.target.value })} placeholder={"color: #222; background-color: #f8fafc; border-radius: 8px; padding: 12px;"} />
                  <span className="mt-1 block text-xs font-normal text-zinc-500">Declaration-only CSS. Supported: text/background/border colors, border width/style/radius, padding, font size/weight, and text alignment. Selectors and URLs are not allowed.</span>
                </label>
              </div>
            </div>
          ))}
          {!fields.length && <p className="text-sm text-zinc-500">Add one or more fields before publishing.</p>}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div><h2 className="font-semibold">Email settings</h2><p className="text-sm text-zinc-500">Use {"{{fieldKey}}"}, {"{{formName}}"}, and {"{{submission}}"} in email content.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Send notifications to (comma separated)
            <input className={input} value={notifyTo} onChange={(e) => setNotifyTo(e.target.value)} placeholder="admin@example.com" />
          </label>
          <label className={label}>From email (must be allowed by your email provider)
            <input className={input} value={settings.from} onChange={(e) => setSettingsPatch({ from: e.target.value })} placeholder="Website <forms@example.com>" />
          </label>
          <label className={label}>Notification subject
            <input className={input} value={settings.subject} onChange={(e) => setSettingsPatch({ subject: e.target.value })} />
          </label>
          <label className={label}>Notification content
            <textarea className={input} rows={5} value={settings.body} onChange={(e) => setSettingsPatch({ body: e.target.value })} />
          </label>
        </div>
        <div className="space-y-3 border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={settings.confirmationEnabled} onChange={(e) => setSettingsPatch({ confirmationEnabled: e.target.checked })} />Send confirmation email to submitter</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Submitter email field
              <select className={input} value={settings.confirmationEmailField} onChange={(e) => setSettingsPatch({ confirmationEmailField: e.target.value })}>{mappedFields.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </label>
            <label className={label}>Confirmation subject
              <input className={input} value={settings.confirmationSubject} onChange={(e) => setSettingsPatch({ confirmationSubject: e.target.value })} />
            </label>
            <label className={`${label} sm:col-span-2`}>Confirmation content
              <textarea className={input} rows={4} value={settings.confirmationBody} onChange={(e) => setSettingsPatch({ confirmationBody: e.target.value })} />
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={settings.createLead} onChange={(e) => setSettingsPatch({ createLead: e.target.checked })} />Create or update a CRM Lead for each submission</label>
        {settings.createLead && <div className="grid gap-3 sm:grid-cols-2">
          {(["firstName", "lastName", "email", "phone", "message"] as const).map((key) => (
            <label key={key} className={label}>Lead {key}
              <select className={input} value={settings.leadFields[key] ?? ""} onChange={(e) => setSettingsPatch({ leadFields: { ...settings.leadFields, [key]: e.target.value || undefined } })}>
                {mappedFields.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ))}
        </div>}
      </section>

      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save form"}</button>
        <a className="text-sm underline" href={`/admin/custom-advance-form/${initial.id}/submissions`}>View submissions</a>
        {message && <span role="status" className={`text-sm ${message === "Saved." ? "text-emerald-700" : "text-red-700"}`}>{message}</span>}
      </div>
    </form>
  );
}

export function SubmissionReply({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData();
        data.set("message", message);
        setResultMessage("");
        startTransition(async () => {
          const result = await replyToCustomSubmission(submissionId, data);
          setResultMessage(result.ok ? "Reply sent." : (result as Extract<FormActionResult, { ok: false }>).error);
          if (result.ok) {
            setMessage("");
            router.refresh();
          }
        });
      }}
    >
      <h2 className="font-semibold">Reply to submitter</h2>
      <textarea className={input} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Write a reply…" />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "Sending…" : "Send reply"}</button>
        {resultMessage && <span role="status" className={`text-sm ${resultMessage === "Reply sent." ? "text-emerald-700" : "text-red-700"}`}>{resultMessage}</span>}
      </div>
    </form>
  );
}
