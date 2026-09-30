"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/(admin)/admin/products/actions";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";
const primaryBtn =
  "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60";

function useFormAction(action: (formData: FormData) => Promise<ActionResult>) {
  const [message, setMessage] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit(formData: FormData, reset?: () => void) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result.ok) {
          setMessage({ ok: true });
          reset?.();
          router.refresh();
        } else {
          setMessage({ ok: false, error: result.error });
        }
      } catch (err) {
        setMessage({ ok: false, error: err instanceof Error ? err.message : "Something went wrong." });
      }
    });
  }

  return { message, isPending, submit };
}

function Feedback({ message }: { message: { ok: boolean; error?: string } | null }) {
  if (!message) return null;
  return (
    <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
      {message.ok ? "Saved." : message.error}
    </p>
  );
}

export function EntityDeleteButton({
  id,
  name,
  label = "Delete",
  action,
}: {
  id: string;
  name: string;
  label?: string;
  action: (id: string) => Promise<ActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setError(null);
        startTransition(async () => {
          try {
            const result = await action(id);
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.error);
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete.");
          }
        });
      }}
      className="text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
    >
      {isPending ? "Deleting..." : label}
      {error && <span className="ml-1 text-xs">{error}</span>}
    </button>
  );
}

export function CategoryCreateForm({
  categories,
  action,
}: {
  categories: { id: string; name: string }[];
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const { message, isPending, submit } = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      action={(formData) => {
        submit(formData, () => formRef.current?.reset());
      }}
    >
      <h2 className="text-sm font-semibold text-zinc-800">New category</h2>
      <Feedback message={message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="cat-name">
            Name <span className="text-red-500">*</span>
          </label>
          <input id="cat-name" name="name" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="cat-slug">
            Slug
          </label>
          <input id="cat-slug" name="slug" className={inputCls} placeholder="auto from name" />
        </div>
        <div>
          <label className={labelCls} htmlFor="cat-parent">
            Parent category
          </label>
          <select id="cat-parent" name="parentId" defaultValue="" className={inputCls}>
            <option value="">— Top level —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="cat-order">
            Menu order
          </label>
          <input id="cat-order" name="menuOrder" type="number" defaultValue={0} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="cat-description">
            Description
          </label>
          <textarea id="cat-description" name="description" rows={2} className={inputCls} />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border-zinc-400" />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="showInMenu" defaultChecked className="h-4 w-4 rounded border-zinc-400" />
          Show in menu
        </label>
      </div>
      <button type="submit" disabled={isPending} className={primaryBtn}>
        {isPending ? "Saving..." : "Add category"}
      </button>
    </form>
  );
}

export function TagCreateForm({
  action,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const { message, isPending, submit } = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      action={(formData) => {
        submit(formData, () => formRef.current?.reset());
      }}
    >
      <h2 className="text-sm font-semibold text-zinc-800">New tag</h2>
      <Feedback message={message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="tag-name">
            Name <span className="text-red-500">*</span>
          </label>
          <input id="tag-name" name="name" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="tag-slug">
            Slug
          </label>
          <input id="tag-slug" name="slug" className={inputCls} placeholder="auto from name" />
        </div>
      </div>
      <button type="submit" disabled={isPending} className={primaryBtn}>
        {isPending ? "Saving..." : "Add tag"}
      </button>
    </form>
  );
}

export function AttributeCreateForm({
  action,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const { message, isPending, submit } = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      action={(formData) => {
        submit(formData, () => formRef.current?.reset());
      }}
    >
      <h2 className="text-sm font-semibold text-zinc-800">New attribute</h2>
      <Feedback message={message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="attr-name">
            Name <span className="text-red-500">*</span>
          </label>
          <input id="attr-name" name="name" required className={inputCls} placeholder="e.g. Colour" />
        </div>
        <div>
          <label className={labelCls} htmlFor="attr-type">
            Type
          </label>
          <select id="attr-type" name="type" defaultValue="select" className={inputCls}>
            <option value="select">Select</option>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="color">Colour swatch</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="isFilterable" defaultChecked className="h-4 w-4 rounded border-zinc-400" />
          Filterable
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="isVariation" className="h-4 w-4 rounded border-zinc-400" />
          Used for variations
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="isVisible" defaultChecked className="h-4 w-4 rounded border-zinc-400" />
          Visible
        </label>
      </div>
      <button type="submit" disabled={isPending} className={primaryBtn}>
        {isPending ? "Saving..." : "Add attribute"}
      </button>
    </form>
  );
}

export function TermCreateForm({
  attributeId,
  action,
}: {
  attributeId: string;
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const { message, isPending, submit } = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-2"
      action={(formData) => {
        formData.set("attributeId", attributeId);
        submit(formData, () => formRef.current?.reset());
      }}
    >
      <div className="min-w-40 flex-1">
        <label className="block text-xs font-medium text-zinc-600" htmlFor={`term-${attributeId}`}>
          Add value
        </label>
        <input
          id={`term-${attributeId}`}
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          placeholder="e.g. Red"
        />
      </div>
      <button type="submit" disabled={isPending} className={primaryBtn}>
        {isPending ? "Adding..." : "Add"}
      </button>
      {message && !message.ok && <p className="w-full text-sm text-red-600">{message.error}</p>}
    </form>
  );
}
