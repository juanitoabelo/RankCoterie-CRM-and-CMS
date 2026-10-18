"use client";

/**
 * Shared content-block editors.
 *
 * Each editor is a plain "content tab" form; `BlockEditor.tsx` wraps every one of
 * these with the standard Content / Style / Advanced tab shell, so all builders
 * (page, blog, geo, listing, product, header/footer, page layout) share a single
 * editing surface.
 */
import React, { useEffect, useState } from "react";
import type { Block, BlockType } from "@/lib/page-builder/types";
import { inputCls, labelCls } from "../settings";
import MediaLibraryPicker from "../MediaLibraryPicker";

export type SharedEditorProps = {
  block: Block;
  onChange: (props: Block["props"]) => void;
  onAddToColumn?: (columnId: string, type: BlockType) => void;
};

type P = Record<string, unknown>;

/* ── Small field primitives ────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input type={type} className={inputCls} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <textarea className={inputCls} rows={rows} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        className={inputCls}
        value={value ?? 0}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | number;
  options: Array<{ value: string | number; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className={labelCls}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-zinc-900" : "bg-zinc-300"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function ItemShell({
  title,
  onRemove,
  onMove,
  children,
}: {
  title: string;
  onRemove: () => void;
  onMove?: (dir: -1 | 1) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</span>
        <div className="flex items-center gap-1">
          {onMove ? (
            <>
              <button type="button" onClick={() => onMove(-1)} className="rounded px-1 text-zinc-500 hover:bg-zinc-100">↑</button>
              <button type="button" onClick={() => onMove(1)} className="rounded px-1 text-zinc-500 hover:bg-zinc-100">↓</button>
            </>
          ) : null}
          <button type="button" onClick={onRemove} className="rounded px-1 text-xs text-red-600 hover:bg-red-50">Remove</button>
        </div>
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50">
      + {label}
    </button>
  );
}

function useEditor<B extends Block>({ block, onChange }: SharedEditorProps) {
  const props = block.props as P;
  return {
    p: props,
    set: (patch: P) => onChange({ ...props, ...patch } as Block["props"]),
    block: block as B,
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ── Pricing ───────────────────────────────────────────────────────────────── */

function PricingEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const plans = (p.plans as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ plans: plans.map((pl, idx) => (idx === i ? { ...pl, ...patch } : pl)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Subheading" value={p.subheading as string} onChange={(v) => set({ subheading: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Currency" value={p.currency as string} onChange={(v) => set({ currency: v })} />
        <TextInput label="Period" value={p.period as string} onChange={(v) => set({ period: v })} />
      </div>
      <SelectInput
        label="Columns"
        value={p.columns as number}
        options={[2, 3, 4].map((n) => ({ value: n, label: `${n} columns` }))}
        onChange={(v) => set({ columns: Number(v) })}
      />
      <div className="space-y-3">
        {plans.map((plan, i) => (
          <ItemShell key={plan.id as string} title={(plan.name as string) || `Plan ${i + 1}`} onRemove={() => set({ plans: plans.filter((_, idx) => idx !== i) })}>
            <TextInput label="Name" value={plan.name as string} onChange={(v) => update(i, { name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Price" value={plan.price as string} onChange={(v) => update(i, { price: v })} />
              <TextInput label="Description" value={plan.description as string} onChange={(v) => update(i, { description: v })} />
            </div>
            <TextArea label="Features (one per line)" value={plan.features as string} onChange={(v) => update(i, { features: v })} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Button label" value={plan.ctaText as string} onChange={(v) => update(i, { ctaText: v })} />
              <TextInput label="Button link" value={plan.ctaUrl as string} onChange={(v) => update(i, { ctaUrl: v })} />
            </div>
            <ToggleRow label="Featured plan" value={plan.featured as boolean} onChange={(v) => update(i, { featured: v })} />
          </ItemShell>
        ))}
        <AddButton
          label="Add plan"
          onClick={() => set({ plans: [...plans, { id: uid(), name: "New plan", price: "0", description: "", features: "", ctaText: "Choose", ctaUrl: "#", featured: false }] })}
        />
      </div>
    </div>
  );
}

/* ── Lead form ─────────────────────────────────────────────────────────────── */

function LeadFormEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Subheading" value={p.subheading as string} onChange={(v) => set({ subheading: v })} />
      <ToggleRow label="Show phone field" value={p.showPhone as boolean} onChange={(v) => set({ showPhone: v })} />
      <ToggleRow label="Show company field" value={p.showCompany as boolean} onChange={(v) => set({ showCompany: v })} />
      <ToggleRow label="Show message field" value={p.showMessage as boolean} onChange={(v) => set({ showMessage: v })} />
      <TextInput label="Submit button label" value={p.submitLabel as string} onChange={(v) => set({ submitLabel: v })} />
      <TextInput label="Success message" value={p.successMessage as string} onChange={(v) => set({ successMessage: v })} />
    </div>
  );
}

/* ── Stats ─────────────────────────────────────────────────────────────────── */

function StatsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const items = (p.items as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set({ items: next });
  };
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <SelectInput label="Columns" value={p.columns as number} options={[2, 3, 4].map((n) => ({ value: n, label: `${n} columns` }))} onChange={(v) => set({ columns: Number(v) })} />
      {items.map((item, i) => (
        <ItemShell key={item.id as string} title={`Stat ${i + 1}`} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })} onMove={(d) => move(i, d)}>
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Value" value={item.value as string} onChange={(v) => update(i, { value: v })} />
            <TextInput label="Label" value={item.label as string} onChange={(v) => update(i, { label: v })} />
          </div>
        </ItemShell>
      ))}
      <AddButton label="Add stat" onClick={() => set({ items: [...items, { id: uid(), value: "100+", label: "New stat" }] })} />
    </div>
  );
}

