"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EMAIL_TEMPLATES,
  TEMPLATE_KEYS,
  renderTemplate,
  type TemplateKey,
} from "@/lib/email/template-registry";
import { resetEmailTemplate, saveEmailTemplate, type EmailTemplateSnapshot } from "../actions";

const labelCls = "block text-sm font-medium text-zinc-700";
const inputCls =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

export default function EmailTemplatesSection({
  templates,
}: {
  templates: Record<TemplateKey, EmailTemplateSnapshot>;
}) {
  const [selected, setSelected] = useState<TemplateKey>("invoicePayment");
  const snapshot = templates[selected];
  if (!snapshot) return null;
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls} htmlFor="template-picker">
          Template
        </label>
        <select
          id="template-picker"
          value={selected}
          onChange={(e) => setSelected(e.target.value as TemplateKey)}
          className={`${inputCls} max-w-md`}
        >
          {TEMPLATE_KEYS.map((k) => (
            <option key={k} value={k}>
              {templates[k]?.label ?? EMAIL_TEMPLATES[k].label}
            </option>
          ))}
        </select>
      </div>
      <TemplateEditor key={selected} snapshot={snapshot} />
    </div>
  );
}

function TemplateEditor({ snapshot }: { snapshot: EmailTemplateSnapshot }) {
  const router = useRouter();
  const meta = EMAIL_TEMPLATES[snapshot.key];
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [subject, setSubject] = useState(snapshot.template.subject);
  const [body, setBody] = useState(snapshot.template.body);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const preview = useMemo(
    () => renderTemplate({ subject, body }, meta.sample),
    [subject, body, meta],
  );

  function insertPlaceholder(ph: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + ph);
    } else {
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? start;
      const next = body.slice(0, start) + ph + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = start + ph.length;
      });
    }
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("templateKey", snapshot.key);
    fd.set("subject", subject);
    fd.set("body", body);
    const result = await saveEmailTemplate(fd);
    setSaving(false);
    if (result.ok) {
      setMessage({ type: "ok", text: "Template saved — new emails will use it." });
      setDirty(false);
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error ?? "Save failed." });
    }
  }

  async function handleReset() {
    setSaving(true);
    setMessage(null);
    const result = await resetEmailTemplate(snapshot.key);
    setSaving(false);
    if (result.ok) {
      setSubject(meta.defaultTemplate.subject);
      setBody(meta.defaultTemplate.body);
      setDirty(false);
      setMessage({ type: "ok", text: "Template reset to the built-in default." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error ?? "Reset failed." });
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{snapshot.label}</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {snapshot.description}{" "}
            {snapshot.isDefault && !dirty
              ? "Currently using the built-in default content."
              : dirty
                ? "Unsaved changes."
                : "Custom template active."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          Reset to default
        </button>
      </div>

      <div className="mt-4">
        <label className={labelCls}>Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setDirty(true);
          }}
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className={labelCls}>Message body (HTML)</label>
          <div className="flex flex-wrap gap-1">
            {snapshot.placeholders.map((ph) => (
              <button
                key={ph}
                type="button"
                onClick={() => insertPlaceholder(ph)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                title="Click to insert at the cursor"
              >
                {ph}
              </button>
            ))}
          </div>
        </div>
        <textarea
          ref={bodyRef}
          rows={14}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setDirty(true);
          }}
          className={`${inputCls} font-mono text-xs leading-5`}
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-zinc-400">
          Placeholders are replaced per email and HTML-escaped. Full HTML is allowed — keep a
          simple text fallback for plain-text clients (auto-derived from your HTML).
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-zinc-700">Preview (sample data)</h3>
        <p className="mt-1 font-mono text-xs text-zinc-500">Subject: {preview.subject}</p>
        <iframe
          title="Email template preview"
          srcDoc={preview.html}
          className="mt-2 h-80 w-full rounded-md border border-zinc-200 bg-zinc-50"
        />
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={
            message.type === "error"
              ? "mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
              : "mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
          }
        >
          {message.text}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save template"}
        </button>
      </div>
    </div>
  );
}
