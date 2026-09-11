"use client";

import type { HeaderFooterBlock } from "@/lib/header-footer/types";
import type { ColumnData } from "@/lib/page-builder/types";

type EditorProps = {
  block: HeaderFooterBlock;
  onChange: (props: HeaderFooterBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateColumn: (columnId: string, patch: Record<string, unknown>) => void;
};

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-zinc-600";

/* ── Logo Editor ──────────────────────────────────────────────────────── */

function LogoEditor({ block, onChange }: EditorProps) {
  const p = block.props as { src: string; alt: string; linkTo: string; width: number; height: number };
  return (
    <div className="space-y-3">
      <label className={labelCls}>
        Logo Image URL
        <input
          type="text"
          value={p.src}
          onChange={(e) => onChange({ ...p, src: e.target.value })}
          placeholder="https://... or /api/assets/..."
          className={inputCls}
        />
      </label>
      <label className={labelCls}>
        Alt Text
        <input
          type="text"
          value={p.alt}
          onChange={(e) => onChange({ ...p, alt: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className={labelCls}>
        Link To
        <input
          type="text"
          value={p.linkTo}
          onChange={(e) => onChange({ ...p, linkTo: e.target.value })}
          placeholder="/"
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Max Width (px)
          <input
            type="number"
            value={p.width}
            onChange={(e) => onChange({ ...p, width: Number(e.target.value) || 150 })}
            min={20}
            max={600}
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          Max Height (px)
          <input
            type="number"
            value={p.height}
            onChange={(e) => onChange({ ...p, height: Number(e.target.value) || 50 })}
            min={10}
            max={200}
            className={inputCls}
          />
        </label>
      </div>
    </div>
  );
}

/* ── Menu Editor ──────────────────────────────────────────────────────── */

function MenuEditor({ block, onChange }: EditorProps) {
  const p = block.props as {
    menuId: string;
    orientation: "horizontal" | "vertical";
    style: "links" | "dropdown" | "hamburger";
    align: "left" | "center" | "right" | "between";
    gap: number;
    textColor?: string;
    hoverColor?: string;
    fontSize?: number;
    mobileMenuStyle: "slide" | "overlay" | "dropdown";
  };
  const set = (patch: Record<string, unknown>) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-3">
      <label className={labelCls}>
        Menu ID
        <input
          type="text"
          value={p.menuId}
          onChange={(e) => set({ menuId: e.target.value })}
          placeholder="header / footer"
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Orientation
          <select
            value={p.orientation}
            onChange={(e) => set({ orientation: e.target.value })}
            className={inputCls}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <label className={labelCls}>
          Style
          <select
            value={p.style}
            onChange={(e) => set({ style: e.target.value })}
            className={inputCls}
          >
            <option value="links">Links</option>
            <option value="dropdown">Dropdown</option>
            <option value="hamburger">Hamburger</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Alignment
          <select
            value={p.align}
            onChange={(e) => set({ align: e.target.value })}
            className={inputCls}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="between">Space Between</option>
          </select>
        </label>
        <label className={labelCls}>
          Gap (px)
          <input
            type="number"
            value={p.gap}
            onChange={(e) => set({ gap: Number(e.target.value) || 24 })}
            min={0}
            max={64}
            className={inputCls}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Text Color
          <input
            type="color"
            value={p.textColor || "#111827"}
            onChange={(e) => set({ textColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
        <label className={labelCls}>
          Hover Color
          <input
            type="color"
            value={p.hoverColor || "#2563eb"}
            onChange={(e) => set({ hoverColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
      </div>
      <label className={labelCls}>
        Font Size (px)
        <input
          type="number"
          value={p.fontSize || 16}
          onChange={(e) => set({ fontSize: Number(e.target.value) || 16 })}
          min={10}
          max={32}
          className={inputCls}
        />
      </label>
      <label className={labelCls}>
        Mobile Menu Style
        <select
          value={p.mobileMenuStyle}
          onChange={(e) => set({ mobileMenuStyle: e.target.value })}
          className={inputCls}
        >
          <option value="slide">Slide</option>
          <option value="overlay">Overlay</option>
          <option value="dropdown">Dropdown</option>
        </select>
      </label>
    </div>
  );
}

/* ── Social Icons Editor ──────────────────────────────────────────────── */

function SocialIconsEditor({ block, onChange }: EditorProps) {
  const p = block.props as {
    icons: Array<{ platform: string; url: string; label: string }>;
    style: "filled" | "outlined" | "minimal";
    size: "sm" | "md" | "lg";
    color: string;
    hoverColor: string;
    gap: number;
  };

  const updateIcon = (index: number, patch: Record<string, string>) => {
    const icons = [...p.icons];
    icons[index] = { ...icons[index], ...patch };
    onChange({ ...p, icons });
  };

  const addIcon = () => {
    onChange({
      ...p,
      icons: [...p.icons, { platform: "custom", url: "", label: "" }],
    });
  };

  const removeIcon = (index: number) => {
    onChange({ ...p, icons: p.icons.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {p.icons.map((icon, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={icon.platform}
              onChange={(e) => updateIcon(i, { platform: e.target.value })}
              className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-xs"
            >
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="pinterest">Pinterest</option>
              <option value="tiktok">TikTok</option>
              <option value="github">GitHub</option>
              <option value="custom">Custom</option>
            </select>
            <input
              type="url"
              value={icon.url}
              onChange={(e) => updateIcon(i, { url: e.target.value })}
              placeholder="https://..."
              className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-xs"
            />
            <button
              onClick={() => removeIcon(i)}
              className="rounded px-2 text-xs text-red-500 hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addIcon}
        className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
      >
        + Add Icon
      </button>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Style
          <select
            value={p.style}
            onChange={(e) => onChange({ ...p, style: e.target.value as "filled" | "outlined" | "minimal" })}
            className={inputCls}
          >
            <option value="filled">Filled</option>
            <option value="outlined">Outlined</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>
        <label className={labelCls}>
          Size
          <select
            value={p.size}
            onChange={(e) => onChange({ ...p, size: e.target.value as "sm" | "md" | "lg" })}
            className={inputCls}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Color
          <input
            type="color"
            value={p.color}
            onChange={(e) => onChange({ ...p, color: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
        <label className={labelCls}>
          Hover Color
          <input
            type="color"
            value={p.hoverColor}
            onChange={(e) => onChange({ ...p, hoverColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
      </div>
      <label className={labelCls}>
        Gap (px)
        <input
          type="number"
          value={p.gap}
          onChange={(e) => onChange({ ...p, gap: Number(e.target.value) || 16 })}
          min={0}
          max={48}
          className={inputCls}
        />
      </label>
    </div>
  );
}

/* ── Contact Info Editor ──────────────────────────────────────────────── */

function ContactInfoEditor({ block, onChange }: EditorProps) {
  const p = block.props as {
    showPhone: boolean;
    showEmail: boolean;
    showAddress: boolean;
    showHours: boolean;
    phone: string;
    email: string;
    address: string;
    hours: string;
    separator: string;
    iconStyle: string;
    textColor?: string;
    fontSize?: number;
  };
  const set = (patch: Record<string, unknown>) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "showPhone", label: "Phone" },
          { key: "showEmail", label: "Email" },
          { key: "showAddress", label: "Address" },
          { key: "showHours", label: "Hours" },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={p[item.key as keyof typeof p] as boolean}
              onChange={(e) => set({ [item.key]: e.target.checked })}
              className="accent-amber-600"
            />
            {item.label}
          </label>
        ))}
      </div>
      {p.showPhone && (
        <label className={labelCls}>
          Phone
          <input
            type="tel"
            value={p.phone}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="(555) 123-4567"
            className={inputCls}
          />
        </label>
      )}
      {p.showEmail && (
        <label className={labelCls}>
          Email
          <input
            type="email"
            value={p.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="info@example.com"
            className={inputCls}
          />
        </label>
      )}
      {p.showAddress && (
        <label className={labelCls}>
          Address
          <textarea
            value={p.address}
            onChange={(e) => set({ address: e.target.value })}
            rows={2}
            className={inputCls}
          />
        </label>
      )}
      {p.showHours && (
        <label className={labelCls}>
          Hours
          <textarea
            value={p.hours}
            onChange={(e) => set({ hours: e.target.value })}
            rows={2}
            placeholder="Mon-Fri: 9am-5pm"
            className={inputCls}
          />
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Separator
          <select
            value={p.separator}
            onChange={(e) => set({ separator: e.target.value })}
            className={inputCls}
          >
            <option value="dot">Dot (·)</option>
            <option value="pipe">Pipe (|)</option>
            <option value="space">Space</option>
            <option value="newline">New Line</option>
          </select>
        </label>
        <label className={labelCls}>
          Icon Style
          <select
            value={p.iconStyle}
            onChange={(e) => set({ iconStyle: e.target.value })}
            className={inputCls}
          >
            <option value="none">None</option>
            <option value="emoji">Emoji</option>
            <option value="svg">SVG</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Text Color
          <input
            type="color"
            value={p.textColor || "#6b7280"}
            onChange={(e) => set({ textColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
        <label className={labelCls}>
          Font Size (px)
          <input
            type="number"
            value={p.fontSize || 14}
            onChange={(e) => set({ fontSize: Number(e.target.value) || 14 })}
            min={10}
            max={32}
            className={inputCls}
          />
        </label>
      </div>
    </div>
  );
}

/* ── Search Editor ─────────────────────────────────────────────────────── */

function SearchEditor({ block, onChange }: EditorProps) {
  const p = block.props as {
    placeholder: string;
    style: string;
    width: number;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    borderRadius: number;
  };
  const set = (patch: Record<string, unknown>) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-3">
      <label className={labelCls}>
        Placeholder
        <input
          type="text"
          value={p.placeholder}
          onChange={(e) => set({ placeholder: e.target.value })}
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Style
          <select
            value={p.style}
            onChange={(e) => set({ style: e.target.value })}
            className={inputCls}
          >
            <option value="minimal">Minimal</option>
            <option value="expanded">Expanded</option>
            <option value="icon-only">Icon Only</option>
          </select>
        </label>
        <label className={labelCls}>
          Width (px)
          <input
            type="number"
            value={p.width}
            onChange={(e) => set({ width: Number(e.target.value) || 300 })}
            min={100}
            max={600}
            className={inputCls}
          />
        </label>
      </div>
      <label className={labelCls}>
        Border Radius (px)
        <input
          type="number"
          value={p.borderRadius}
          onChange={(e) => set({ borderRadius: Number(e.target.value) || 0 })}
          min={0}
          max={32}
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className={labelCls}>
          BG Color
          <input
            type="color"
            value={p.bgColor || "#ffffff"}
            onChange={(e) => set({ bgColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
        <label className={labelCls}>
          Border Color
          <input
            type="color"
            value={p.borderColor || "#d1d5db"}
            onChange={(e) => set({ borderColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
        <label className={labelCls}>
          Text Color
          <input
            type="color"
            value={p.textColor || "#111827"}
            onChange={(e) => set({ textColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
      </div>
    </div>
  );
}

/* ── Row Editor (simplified) ──────────────────────────────────────────── */

function RowEditor({ block, onChange }: EditorProps) {
  const p = block.props as {
    columns: ColumnData[];
    gap: number;
    align: string;
    stackOnMobile: boolean;
    paddingY: number;
    fullWidth: boolean;
    bgColor?: string;
    textColor?: string;
  };
  const set = (patch: Record<string, unknown>) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Gap (px)
          <input
            type="number"
            value={p.gap}
            onChange={(e) => set({ gap: Number(e.target.value) || 24 })}
            min={0}
            max={64}
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          Vertical Padding (px)
          <input
            type="number"
            value={p.paddingY}
            onChange={(e) => set({ paddingY: Number(e.target.value) || 24 })}
            min={0}
            max={120}
            className={inputCls}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Alignment
          <select
            value={p.align}
            onChange={(e) => set({ align: e.target.value })}
            className={inputCls}
          >
            <option value="start">Top</option>
            <option value="center">Center</option>
            <option value="end">Bottom</option>
            <option value="stretch">Stretch</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={p.stackOnMobile}
            onChange={(e) => set({ stackOnMobile: e.target.checked })}
            className="accent-amber-600"
          />
          Stack on Mobile
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={p.fullWidth}
          onChange={(e) => set({ fullWidth: e.target.checked })}
          className="accent-amber-600"
        />
        Full Width
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Background Color
          <input
            type="color"
            value={p.bgColor || "#ffffff"}
            onChange={(e) => set({ bgColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
        <label className={labelCls}>
          Text Color
          <input
            type="color"
            value={p.textColor || "#111827"}
            onChange={(e) => set({ textColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
        </label>
      </div>
    </div>
  );
}

/* ── Generic Fallback Editor ───────────────────────────────────────────── */

function GenericEditor({ block, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Edit the <strong>{block.type}</strong> block properties below.
      </p>
      <pre className="max-h-48 overflow-auto rounded bg-zinc-100 p-2 text-[10px] text-zinc-600">
        {JSON.stringify(block.props, null, 2)}
      </pre>
    </div>
  );
}

/* ── Editor Router ─────────────────────────────────────────────────────── */

const EDITORS: Record<string, React.ComponentType<EditorProps>> = {
  logo: LogoEditor,
  menu: MenuEditor,
  socialIcons: SocialIconsEditor,
  contactInfo: ContactInfoEditor,
  search: SearchEditor,
  row: RowEditor,
};

export default function HeaderFooterEditor({
  block,
  onChange,
  onRemove,
  onDuplicate,
  onUpdateColumn,
}: EditorProps) {
  const Editor = EDITORS[block.type] ?? GenericEditor;

  const icon = getBlockIcon(block.type);
  const label = getBlockLabel(block.type);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            {label}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onDuplicate}
            className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
            title="Duplicate"
          >
            ⧉
          </button>
          <button
            onClick={onRemove}
            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="p-4">
        <Editor
          block={block}
          onChange={onChange}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onUpdateColumn={onUpdateColumn}
        />
      </div>
    </div>
  );
}

function getBlockIcon(type: string): string {
  const icons: Record<string, string> = {
    logo: "◎",
    menu: "☰",
    socialIcons: "⏹",
    contactInfo: "📞",
    search: "🔍",
    hero: "⬛",
    text: "📝",
    image: "🖼",
    cta: "🔘",
    features: "📊",
    button: "🔗",
    embed: "</>",
    faq: "❓",
    testimonial: "💬",
    spacer: "↕",
    divider: "—",
    heading: "H",
    list: "≡",
    slider: "◫",
    contentGrid: "▦",
    row: "▦",
    section: "▣",
  };
  return icons[type] ?? "□";
}

function getBlockLabel(type: string): string {
  const labels: Record<string, string> = {
    logo: "Logo",
    menu: "Menu",
    socialIcons: "Social Icons",
    contactInfo: "Contact Info",
    search: "Search",
    hero: "Hero",
    text: "Text",
    image: "Image",
    cta: "CTA",
    features: "Features",
    button: "Button",
    embed: "Embed",
    faq: "FAQ",
    testimonial: "Testimonial",
    spacer: "Spacer",
    divider: "Divider",
    heading: "Heading",
    list: "List",
    slider: "Slider",
    contentGrid: "Content Grid",
    row: "Row",
    section: "Section",
  };
  return labels[type] ?? type;
}