/* ── Logos ─────────────────────────────────────────────────────────────────── */

function LogosEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const items = (p.items as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <SelectInput label="Columns" value={p.columns as number} options={[3, 4, 5, 6].map((n) => ({ value: n, label: `${n} columns` }))} onChange={(v) => set({ columns: Number(v) })} />
      <ToggleRow label="Grayscale" value={p.grayscale as boolean} onChange={(v) => set({ grayscale: v })} />
      {items.map((item, i) => (
        <ItemShell key={item.id as string} title={`Logo ${i + 1}`} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
          <MediaLibraryPicker label="Logo image" value={item.src as string} onChange={(url) => update(i, { src: url })} />
          <TextInput label="Alt text" value={item.alt as string} onChange={(v) => update(i, { alt: v })} />
          <TextInput label="Link" value={item.url as string} onChange={(v) => update(i, { url: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add logo" onClick={() => set({ items: [...items, { id: uid(), src: "", alt: "", url: "" }] })} />
    </div>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────────── */

function TabsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const items = (p.items as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <ItemShell key={item.id as string} title={`Tab ${i + 1}`} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
          <TextInput label="Label" value={item.label as string} onChange={(v) => update(i, { label: v })} />
          <TextArea label="Content (HTML allowed)" value={item.content as string} onChange={(v) => update(i, { content: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add tab" onClick={() => set({ items: [...items, { id: uid(), label: "New tab", content: "" }] })} />
    </div>
  );
}

/* ── Search hero ───────────────────────────────────────────────────────────── */

function SearchHeroEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Subheading" value={p.subheading as string} onChange={(v) => set({ subheading: v })} />
      <TextInput label="Search placeholder" value={p.placeholder as string} onChange={(v) => set({ placeholder: v })} />
      <TextInput label="Button label" value={p.buttonLabel as string} onChange={(v) => set({ buttonLabel: v })} />
      <TextInput label="Search results URL" value={p.searchUrl as string} onChange={(v) => set({ searchUrl: v })} />
      <ToggleRow label="Show category filter" value={p.showCategory as boolean} onChange={(v) => set({ showCategory: v })} />
      <ToggleRow label="Show location field" value={p.showLocation as boolean} onChange={(v) => set({ showLocation: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Background color" type="color" value={p.bgColor as string} onChange={(v) => set({ bgColor: v })} />
        <TextInput label="Text color" type="color" value={p.textColor as string} onChange={(v) => set({ textColor: v })} />
      </div>
    </div>
  );
}

/* ── Category grids ────────────────────────────────────────────────────────── */

function CategoryGridEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <SelectInput label="Columns" value={p.columns as number} options={[2, 3, 4].map((n) => ({ value: n, label: `${n} columns` }))} onChange={(v) => set({ columns: Number(v) })} />
      <NumberInput label="Maximum categories" value={p.limit as number} min={1} max={24} onChange={(v) => set({ limit: v })} />
      <TextInput label="Link base path" value={p.basePath as string} onChange={(v) => set({ basePath: v })} placeholder="/g/" />
    </div>
  );
}

/* ── Featured listings / map listings ──────────────────────────────────────── */

function FeaturedListingsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <SelectInput label="Columns" value={p.columns as number} options={[2, 3, 4].map((n) => ({ value: n, label: `${n} columns` }))} onChange={(v) => set({ columns: Number(v) })} />
      <NumberInput label="Number of listings" value={p.limit as number} min={1} max={24} onChange={(v) => set({ limit: v })} />
      <TextInput label="Restrict to category id (optional)" value={p.categoryId as string} onChange={(v) => set({ categoryId: v })} />
    </div>
  );
}

function MapListingsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Map location" value={p.location as string} onChange={(v) => set({ location: v })} placeholder="e.g. Austin, TX" />
      <NumberInput label="Zoom" value={p.zoom as number} min={1} max={20} onChange={(v) => set({ zoom: v })} />
      <NumberInput label="Map height (px)" value={p.height as number} min={200} max={900} onChange={(v) => set({ height: v })} />
      <NumberInput label="Number of listings" value={p.limit as number} min={1} max={24} onChange={(v) => set({ limit: v })} />
    </div>
  );
}

/* ── Table of contents ─────────────────────────────────────────────────────── */

function TocEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <SelectInput label="Max heading depth" value={p.maxDepth as number} options={[2, 3, 4].map((n) => ({ value: n, label: `H2–H${n}` }))} onChange={(v) => set({ maxDepth: Number(v) })} />
      <ToggleRow label="Stick to top when scrolling" value={p.sticky as boolean} onChange={(v) => set({ sticky: v })} />
    </div>
  );
}

/* ── Related posts ─────────────────────────────────────────────────────────── */

function RelatedPostsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <SelectInput label="Columns" value={p.columns as number} options={[2, 3, 4].map((n) => ({ value: n, label: `${n} columns` }))} onChange={(v) => set({ columns: Number(v) })} />
      <NumberInput label="Number of posts" value={p.limit as number} min={1} max={12} onChange={(v) => set({ limit: v })} />
    </div>
  );
}

