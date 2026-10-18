/**
 * Header / Footer Builder — Starter Presets
 *
 * Ships ten ready-made, mobile-responsive templates (5 headers + 5 futuristic
 * footers) that admins can drop in from the builder's starter gallery or seed
 * straight into the database (see `packages/db/prisma/seed-header-footers.mts`).
 *
 * Every template uses the Abelo Creative mark as its default logo. A few headers
 * opt into a pinned ("sticky") top position.
 *
 * IMPORTANT: this module is intentionally dependency-free at runtime. It only
 * uses `import type`, so it can be loaded directly by the Node seed script via
 * type stripping (no bundler). Do not add runtime imports here.
 */
import type { HeaderFooterBlock, ContainerSettings } from "./types";

export const DEFAULT_LOGO_SRC = "/abelo-creative-logo.png";
export const DEFAULT_LOGO_ALT = "Abelo Creative";

/* ── Container defaults ─────────────────────────────────────────────────── */

const BASE_CONTAINER: ContainerSettings = {
  width: "boxed",
  maxWidth: 1200,
  minHeight: 0,
  direction: "column",
  justifyContent: "flex-start",
  alignItems: "stretch",
  gapCol: 20,
  gapRow: 0,
  wrap: "nowrap",
  borderStyle: "none",
  borderWidth: 0,
  borderRadius: 0,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  // Horizontal gutter keeps content off the screen edges on mobile; negligible
  // inset on desktop (content is centred within a 1200px box).
  padding: { top: 0, right: 20, bottom: 0, left: 20 },
  zindex: 0,
  cssId: "",
  cssClasses: "",
};

function container(overrides: Partial<ContainerSettings> = {}): ContainerSettings {
  return { ...BASE_CONTAINER, ...overrides };
}

/* ── Block builders ─────────────────────────────────────────────────────── */

function block(type: string, id: string, props: Record<string, unknown>): HeaderFooterBlock {
  return { id, type, props } as unknown as HeaderFooterBlock;
}

function logo(id: string, overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("logo", id, {
    src: DEFAULT_LOGO_SRC,
    alt: DEFAULT_LOGO_ALT,
    linkTo: "/",
    imageWidth: 72,
    imageMaxWidth: 96,
    alignment: "left",
    ...overrides,
  });
}

function menu(id: string, overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("menu", id, {
    menuId: "header",
    orientation: "horizontal",
    style: "links",
    align: "right",
    gap: 28,
    spaceBetween: 28,
    pointer: "underline",
    pointerWidth: 2,
    pointerColor: "#D4A853",
    animation: "fade",
    hPadding: 10,
    vPadding: 8,
    fontSize: 15,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    mobileBreakpoint: 1024,
    mobileMenuStyle: "slide",
    toggleButton: "hamburger",
    toggleAlign: "right",
    toggleSize: 26,
    dropdownBgColor: "#0b1120",
    dropdownTextColor: "#e5e7eb",
    activeColor: "#D4A853",
    ...overrides,
  });
}

function heading(id: string, text: string, overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("heading", id, { text, level: 4, align: "left", ...overrides });
}

function text(id: string, content: string, overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("text", id, { content, align: "left", ...overrides });
}

function button(id: string, textValue: string, overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("button", id, {
    text: textValue,
    url: "#",
    align: "left",
    variant: "solid",
    ...overrides,
  });
}

function search(id: string, overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("search", id, {
    placeholder: "Search the studio…",
    style: "minimal",
    width: 260,
    borderRadius: 999,
    ...overrides,
  });
}

function socialIcons(id: string, overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("socialIcons", id, {
    icons: [
      { platform: "instagram", url: "#", label: "Instagram" },
      { platform: "twitter", url: "#", label: "X" },
      { platform: "linkedin", url: "#", label: "LinkedIn" },
      { platform: "youtube", url: "#", label: "YouTube" },
    ],
    style: "minimal",
    size: "md",
    color: "#9ca3af",
    hoverColor: "#ffffff",
    gap: 16,
    ...overrides,
  });
}

