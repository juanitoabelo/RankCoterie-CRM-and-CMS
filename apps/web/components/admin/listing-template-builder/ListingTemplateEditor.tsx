"use client";

import { useState } from "react";
import type { Block } from "@/lib/page-builder/types";
import type { ListingTemplateBlock } from "@/lib/listing-templates/tree-types";
import { LISTING_BLOCK_META } from "@/lib/listing-templates/tree-types";
import { CONTENT_TOKENS } from "@/lib/listing-templates/tokens-help";
import { inputCls, labelCls } from "../page-builder/settings";
import BlockStyleTab from "../page-builder/BlockStyleTab";
import ElementStyleTab from "../page-builder/ElementStyleTab";
import BlockAdvancedTab from "../page-builder/BlockAdvancedTab";
import BlockEditor from "../page-builder/BlockEditor";
import ListingBindingsEditor from "./ListingBindingsEditor";
import { getListingBlockStyleSchema } from "@/lib/listing-templates/style-schema";
import type { ElementStyles } from "@/lib/page-builder/element-style";

type ThemeColor = { key: string; label: string; color: string };

type EditorProps = {
  block: ListingTemplateBlock;
  onChange: (props: ListingTemplateBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateColumn?: (columnId: string, patch: Record<string, unknown>) => void;
  onAddToColumn?: (columnId: string, type: import("@/lib/page-builder/types").BlockType) => void;
  themeColors?: ThemeColor[];
};

function createSetter(block: ListingTemplateBlock, onChange: EditorProps["onChange"]) {
  return (patch: Record<string, unknown>) => onChange({ ...block.props, ...patch } as ListingTemplateBlock["props"]);
}

/* ── Token Chips ────────────────────────────────────────────────────────── */

function TokenChips() {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
        Data tokens
        <span className="ml-2 text-[10px] font-normal text-zinc-400">click to copy</span>
      </summary>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        Type any of these in the field above — they resolve per listing at render time (e.g. &quot;{'{{title}}'} in {'{{region}}'}&quot;).
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {CONTENT_TOKENS.map(({ token }) => (
          <button
            key={token}
            type="button"
            title="Click to copy"
            onClick={() => {
              void navigator.clipboard?.writeText(token).then(() => {
                setCopied(token);
                setTimeout(() => setCopied(null), 1200);
              });
            }}
            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
              copied === token
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
            }`}
          >
            {copied === token ? "copied" : token}
          </button>
        ))}
      </div>
    </details>
  );
}

/* ── Shared Tab Bar ─────────────────────────────────────────────────────── */

function TabBar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: "content" | "style" | "advanced") => void }) {
  return (
    <div className="flex border-b border-zinc-200">
      {(["content", "style", "advanced"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex-1 py-2 text-xs font-medium capitalize ${
            activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
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

/* ── Block-specific Style tab ────────────────────────────────────────────── */

function ListingStyleTab({
  blockType,
  p,
  set,
}: {
  blockType: string;
  p: Record<string, unknown>;
  set: (patch: Record<string, unknown>) => void;
}) {
  const schema = getListingBlockStyleSchema(blockType);
  if (!schema) return <BlockStyleTab props={p} set={set} />;
  return (
    <ElementStyleTab
      schema={schema}
      value={p.elementStyles as ElementStyles | undefined}
      onChange={(next) => set({ elementStyles: next })}
    />
  );
}

/* ── Content-tab wrapper: specific fields + token chips ─────────────────── */

function ContentShell({ children, showTokens = false }: { children?: React.ReactNode; showTokens?: boolean }) {
  return (
    <div className="space-y-3">
      {children}
      {showTokens && <TokenChips />}
    </div>
  );
}

/* ── Listing Hero ───────────────────────────────────────────────────────── */

function ListingHeroEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "content" && (
        <ContentShell>
          <label className={labelCls}>Variant
            <select value={(p.variant as string) || "default"} onChange={(e) => set({ variant: e.target.value })} className={inputCls}>
              <option value="default">Default</option>
              <option value="minimal">Minimal</option>
              <option value="bold">Bold</option>
              <option value="corporate">Corporate</option>
              <option value="warm">Warm</option>
              <option value="modern">Modern</option>
            </select>
          </label>
          {[
            { key: "showBreadcrumb", label: "Show Breadcrumb" },
            { key: "showCover", label: "Show Cover Image" },
            { key: "showAvatar", label: "Show Logo" },
            { key: "showBadges", label: "Show Badges" },
            { key: "showContact", label: "Show Contact Info" },
            { key: "showAddress", label: "Show Address" },
            { key: "showSummary", label: "Show Summary Under Hero" },
          ].map(({ key, label }) => (
            <ToggleRow key={key} label={label} value={Boolean(p[key])} onChange={(v) => set({ [key]: v })} />
          ))}
        </ContentShell>
      )}
      {activeTab === "style" && <ListingStyleTab blockType={block.type} p={p} set={set} />}
      {activeTab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Heading-style editors (about / description / reviewForm) ───────────── */

function HeadingFieldEditor({ block, onChange, tokenField }: EditorProps & { tokenField?: string }) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "content" && (
        <ContentShell showTokens>
          <label className={labelCls}>Heading
            <input
              type="text"
              value={(p.heading as string) || ""}
              onChange={(e) => set({ heading: e.target.value })}
              className={inputCls}
              placeholder={tokenField === "title" ? "e.g. About {{title}}" : "e.g. About"}
            />
          </label>
          {tokenField === "title" && (
            <p className="text-[11px] text-zinc-400">Leave empty to hide the heading. Tokens like {"{{title}}"} are allowed.</p>
          )}
        </ContentShell>
      )}
      {activeTab === "style" && <ListingStyleTab blockType={block.type} p={p} set={set} />}
      {activeTab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Details Grid ───────────────────────────────────────────────────────── */

const DETAIL_ITEMS = [
  { key: "categories", label: "Categories" },
  { key: "areas", label: "Areas served" },
  { key: "specialties", label: "Specialties" },
  { key: "amenities", label: "Amenities" },
  { key: "certifications", label: "Certifications" },
  { key: "insurance", label: "Insurance accepted" },
  { key: "hours", label: "Hours" },
] as const;

function ListingDetailsEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);
  const items = Array.isArray(p.items) ? (p.items as string[]) : [];

  return (
    <div className="space-y-3">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "content" && (
        <ContentShell showTokens>
          <label className={labelCls}>Heading
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <div>
            <span className={labelCls}>Detail groups</span>
            <div className="mt-1 space-y-1">
              {DETAIL_ITEMS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                    checked={items.includes(key)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...items, key] : items.filter((x) => x !== key);
                      set({ items: next });
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </ContentShell>
      )}
      {activeTab === "style" && <ListingStyleTab blockType={block.type} p={p} set={set} />}
      {activeTab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Gallery ────────────────────────────────────────────────────────────── */

function ListingGalleryEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "content" && (
        <ContentShell>
          <label className={labelCls}>Max images
            <input type="number" min={1} max={24} value={(p.limit as number) ?? 4} onChange={(e) => set({ limit: Number(e.target.value) })} className={inputCls} />
          </label>
          <ToggleRow label="Hide when listing has no gallery" value={p.hideIfEmpty !== false} onChange={(v) => set({ hideIfEmpty: v })} />
        </ContentShell>
      )}
      {activeTab === "style" && <ListingStyleTab blockType={block.type} p={p} set={set} />}
      {activeTab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Map / Video ────────────────────────────────────────────────────────── */

function HideIfEmptyEditor({ block, onChange, label }: EditorProps & { label: string }) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "content" && (
        <ContentShell>
          <ToggleRow label={label} value={p.hideIfEmpty !== false} onChange={(v) => set({ hideIfEmpty: v })} />
        </ContentShell>
      )}
      {activeTab === "style" && <ListingStyleTab blockType={block.type} p={p} set={set} />}
      {activeTab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Reviews ────────────────────────────────────────────────────────────── */

function ListingReviewsEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "content" && (
        <ContentShell showTokens>
          <label className={labelCls}>Heading
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Reviews to show
            <input type="number" min={1} max={20} value={(p.limit as number) ?? 3} onChange={(e) => set({ limit: Number(e.target.value) })} className={inputCls} />
          </label>
          <ToggleRow label="Show count in heading" value={p.showCount !== false} onChange={(v) => set({ showCount: v })} />
          <ToggleRow label="Show owner responses" value={p.showResponse !== false} onChange={(v) => set({ showResponse: v })} />
          <ToggleRow label="Hide when there are no reviews" value={p.hideIfEmpty !== false} onChange={(v) => set({ hideIfEmpty: v })} />
        </ContentShell>
      )}
      {activeTab === "style" && <ListingStyleTab blockType={block.type} p={p} set={set} />}
      {activeTab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Title-only widgets (contact / hours / areas / categories / social) ─── */

function TitleFieldEditor({ block, onChange, titleKey, placeholder }: EditorProps & { titleKey: string; placeholder?: string }) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "content" && (
        <ContentShell showTokens>
          <label className={labelCls}>Title
            <input
              type="text"
              value={(p[titleKey] as string) || ""}
              onChange={(e) => set({ [titleKey]: e.target.value })}
              className={inputCls}
              placeholder={placeholder}
            />
          </label>
        </ContentShell>
      )}
      {activeTab === "style" && <ListingStyleTab blockType={block.type} p={p} set={set} />}
      {activeTab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── No-content widgets (quickFacts / claim) ────────────────────────────── */

function StyleOnlyEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "content" && (
        <p className="text-[11px] leading-relaxed text-zinc-500">
          This widget is fully data-driven — it renders the listing&apos;s live data (tier, rating, claim state). There is nothing to edit here.
        </p>
      )}
      {activeTab === "style" && <ListingStyleTab blockType={block.type} p={p} set={set} />}
      {activeTab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Editor Map ─────────────────────────────────────────────────────────── */

const EDITOR_MAP: Record<string, React.ComponentType<EditorProps>> = {
  listingHero: ListingHeroEditor,
  listingAbout: (props) => <HeadingFieldEditor {...props} tokenField="title" />,
  listingDescription: (props) => <HeadingFieldEditor {...props} tokenField="title" />,
  listingDetails: ListingDetailsEditor,
  listingGallery: ListingGalleryEditor,
  listingMap: (props) => <HideIfEmptyEditor {...props} label="Hide when listing has no map" />,
  listingVideo: (props) => <HideIfEmptyEditor {...props} label="Hide when listing has no video" />,
  listingReviews: ListingReviewsEditor,
  listingReviewForm: (props) => <HeadingFieldEditor {...props} tokenField="title" />,
  listingContactForm: (props) => <TitleFieldEditor {...props} titleKey="title" placeholder="e.g. Contact {{title}}" />,
  listingQuickFacts: StyleOnlyEditor,
  listingHours: (props) => <TitleFieldEditor {...props} titleKey="title" placeholder="Hours" />,
  listingAreas: (props) => <TitleFieldEditor {...props} titleKey="title" placeholder="Areas Served" />,
  listingCategories: (props) => <TitleFieldEditor {...props} titleKey="title" placeholder="Categories" />,
  listingSocial: (props) => <TitleFieldEditor {...props} titleKey="title" placeholder="Connect" />,
  listingClaim: StyleOnlyEditor,
};

/* ── Main Editor ────────────────────────────────────────────────────────── */

export default function ListingTemplateEditor({
  block,
  onChange,
  onRemove,
  onDuplicate,
  onUpdateColumn,
  onAddToColumn,
  themeColors,
}: EditorProps) {
  const blockType = block.type;
  const SpecificEditor = EDITOR_MAP[blockType];
  const meta = LISTING_BLOCK_META.find((m) => m.type === blockType);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          {meta ? `${meta.icon} ${meta.label}` : blockType}
        </h3>
        <div className="flex gap-1">
          <button onClick={onDuplicate} className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100">
            Duplicate
          </button>
          <button onClick={onRemove} className="rounded px-2 py-1 text-[10px] text-red-500 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <ListingBindingsEditor
            blockType={blockType}
            props={block.props as Record<string, unknown>}
            onChange={(props) => onChange(props as ListingTemplateBlock["props"])}
          />
        </div>
        {SpecificEditor ? (
          <SpecificEditor
            block={block}
            onChange={onChange}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
            onUpdateColumn={onUpdateColumn}
            themeColors={themeColors}
          />
        ) : (
          <BlockEditor
            block={block as Block}
            onChange={(props) => onChange(props as ListingTemplateBlock["props"])}
            onAddToColumn={onAddToColumn}
          />
        )}
      </div>
    </div>
  );
}