/* ── Author bio ────────────────────────────────────────────────────────────── */

function AuthorBioEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <MediaLibraryPicker label="Avatar" value={p.avatar as string} onChange={(url) => set({ avatar: url })} />
      <TextInput label="Name" value={p.name as string} onChange={(v) => set({ name: v })} />
      <TextInput label="Role" value={p.role as string} onChange={(v) => set({ role: v })} />
      <TextArea label="Bio" value={p.bio as string} onChange={(v) => set({ bio: v })} />
    </div>
  );
}

/* ── Share buttons ─────────────────────────────────────────────────────────── */

const SHARE_OPTIONS = ["facebook", "x", "linkedin", "pinterest", "whatsapp", "email"];

function ShareButtonsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const networks = (p.networks as string[]) ?? [];
  const toggle = (n: string) =>
    set({ networks: networks.includes(n) ? networks.filter((x) => x !== n) : [...networks, n] });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <div className="space-y-2">
        {SHARE_OPTIONS.map((n) => (
          <div key={n} className="flex items-center gap-2">
            <input id={`share-${n}`} type="checkbox" className="h-4 w-4 rounded border-zinc-300" checked={networks.includes(n)} onChange={() => toggle(n)} />
            <label htmlFor={`share-${n}`} className="text-sm capitalize text-zinc-700">{n}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Post meta ─────────────────────────────────────────────────────────────── */

function PostMetaEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <ToggleRow label="Show author" value={p.showAuthor as boolean} onChange={(v) => set({ showAuthor: v })} />
      <ToggleRow label="Show date" value={p.showDate as boolean} onChange={(v) => set({ showDate: v })} />
      <ToggleRow label="Show read time" value={p.showReadTime as boolean} onChange={(v) => set({ showReadTime: v })} />
      <ToggleRow label="Show category" value={p.showCategory as boolean} onChange={(v) => set({ showCategory: v })} />
    </div>
  );
}

/* ── Newsletter ────────────────────────────────────────────────────────────── */

function NewsletterEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Subheading" value={p.subheading as string} onChange={(v) => set({ subheading: v })} />
      <TextInput label="Email placeholder" value={p.placeholder as string} onChange={(v) => set({ placeholder: v })} />
      <TextInput label="Button label" value={p.buttonLabel as string} onChange={(v) => set({ buttonLabel: v })} />
      <TextInput label="Success message" value={p.successMessage as string} onChange={(v) => set({ successMessage: v })} />
    </div>
  );
}

