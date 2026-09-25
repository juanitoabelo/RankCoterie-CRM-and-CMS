"use client";

/**
 * Human-friendly labels + icons for every block type the three builders share.
 * Row/section/column kinds get their own labels from `kindLabel`.
 */
export const BLOCK_LABELS: Record<string, { label: string; icon: string }> = {
  logo: { label: "Logo", icon: "◎" },
  menu: { label: "Menu", icon: "☰" },
  socialIcons: { label: "Social Icons", icon: "⏹" },
  contactInfo: { label: "Contact Info", icon: "📞" },
  search: { label: "Search", icon: "🔍" },
  hero: { label: "Hero", icon: "⬛" },
  text: { label: "Text", icon: "📝" },
  image: { label: "Image", icon: "🖼" },
  cta: { label: "CTA", icon: "🔘" },
  features: { label: "Features", icon: "📊" },
  button: { label: "Button", icon: "🔗" },
  embed: { label: "Embed", icon: "</>" },
  faq: { label: "FAQ", icon: "❓" },
  testimonial: { label: "Testimonial", icon: "💬" },
  spacer: { label: "Spacer", icon: "↕" },
  divider: { label: "Divider", icon: "—" },
  heading: { label: "Heading", icon: "H" },
  list: { label: "List", icon: "≡" },
  iconList: { label: "Icon List", icon: "≡" },
  googleMap: { label: "Map", icon: "🗺" },
  video: { label: "Video", icon: "▶" },
  slider: { label: "Slider", icon: "◫" },
  contentGrid: { label: "Content Grid", icon: "▦" },
  row: { label: "Row", icon: "▦" },
  section: { label: "Section", icon: "▣" },
};

export function blockLabel(type: string, fallback?: string): string {
  return BLOCK_LABELS[type]?.label ?? fallback ?? type;
}

export function blockIcon(type: string, fallback = "□"): string {
  return BLOCK_LABELS[type]?.icon ?? fallback;
}

export function kindLabel(kind: string | null, extra?: string): string {
  switch (kind) {
    case "section":
      return extra ? `Section · ${extra}` : "Section";
    case "row":
      return extra ? `Row · ${extra}` : "Row";
    case "column":
      return "Column";
    case "container":
      return "Container";
    default:
      return extra ? `Block · ${extra}` : "Block";
  }
}