function contactInfo(id: string, overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("contactInfo", id, {
    showPhone: true,
    showEmail: true,
    showAddress: false,
    showHours: false,
    phone: "+1 (555) 010-2030",
    email: "hello@abelocreative.com",
    address: "Remote-first · Worldwide",
    hours: "",
    separator: "newline",
    iconStyle: "none",
    ...overrides,
  });
}

function linkList(id: string, items: string[], overrides: Record<string, unknown> = {}): HeaderFooterBlock {
  return block("iconList", id, {
    layout: "list",
    applyLinkOn: "full_width",
    spaceBetween: 10,
    iconGap: 8,
    align: "left",
    items: items.map((label) => ({ text: label, icon: "", link: "#" })),
    ...overrides,
  });
}

function col(id: string, span: number, blocks: HeaderFooterBlock[], overrides: Record<string, unknown> = {}) {
  return { id, span, blocks, ...overrides };
}

function row(id: string, columns: unknown[], overrides: Record<string, unknown> = {}) {
  return block("row", id, {
    columns,
    gap: 24,
    gapRow: 16,
    align: "center",
    stackOnMobile: true,
    width: "full",
    fullWidth: true,
    ...overrides,
  });
}

/* ── Preset shape ───────────────────────────────────────────────────────── */

export interface HeaderFooterPreset {
  id: string;
  name: string;
  description: string;
  /** Short marketing tag shown on the starter card. */
  badge?: string;
  type: "HEADER" | "FOOTER";
  containerSettings: ContainerSettings;
  blocks: HeaderFooterBlock[];
}

/* ── HEADERS ────────────────────────────────────────────────────────────── */