/* ── Product spotlight ─────────────────────────────────────────────────────── */

function ProductSpotlightEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/product-grid?perPage=48")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setProducts(Array.isArray(data?.items) ? data.items.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })) : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <SelectInput
        label="Product"
        value={p.productId as string}
        options={[{ value: "", label: "— Select a product —" }, ...products.map((x) => ({ value: x.id, label: x.name }))]}
        onChange={(v) => set({ productId: v })}
      />
      <TextInput label="Button label" value={p.buttonLabel as string} onChange={(v) => set({ buttonLabel: v })} />
    </div>
  );
}

/* ── Announcement ──────────────────────────────────────────────────────────── */

function AnnouncementEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Text" value={p.text as string} onChange={(v) => set({ text: v })} />
      <TextInput label="Link text (optional)" value={p.linkText as string} onChange={(v) => set({ linkText: v })} />
      <TextInput label="Link URL" value={p.linkUrl as string} onChange={(v) => set({ linkUrl: v })} />
      <ToggleRow label="Scrolling marquee" value={p.marquee as boolean} onChange={(v) => set({ marquee: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Background color" type="color" value={p.bgColor as string} onChange={(v) => set({ bgColor: v })} />
        <TextInput label="Text color" type="color" value={p.textColor as string} onChange={(v) => set({ textColor: v })} />
      </div>
    </div>
  );
}

/* ── Breadcrumbs ───────────────────────────────────────────────────────────── */

function BreadcrumbsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Separator" value={p.separator as string} onChange={(v) => set({ separator: v })} />
      <ToggleRow label="Show home link" value={p.showHome as boolean} onChange={(v) => set({ showHome: v })} />
    </div>
  );
}

/* ── Social links ──────────────────────────────────────────────────────────── */

const SOCIAL_NETWORKS = ["facebook", "x", "instagram", "linkedin", "youtube", "tiktok", "pinterest"];

function SocialLinksEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const items = (p.items as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <SelectInput label="Icon size" value={p.size as string} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} onChange={(v) => set({ size: v })} />
      {items.map((item, i) => (
        <ItemShell key={item.id as string} title={(item.network as string) || `Link ${i + 1}`} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
          <SelectInput label="Network" value={item.network as string} options={SOCIAL_NETWORKS.map((n) => ({ value: n, label: n }))} onChange={(v) => update(i, { network: v })} />
          <TextInput label="URL" value={item.url as string} onChange={(v) => update(i, { url: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add social link" onClick={() => set({ items: [...items, { id: uid(), network: "facebook", url: "" }] })} />
    </div>
  );
}

/* ── Countdown ─────────────────────────────────────────────────────────────── */

function CountdownEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Target date & time" type="datetime-local" value={p.targetDate as string} onChange={(v) => set({ targetDate: v })} />
      <TextInput label="Expired message" value={p.expiredText as string} onChange={(v) => set({ expiredText: v })} />
    </div>
  );
}

/* ── Gallery ───────────────────────────────────────────────────────────────── */

function GalleryEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const images = (p.images as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ images: images.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <SelectInput label="Columns" value={p.columns as number} options={[2, 3, 4].map((n) => ({ value: n, label: `${n} columns` }))} onChange={(v) => set({ columns: Number(v) })} />
      <ToggleRow label="Masonry layout" value={p.masonry as boolean} onChange={(v) => set({ masonry: v })} />
      {images.map((img, i) => (
        <ItemShell key={img.id as string} title={`Image ${i + 1}`} onRemove={() => set({ images: images.filter((_, idx) => idx !== i) })}>
          <MediaLibraryPicker label="Image" value={img.src as string} onChange={(url) => update(i, { src: url })} />
          <TextInput label="Alt text" value={img.alt as string} onChange={(v) => update(i, { alt: v })} />
          <TextInput label="Caption" value={img.caption as string} onChange={(v) => update(i, { caption: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add image" onClick={() => set({ images: [...images, { id: uid(), src: "", alt: "", caption: "" }] })} />
    </div>
  );
}

/* ── Steps ─────────────────────────────────────────────────────────────────── */

function StepsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const items = (p.items as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      {items.map((item, i) => (
        <ItemShell key={item.id as string} title={`Step ${i + 1}`} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
          <TextInput label="Title" value={item.title as string} onChange={(v) => update(i, { title: v })} />
          <TextArea label="Description" value={item.description as string} rows={2} onChange={(v) => update(i, { description: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add step" onClick={() => set({ items: [...items, { id: uid(), title: "New step", description: "" }] })} />
    </div>
  );
}

/* ── Shape divider ─────────────────────────────────────────────────────────── */

function ShapeDividerEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  return (
    <div className="space-y-3">
      <SelectInput
        label="Shape"
        value={p.shape as string}
        options={["wave", "tilt", "curve", "triangle", "zigzag"].map((s) => ({ value: s, label: s }))}
        onChange={(v) => set({ shape: v })}
      />
      <TextInput label="Color" type="color" value={p.color as string} onChange={(v) => set({ color: v })} />
      <NumberInput label="Height (px)" value={p.height as number} min={10} max={400} onChange={(v) => set({ height: v })} />
      <ToggleRow label="Flip vertically" value={p.flip as boolean} onChange={(v) => set({ flip: v })} />
    </div>
  );
}

/* ── Reviews ───────────────────────────────────────────────────────────────── */

function ReviewsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const items = (p.items as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Subheading" value={p.subheading as string} onChange={(v) => set({ subheading: v })} />
      <ToggleRow label="Show rating summary" value={p.showSummary as boolean} onChange={(v) => set({ showSummary: v })} />
      <SelectInput label="Columns" value={p.columns as number} options={[1, 2, 3].map((n) => ({ value: n, label: `${n} column${n > 1 ? "s" : ""}` }))} onChange={(v) => set({ columns: Number(v) })} />
      {items.map((item, i) => (
        <ItemShell key={item.id as string} title={`Review ${i + 1}`} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
          <TextInput label="Author" value={item.author as string} onChange={(v) => update(i, { author: v })} />
          <NumberInput label="Rating (1–5)" value={item.rating as number} min={0} max={5} onChange={(v) => update(i, { rating: v })} />
          <TextInput label="Date" value={item.date as string} placeholder="e.g. Jan 2026" onChange={(v) => update(i, { date: v })} />
          <MediaLibraryPicker label="Avatar" value={item.avatar as string} onChange={(url) => update(i, { avatar: url })} />
          <TextArea label="Review text" value={item.text as string} rows={3} onChange={(v) => update(i, { text: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add review" onClick={() => set({ items: [...items, { id: uid(), author: "New reviewer", rating: 5, date: "", text: "", avatar: "" }] })} />
    </div>
  );
}

/* ── Related listings ──────────────────────────────────────────────────────── */

function RelatedListingsEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const items = (p.items as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Subheading" value={p.subheading as string} onChange={(v) => set({ subheading: v })} />
      <SelectInput label="Columns" value={p.columns as number} options={[2, 3, 4].map((n) => ({ value: n, label: `${n} columns` }))} onChange={(v) => set({ columns: Number(v) })} />
      {items.map((item, i) => (
        <ItemShell key={item.id as string} title={`Listing ${i + 1}`} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
          <TextInput label="Title" value={item.title as string} onChange={(v) => update(i, { title: v })} />
          <MediaLibraryPicker label="Image" value={item.image as string} onChange={(url) => update(i, { image: url })} />
          <TextInput label="Location" value={item.location as string} onChange={(v) => update(i, { location: v })} />
          <NumberInput label="Rating (0–5)" value={item.rating as number} min={0} max={5} onChange={(v) => update(i, { rating: v })} />
          <TextInput label="Link URL" value={item.url as string} onChange={(v) => update(i, { url: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add listing" onClick={() => set({ items: [...items, { id: uid(), title: "New listing", image: "", location: "", rating: 0, url: "#" }] })} />
    </div>
  );
}

/* ── Business info ─────────────────────────────────────────────────────────── */

function BusinessInfoEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const hours = (p.hours as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ hours: hours.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Business name" value={p.name as string} onChange={(v) => set({ name: v })} />
      <TextInput label="Tagline" value={p.tagline as string} onChange={(v) => set({ tagline: v })} />
      <MediaLibraryPicker label="Image" value={p.image as string} onChange={(url) => set({ image: url })} />
      <TextInput label="Address" value={p.address as string} onChange={(v) => set({ address: v })} />
      <TextInput label="Phone" value={p.phone as string} onChange={(v) => set({ phone: v })} />
      <TextInput label="Email" value={p.email as string} onChange={(v) => set({ email: v })} />
      <TextInput label="Website" value={p.website as string} placeholder="https://…" onChange={(v) => set({ website: v })} />
      {hours.map((h, i) => (
        <ItemShell key={h.id as string} title={`Hours ${i + 1}`} onRemove={() => set({ hours: hours.filter((_, idx) => idx !== i) })}>
          <TextInput label="Day(s)" value={h.day as string} onChange={(v) => update(i, { day: v })} />
          <TextInput label="Time" value={h.time as string} onChange={(v) => update(i, { time: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add hours" onClick={() => set({ hours: [...hours, { id: uid(), day: "Day", time: "9:00 – 17:00" }] })} />
    </div>
  );
}

/* ── Filters / facet bar ───────────────────────────────────────────────────── */

function FacetBarEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const groups = (p.groups as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ groups: groups.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <ToggleRow label="Stick to top on scroll" value={p.sticky as boolean} onChange={(v) => set({ sticky: v })} />
      {groups.map((g, i) => (
        <ItemShell key={g.id as string} title={`Filter ${i + 1}`} onRemove={() => set({ groups: groups.filter((_, idx) => idx !== i) })}>
          <TextInput label="Label" value={g.label as string} onChange={(v) => update(i, { label: v })} />
          <TextArea
            label="Options (comma separated)"
            value={((g.options as string[]) ?? []).join(", ")}
            rows={2}
            placeholder="All, Service, Retail"
            onChange={(v) => update(i, { options: v.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </ItemShell>
      ))}
      <AddButton label="Add filter" onClick={() => set({ groups: [...groups, { id: uid(), label: "New filter", options: ["All"] }] })} />
    </div>
  );
}

/* ── Comparison table ──────────────────────────────────────────────────────── */

function ComparisonTableEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const rows = (p.rows as Array<P>) ?? [];
  const columns = (p.columns as Array<P>) ?? [];

  const addRow = () =>
    set({
      rows: [...rows, { id: uid(), label: "New feature" }],
      columns: columns.map((c) => ({ ...c, values: [...(((c.values as boolean[]) ?? [])), false] })),
    });
  const removeRow = (i: number) =>
    set({
      rows: rows.filter((_, idx) => idx !== i),
      columns: columns.map((c) => ({ ...c, values: ((c.values as boolean[]) ?? []).filter((_, idx) => idx !== i) })),
    });
  const updateRow = (i: number, label: string) => set({ rows: rows.map((r, idx) => (idx === i ? { ...r, label } : r)) });

  const addColumn = () =>
    set({ columns: [...columns, { id: uid(), name: "New plan", price: "", values: rows.map(() => false) }] });
  const removeColumn = (i: number) => set({ columns: columns.filter((_, idx) => idx !== i) });
  const updateColumn = (i: number, patch: P) => set({ columns: columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const toggleValue = (ci: number, ri: number) =>
    set({
      columns: columns.map((c, idx) =>
        idx === ci ? { ...c, values: rows.map((_, r) => (r === ri ? !((c.values as boolean[])?.[ri]) : (c.values as boolean[])?.[r])) } : c,
      ),
    });

  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <NumberInput label="Highlighted column (0 = none)" value={p.highlightCol as number} min={-1} max={columns.length - 1} onChange={(v) => set({ highlightCol: v })} />

      <div className="space-y-2">
        <span className={labelCls}>Columns</span>
        {columns.map((c, i) => (
          <ItemShell key={c.id as string} title={`Column ${i + 1}`} onRemove={() => removeColumn(i)}>
            <TextInput label="Name" value={c.name as string} onChange={(v) => updateColumn(i, { name: v })} />
            <TextInput label="Price" value={c.price as string} onChange={(v) => updateColumn(i, { price: v })} />
            {rows.map((r, ri) => (
              <ToggleRow
                key={r.id as string}
                label={`✓ ${r.label as string}`}
                value={Boolean((c.values as boolean[])?.[ri])}
                onChange={() => toggleValue(i, ri)}
              />
            ))}
          </ItemShell>
        ))}
        <AddButton label="Add column" onClick={addColumn} />
      </div>

      <div className="space-y-2">
        <span className={labelCls}>Feature rows</span>
        {rows.map((r, i) => (
          <ItemShell key={r.id as string} title={`Row ${i + 1}`} onRemove={() => removeRow(i)}>
            <TextInput label="Feature" value={r.label as string} onChange={(v) => updateRow(i, v)} />
          </ItemShell>
        ))}
        <AddButton label="Add row" onClick={addRow} />
      </div>
    </div>
  );
}

/* ── Team grid ─────────────────────────────────────────────────────────────── */

function TeamEditor(props: SharedEditorProps) {
  const { p, set } = useEditor(props);
  const members = (p.members as Array<P>) ?? [];
  const update = (i: number, patch: P) => set({ members: members.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      <TextInput label="Heading" value={p.heading as string} onChange={(v) => set({ heading: v })} />
      <TextInput label="Subheading" value={p.subheading as string} onChange={(v) => set({ subheading: v })} />
      <SelectInput label="Columns" value={p.columns as number} options={[2, 3, 4].map((n) => ({ value: n, label: `${n} columns` }))} onChange={(v) => set({ columns: Number(v) })} />
      {members.map((m, i) => (
        <ItemShell key={m.id as string} title={`Member ${i + 1}`} onRemove={() => set({ members: members.filter((_, idx) => idx !== i) })}>
          <TextInput label="Name" value={m.name as string} onChange={(v) => update(i, { name: v })} />
          <TextInput label="Role" value={m.role as string} onChange={(v) => update(i, { role: v })} />
          <MediaLibraryPicker label="Photo" value={m.image as string} onChange={(url) => update(i, { image: url })} />
          <TextArea label="Bio" value={m.bio as string} rows={2} onChange={(v) => update(i, { bio: v })} />
          <TextInput label="Profile URL" value={m.link as string} onChange={(v) => update(i, { link: v })} />
        </ItemShell>
      ))}
      <AddButton label="Add member" onClick={() => set({ members: [...members, { id: uid(), name: "New member", role: "", image: "", bio: "", link: "" }] })} />
    </div>
  );
}

/* ── Registry ──────────────────────────────────────────────────────────────── */

export const SHARED_EDITORS: Record<string, React.ComponentType<SharedEditorProps>> = {
  pricing: PricingEditor,
  leadForm: LeadFormEditor,
  stats: StatsEditor,
  logos: LogosEditor,
  tabs: TabsEditor,
  searchHero: SearchHeroEditor,
  listingCategories: CategoryGridEditor,
  featuredListings: FeaturedListingsEditor,
  mapListings: MapListingsEditor,
  toc: TocEditor,
  relatedPosts: RelatedPostsEditor,
  authorBio: AuthorBioEditor,
  shareButtons: ShareButtonsEditor,
  postMeta: PostMetaEditor,
  newsletter: NewsletterEditor,
  productCategories: CategoryGridEditor,
  productSpotlight: ProductSpotlightEditor,
  announcement: AnnouncementEditor,
  breadcrumbs: BreadcrumbsEditor,
  socialLinks: SocialLinksEditor,
  countdown: CountdownEditor,
  gallery: GalleryEditor,
  steps: StepsEditor,
  shapeDivider: ShapeDividerEditor,
  reviews: ReviewsEditor,
  relatedListings: RelatedListingsEditor,
  businessInfo: BusinessInfoEditor,
  facetBar: FacetBarEditor,
  comparisonTable: ComparisonTableEditor,
  team: TeamEditor,
};