const HEADER_PRESETS: HeaderFooterPreset[] = [
  {
    id: "preset-header-classic",
    name: "Classic Sticky Bar",
    description: "Logo left, underlined navigation right, with a compact action button. Pinned to the top.",
    badge: "Sticky",
    type: "HEADER",
    containerSettings: container({
      bgColor: "#ffffff",
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: "#e4e4e7",
      sticky: "top",
      cssId: "site-header",
    }),
    blocks: [
      row(
        "h-classic-row",
        [
          col("h-classic-logo", 3, [logo("h-classic-logo-img", { imageWidth: 76 })], { spanSm: 8 }),
          col("h-classic-nav", 6, [
            menu("h-classic-menu", { align: "center", textColor: "#3f3f46", hoverColor: "#111827", pointerColor: "#D4A853", activeColor: "#D4A853" }),
          ], { alignItems: "center", spanSm: 4 }),
          col("h-classic-cta", 3, [
            button("h-classic-btn", "Book a call", { align: "right", variant: "outline", hideOnMobile: true }),
          ], { alignItems: "flex-end", spanSm: 12 }),
        ],
        { paddingY: 12, bgColor: "#ffffff", stackOnMobile: false },
      ),
    ],
  },
  {
    id: "preset-header-centered",
    name: "Centered Wordmark",
    description: "Navigation flanking a centered logo — balanced and editorial. Pinned to the top.",
    badge: "Sticky",
    type: "HEADER",
    containerSettings: container({
      bgColor: "#ffffff",
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: "#e4e4e7",
      sticky: "top",
      cssId: "site-header",
    }),
    blocks: [
      row(
        "h-centered-row",
        [
          col("h-centered-nav", 5, [
            menu("h-centered-menu", { align: "left", textColor: "#3f3f46", pointerColor: "#D4A853" }),
          ], { alignItems: "center", spanSm: 4 }),
          col("h-centered-logo", 2, [
            logo("h-centered-logo-img", { alignment: "center", imageWidth: 84 }),
          ], { alignItems: "center", spanSm: 8 }),
          col("h-centered-cta", 5, [
            button("h-centered-btn", "Start a project", { align: "right", hideOnMobile: true }),
          ], { alignItems: "flex-end", spanSm: 12 }),
        ],
        { paddingY: 14, bgColor: "#ffffff", stackOnMobile: false },
      ),
    ],
  },
  {
    id: "preset-header-glass",
    name: "Glass Overlay",
    description: "Dark translucent bar that floats over hero imagery. Logo plus navigation and search.",
    badge: "Overlay",
    type: "HEADER",
    containerSettings: container({
      bgType: "gradient",
      bgGradientStart: "#0b1120",
      bgGradientEnd: "#1e293b",
      bgGradientAngle: 120,
      textColor: "#e5e7eb",
      cssId: "site-header",
    }),
    blocks: [
      row(
        "h-glass-row",
        [
          col("h-glass-logo", 3, [logo("h-glass-logo-img", { imageWidth: 72 })], { spanSm: 8 }),
          col("h-glass-nav", 5, [
            menu("h-glass-menu", { align: "center", textColor: "#e5e7eb", hoverColor: "#ffffff", pointerColor: "#22d3ee", activeColor: "#22d3ee" }),
          ], { alignItems: "center", spanSm: 4 }),
          col("h-glass-search", 4, [
            search("h-glass-search-bar", { style: "minimal", width: 220, textColor: "#e5e7eb", borderColor: "#334155", hideOnMobile: true }),
          ], { alignItems: "flex-end", spanSm: 12 }),
        ],
        { paddingY: 14, bgColor: undefined, stackOnMobile: false },
      ),
    ],
  },
  {
    id: "preset-header-search",
    name: "Search Forward",
    description: "Prominent search with a hamburger menu — ideal for directories. Pinned to the top.",
    badge: "Sticky",
    type: "HEADER",
    containerSettings: container({
      bgColor: "#0b1120",
      textColor: "#f8fafc",
      sticky: "top",
      cssId: "site-header",
    }),
    blocks: [
      row(
        "h-search-row",
        [
          col("h-search-logo", 3, [logo("h-search-logo-img", { imageWidth: 68 })], { spanSm: 8 }),
          col("h-search-menu", 3, [
            menu("h-search-menu-nav", {
              align: "right",
              style: "hamburger",
              mobileMenuStyle: "slide",
              textColor: "#e2e8f0",
              pointerColor: "#22d3ee",
              activeColor: "#22d3ee",
            }),
          ], { alignItems: "flex-end", spanSm: 4 }),
          col("h-search-bar", 6, [
            search("h-search-bar-input", { style: "minimal", width: 320, textColor: "#e2e8f0", borderColor: "#334155", hideOnMobile: true }),
          ], { alignItems: "center", spanSm: 12 }),
        ],
        { paddingY: 14, bgColor: undefined, stackOnMobile: false },
      ),
    ],
  },
  {
    id: "preset-header-neon",
    name: "Neon Split",
    description: "High-contrast gradient rail with a gold accent CTA. Pinned to the top.",
    badge: "Sticky",
    type: "HEADER",
    containerSettings: container({
      bgType: "gradient",
      bgGradientStart: "#111827",
      bgGradientEnd: "#312e81",
      bgGradientAngle: 90,
      textColor: "#f8fafc",
      sticky: "top",
      cssId: "site-header",
    }),
    blocks: [
      row(
        "h-neon-row",
        [
          col("h-neon-logo", 4, [logo("h-neon-logo-img", { imageWidth: 74 })], { spanSm: 8 }),
          col("h-neon-nav", 5, [
            menu("h-neon-menu", { align: "center", textColor: "#e5e7eb", hoverColor: "#ffffff", pointerColor: "#D4A853", activeColor: "#D4A853" }),
          ], { alignItems: "center", spanSm: 4 }),
          col("h-neon-cta", 3, [
            button("h-neon-btn", "Get started", { align: "right", hideOnMobile: true }),
          ], { alignItems: "flex-end", spanSm: 12 }),
        ],
        { paddingY: 14, bgColor: undefined, stackOnMobile: false },
      ),
    ],
  },
];

/* ── FOOTERS ────────────────────────────────────────────────────────────── */

const FOOTER_PRESETS: HeaderFooterPreset[] = [
  {
    id: "preset-footer-neon-grid",
    name: "Neon Grid",
    description: "Four-column command deck: brand, link clusters and a subscribe panel on a deep gradient.",
    badge: "Futuristic",
    type: "FOOTER",
    containerSettings: container({
      bgType: "gradient",
      bgGradientStart: "#0b1120",
      bgGradientEnd: "#1e1b4b",
      bgGradientAngle: 135,
      textColor: "#cbd5e1",
      cssId: "site-footer",
    }),
    blocks: [
      row(
        "f-neon-main",
        [
          col("f-neon-brand", 3, [
            logo("f-neon-logo", { imageWidth: 96 }),
            text("f-neon-tagline", "Design, build, and grow — a studio for the next web.", { textColor: "#94a3b8" }),
            socialIcons("f-neon-social"),
          ], { gapRow: 16, spanSm: 12 }),
          col("f-neon-explore", 3, [
            heading("f-neon-explore-h", "Explore", { textColor: "#f8fafc" }),
            linkList("f-neon-explore-list", ["Home", "Directory", "Pricing", "Journal"]),
          ], { gapRow: 12, spanSm: 6 }),
          col("f-neon-company", 3, [
            heading("f-neon-company-h", "Studio", { textColor: "#f8fafc" }),
            linkList("f-neon-company-list", ["About", "Careers", "Contact", "Press"]),
          ], { gapRow: 12, spanSm: 6 }),
          col("f-neon-news", 3, [
            heading("f-neon-news-h", "Join the signal", { textColor: "#f8fafc" }),
            text("f-neon-news-copy", "Monthly notes on design, growth, and web craft.", { textColor: "#94a3b8" }),
            search("f-neon-news-input", { placeholder: "Your email", style: "minimal", width: 220, textColor: "#e2e8f0", borderColor: "#334155" }),
            button("f-neon-news-btn", "Subscribe"),
          ], { gapRow: 12, spanSm: 12 }),
        ],
        { align: "start", paddingY: 48, bgColor: undefined },
      ),
      row(
        "f-neon-legal",
        [
          col("f-neon-copy", 6, [
            text("f-neon-copy-text", "© Abelo Creative. All rights reserved.", { textColor: "#64748b" }),
          ], { spanSm: 12 }),
          col("f-neon-links", 6, [
            text("f-neon-links-text", "Privacy · Terms · Cookies", { align: "right", textColor: "#64748b" }),
          ], { spanSm: 12 }),
        ],
        { paddingY: 18, bgColor: undefined, borderStyle: "solid", borderWidth: 1, borderColor: "#1e293b" },
      ),
    ],
  },
  {
    id: "preset-footer-aurora",
    name: "Aurora Wave",
    description: "Centered wordmark and social row over a violet aurora gradient — calm and modern.",
    badge: "Futuristic",
    type: "FOOTER",
    containerSettings: container({
      bgType: "gradient",
      bgGradientStart: "#1e1b4b",
      bgGradientEnd: "#0f172a",
      bgGradientAngle: 160,
      textColor: "#e2e8f0",
      cssId: "site-footer",
    }),
    blocks: [
      row(
        "f-aurora-top",
        [
          col("f-aurora-brand", 12, [
            logo("f-aurora-logo", { alignment: "center", imageWidth: 104 }),
            heading("f-aurora-tag", "Crafting the future of the web", { level: 3, align: "center", textColor: "#f8fafc" }),
            text("f-aurora-copy", "Brand, product, and growth for ambitious teams.", { align: "center", textColor: "#94a3b8" }),
            socialIcons("f-aurora-social", { color: "#a5b4fc", hoverColor: "#ffffff" }),
          ], { alignItems: "center", gapRow: 16, spanSm: 12 }),
        ],
        { align: "center", paddingY: 56, bgColor: undefined },
      ),
      row(
        "f-aurora-legal",
        [
          col("f-aurora-copy2", 12, [
            text("f-aurora-copy2-text", "© Abelo Creative · Privacy · Terms", { align: "center", textColor: "#64748b" }),
          ], { alignItems: "center", spanSm: 12 }),
        ],
        { paddingY: 16, bgColor: undefined, borderStyle: "solid", borderWidth: 1, borderColor: "#312e81" },
      ),
    ],
  },
  {
    id: "preset-footer-terminal",
    name: "Data Terminal",
    description: "Monospaced headings, contact readout and resource links on a teal→void gradient.",
    badge: "Futuristic",
    type: "FOOTER",
    containerSettings: container({
      bgType: "gradient",
      bgGradientStart: "#042f2e",
      bgGradientEnd: "#020617",
      bgGradientAngle: 120,
      textColor: "#99f6e4",
      cssId: "site-footer",
    }),
    blocks: [
      row(
        "f-term-main",
        [
          col("f-term-brand", 4, [
            logo("f-term-logo", { imageWidth: 88 }),
            text("f-term-tagline", "An independent studio shipping fast, sharp, resilient products.", { textColor: "#5eead4" }),
            contactInfo("f-term-contact", { textColor: "#5eead4" }),
          ], { gapRow: 14, spanSm: 12 }),
          col("f-term-product", 4, [
            heading("f-term-product-h", "PRODUCT", { textColor: "#f0fdfa", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: 2 }),
            linkList("f-term-product-list", ["Platform", "Integrations", "Changelog", "Status"], { textColor: "#5eead4" }),
          ], { gapRow: 12, spanSm: 6 }),
          col("f-term-resources", 4, [
            heading("f-term-resources-h", "RESOURCES", { textColor: "#f0fdfa", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: 2 }),
            linkList("f-term-resources-list", ["Docs", "Guides", "Support", "Community"], { textColor: "#5eead4" }),
          ], { gapRow: 12, spanSm: 6 }),
        ],
        { align: "start", paddingY: 48, bgColor: undefined },
      ),
      row(
        "f-term-legal",
        [
          col("f-term-copy", 12, [
            text("f-term-copy-text", "// © Abelo Creative — built for the long run", { textColor: "#0d9488" }),
          ], { spanSm: 12 }),
        ],
        { paddingY: 16, bgColor: undefined, borderStyle: "solid", borderWidth: 1, borderColor: "#134e4a" },
      ),
    ],
  },
  {
    id: "preset-footer-orbital",
    name: "Orbital Split",
    description: "A dominant brand panel with a subscribe module, ringed by tidy navigation clusters.",
    badge: "Futuristic",
    type: "FOOTER",
    containerSettings: container({
      bgType: "gradient",
      bgGradientStart: "#111827",
      bgGradientEnd: "#0b1120",
      bgGradientAngle: 135,
      textColor: "#cbd5e1",
      cssId: "site-footer",
    }),
    blocks: [
      row(
        "f-orbital-hero",
        [
          col("f-orbital-brand", 6, [
            logo("f-orbital-logo", { imageWidth: 108 }),
            heading("f-orbital-tag", "Orbiting your next launch", { level: 3, textColor: "#f8fafc" }),
            text("f-orbital-copy", "Strategy, design and engineering in one tight orbit.", { textColor: "#94a3b8" }),
            socialIcons("f-orbital-social", { color: "#D4A853", hoverColor: "#ffffff" }),
          ], { gapRow: 14, spanSm: 12 }),
          col("f-orbital-sub", 6, [
            heading("f-orbital-sub-h", "Newsletter", { textColor: "#f8fafc" }),
            text("f-orbital-sub-copy", "One email a month. Zero noise.", { textColor: "#94a3b8" }),
            search("f-orbital-sub-input", { placeholder: "you@company.com", style: "minimal", width: 260, textColor: "#e2e8f0", borderColor: "#334155" }),
            button("f-orbital-sub-btn", "Join orbit"),
          ], { alignItems: "flex-start", gapRow: 12, spanSm: 12 }),
        ],
        { align: "start", gap: 48, paddingY: 52, bgColor: undefined },
      ),
      row(
        "f-orbital-links",
        [
          col("f-orbital-l1", 4, [heading("f-orbital-l1h", "Product", { textColor: "#e2e8f0" }), linkList("f-orbital-l1l", ["Overview", "Features", "Pricing"])], { gapRow: 10, spanSm: 6 }),
          col("f-orbital-l2", 4, [heading("f-orbital-l2h", "Company", { textColor: "#e2e8f0" }), linkList("f-orbital-l2l", ["About", "Careers", "Blog"])], { gapRow: 10, spanSm: 6 }),
          col("f-orbital-l3", 4, [heading("f-orbital-l3h", "Legal", { textColor: "#e2e8f0" }), linkList("f-orbital-l3l", ["Privacy", "Terms", "Security"])], { gapRow: 10, spanSm: 6 }),
        ],
        { align: "start", paddingY: 32, bgColor: undefined, borderStyle: "solid", borderWidth: 1, borderColor: "#1f2937" },
      ),
    ],
  },
  {
    id: "preset-footer-hologram",
    name: "Hologram Bar",
    description: "A slim, high-gloss bar: mark on the left, quick links centered, socials on the right.",
    badge: "Futuristic",
    type: "FOOTER",
    containerSettings: container({
      bgType: "gradient",
      bgGradientStart: "#0f172a",
      bgGradientEnd: "#1e293b",
      bgGradientAngle: 90,
      textColor: "#cbd5e1",
      cssId: "site-footer",
    }),
    blocks: [
      row(
        "f-holo-bar",
        [
          col("f-holo-logo", 3, [logo("f-holo-logo-img", { imageWidth: 82 })], { spanSm: 12 }),
          col("f-holo-links", 6, [
            linkList("f-holo-links-list", ["Home", "Work", "Studio", "Contact"], { layout: "inline", align: "center", spaceBetween: 22, textColor: "#cbd5e1" }),
          ], { alignItems: "center", spanSm: 12 }),
          col("f-holo-social", 3, [
            socialIcons("f-holo-social-icons", { color: "#22d3ee", hoverColor: "#ffffff" }),
          ], { alignItems: "flex-end", spanSm: 12 }),
        ],
        { paddingY: 22, bgColor: undefined },
      ),
      row(
        "f-holo-legal",
        [
          col("f-holo-copy", 12, [
            text("f-holo-copy-text", "© Abelo Creative — handcrafted on the edge of the grid.", { align: "center", textColor: "#64748b" }),
          ], { alignItems: "center", spanSm: 12 }),
        ],
        { paddingY: 14, bgColor: undefined, borderStyle: "solid", borderWidth: 1, borderColor: "#1e293b" },
      ),
    ],
  },
];

/* ── Public API ─────────────────────────────────────────────────────────── */

export const ALL_HEADER_FOOTER_PRESETS: HeaderFooterPreset[] = [
  ...HEADER_PRESETS,
  ...FOOTER_PRESETS,
];

export { HEADER_PRESETS, FOOTER_PRESETS };

export function getPresetById(id: string): HeaderFooterPreset | undefined {
  return ALL_HEADER_FOOTER_PRESETS.find((preset) => preset.id === id);
}

/** Serialize a preset to the exact `data` shape the builder stores. */
export function serializePreset(preset: HeaderFooterPreset): string {
  return JSON.stringify({
    blocks: preset.blocks,
    containerSettings: preset.containerSettings,
  });
}

/** Menus passed to the renderer when showing gallery previews. */
export const PRESET_PREVIEW_MENUS = {
  header: [
    { id: "p-home", label: "Home", href: "/" },
    { id: "p-work", label: "Work", href: "#" },
    { id: "p-studio", label: "Studio", href: "#" },
    { id: "p-contact", label: "Contact", href: "#" },
  ],
  footer: [],
};
