export interface BlockBase {
  id: string;
  type: string;
}

/**
 * Per-breakpoint typography overrides ("style guide"). Each breakpoint can set
 * color, font family, and font size independently; missing values fall through
 * to the next larger breakpoint (or the block's own default styling).
 */
export interface TypographyStyle {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontSizeUnit?: "px" | "em" | "rem" | "%";
}

export type StyleBreakpoints = {
  mobile?: TypographyStyle;
  sm?: TypographyStyle;
  md?: TypographyStyle;
  lg?: TypographyStyle;
};

export interface HeroBlock extends BlockBase {
  type: "hero";
  props: {
    heading: string;
    subheading: string;
    bgColor: string;
    textColor: string;
    style?: StyleBreakpoints;
  };
}

export interface TextBlock extends BlockBase {
  type: "text";
  props: {
    content: string;
    align: "left" | "center" | "right";
    style?: StyleBreakpoints;
  };
}

export interface ImageBlock extends BlockBase {
  type: "image";
  props: {
    src: string;
    alt: string;
    caption: string;
    width: "full" | "wide" | "narrow";
  };
}

export interface CtaBlock extends BlockBase {
  type: "cta";
  props: {
    heading: string;
    body: string;
    buttonText: string;
    buttonUrl: string;
    bgColor: string;
    style?: StyleBreakpoints;
  };
}

export interface FeaturesBlock extends BlockBase {
  type: "features";
  props: {
    heading: string;
    items: Array<{ icon: string; title: string; description: string }>;
    columns: 2 | 3 | 4;
    style?: StyleBreakpoints;
  };
}

export interface ButtonBlock extends BlockBase {
  type: "button";
  props: {
    text: string;
    url: string;
    align: "left" | "center" | "right";
    variant: "solid" | "outline";
    style?: StyleBreakpoints;
  };
}

export interface EmbedBlock extends BlockBase {
  type: "embed";
  props: {
    html: string;
  };
}

export interface FaqBlock extends BlockBase {
  type: "faq";
  props: {
    heading: string;
    items: Array<{ question: string; answer: string }>;
    style?: StyleBreakpoints;
  };
}

export interface TestimonialBlock extends BlockBase {
  type: "testimonial";
  props: {
    quote: string;
    author: string;
    role: string;
    rating: 0 | 1 | 2 | 3 | 4 | 5;
    style?: StyleBreakpoints;
  };
}

export interface SpacerBlock extends BlockBase {
  type: "spacer";
  props: {
    height: number;
  };
}

export interface DividerBlock extends BlockBase {
  type: "divider";
  props: Record<string, never>;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  props: {
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    align: "left" | "center" | "right";
    style?: StyleBreakpoints;
  };
}

export interface ListBlock extends BlockBase {
  type: "list";
  props: {
    ordered: boolean;
    items: string[];
    style?: StyleBreakpoints;
  };
}

export interface SliderSlide {
  src: string;
  alt: string;
  title: string;
  caption: string;
  url: string;
}

export type SliderFit = "cover" | "fluid";
export type SliderCaptionLayout = "bottom" | "center";

export interface SliderBlock extends BlockBase {
  type: "slider";
  props: {
    slides: SliderSlide[];
    height: "sm" | "md" | "lg";
    itemsPerView: number;
    imageFit: SliderFit;
    captionLayout: SliderCaptionLayout;
    style?: StyleBreakpoints;
  };
}

export type ContentGridSource = "articles" | "feeds";
export type ContentGridColumns = 2 | 3 | 4;

export interface ContentGridBlock extends BlockBase {
  type: "contentGrid";
  props: {
    heading: string;
    source: ContentGridSource;
    /** Empty string means all categories. */
    categoryId: string;
    perPage: number;
    columns: ContentGridColumns;
    showExcerpt: boolean;
    order: "desc" | "asc";
    style?: StyleBreakpoints;
  };
}

export const COLUMN_SPANS = [3, 4, 6, 8, 12] as const;
export type ColumnSpan = (typeof COLUMN_SPANS)[number];

/** Every width available in the 12-column grid used by responsive column settings. */
export const FULL_COLUMN_SPANS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export interface ColumnData {
  id: string;
  /** Desktop width in the 12-column grid (grid units). */
  span: number;
  /** Optional tablet override (grid units). Falls back to `span` on tablet. */
  spanMd?: number;
  /** Optional mobile override (grid units). Falls back to the row's stack-on-mobile default. */
  spanSm?: number;
  blocks: Block[];
  bgColor?: string;
  bgImage?: string;
}

export interface RowBlock extends BlockBase {
  type: "row";
  props: {
    columns: ColumnData[];
    gap: number; // px between columns
    align: "start" | "center" | "end" | "stretch";
    stackOnMobile: boolean; // columns become full-width on small screens
    bgColor?: string;
    bgImage?: string;
    textColor?: string;
    paddingY?: number; // vertical padding in px
    fullWidth?: boolean; // stretch the row edge-to-edge (no horizontal padding)
  };
}

/**
 * Full-width section container. Wraps one or more rows and renders
 * edge-to-edge with its own background image/color and padding.
 */
export interface SectionBlock extends BlockBase {
  type: "section";
  props: {
    rows: RowBlock[];
    bgColor?: string;
    bgImage?: string;
    textColor?: string;
    paddingTop?: number;
    paddingBottom?: number;
  };
}

export type Block =
  | HeroBlock
  | TextBlock
  | ImageBlock
  | CtaBlock
  | FeaturesBlock
  | ButtonBlock
  | EmbedBlock
  | FaqBlock
  | TestimonialBlock
  | SpacerBlock
  | DividerBlock
  | HeadingBlock
  | ListBlock
  | SliderBlock
  | ContentGridBlock
  | RowBlock
  | SectionBlock;

export type BlockType = Block["type"];

export function isRowBlock(block: Block): block is RowBlock {
  return block.type === "row";
}

export function isSectionBlock(block: Block): block is SectionBlock {
  return block.type === "section";
}

/** Block types allowed inside a row column (i.e. everything except rows and sections). */
export const LEAF_BLOCK_TYPES: BlockType[] = [
  "hero",
  "text",
  "image",
  "cta",
  "features",
  "button",
  "embed",
  "faq",
  "testimonial",
  "spacer",
  "divider",
  "heading",
  "list",
  "slider",
  "contentGrid",
];

/** Id prefix used by draggable palette items so drag events can be distinguished from real blocks. */
export const PALETTE_PREFIX = "palette:";
/** Id prefix used by draggable prebuilt row-layout items. */
export const LAYOUT_PREFIX = "layout:";
/** Id prefix used by draggable snippet items. */
export const SNIPPET_PREFIX = "snippet:";

export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  defaults: Block["props"];
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "row",
    label: "Row / Columns",
    icon: "▦",
    defaults: {
      columns: [],
      gap: 24,
      align: "stretch",
      stackOnMobile: true,
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingY: 24,
      fullWidth: false,
    },
  },
  {
    type: "section",
    label: "Section (Full Width)",
    icon: "▣",
    defaults: {
      rows: [],
      bgColor: "#f4f4f5",
      bgImage: "",
      textColor: "#18181b",
      paddingTop: 48,
      paddingBottom: 48,
    },
  },
  {
    type: "hero",
    label: "Hero",
    icon: "⬛",
    defaults: {
      heading: "Welcome",
      subheading: "Your subheading goes here",
      bgColor: "#18181b",
      textColor: "#ffffff",
    },
  },
  {
    type: "text",
    label: "Text",
    icon: "📝",
    defaults: {
      content: "<p>Write your content here...</p>",
      align: "left",
    },
  },
  {
    type: "image",
    label: "Image",
    icon: "🖼",
    defaults: {
      src: "",
      alt: "",
      caption: "",
      width: "full",
    },
  },
  {
    type: "cta",
    label: "Call to Action",
    icon: "🔘",
    defaults: {
      heading: "Ready to get started?",
      body: "Join thousands of satisfied customers.",
      buttonText: "Get Started",
      buttonUrl: "#",
      bgColor: "#f4f4f5",
    },
  },
  {
    type: "features",
    label: "Features",
    icon: "📊",
    defaults: {
      heading: "Our Features",
      items: [
        { icon: "✓", title: "Feature One", description: "Description of feature one" },
        { icon: "✓", title: "Feature Two", description: "Description of feature two" },
        { icon: "✓", title: "Feature Three", description: "Description of feature three" },
      ],
      columns: 3,
    },
  },
  {
    type: "button",
    label: "Button / Link",
    icon: "🔗",
    defaults: {
      text: "Learn more",
      url: "#",
      align: "left",
      variant: "solid",
    },
  },
  {
    type: "embed",
    label: "Embed / HTML",
    icon: "</>",
    defaults: {
      html: "",
    },
  },
  {
    type: "faq",
    label: "FAQ / Accordion",
    icon: "❓",
    defaults: {
      heading: "Frequently Asked Questions",
      items: [
        { question: "Your question here?", answer: "The answer goes here." },
      ],
    },
  },
  {
    type: "testimonial",
    label: "Testimonial",
    icon: "💬",
    defaults: {
      quote: "This changed everything for us.",
      author: "Jane Doe",
      role: "Founder, Acme Co.",
      rating: 5,
    },
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: "↕",
    defaults: { height: 48 },
  },
  {
    type: "divider",
    label: "Divider",
    icon: "—",
    defaults: {},
  },
  {
    type: "heading",
    label: "Heading (H1–H6)",
    icon: "H",
    defaults: {
      text: "Section heading",
      level: 2,
      align: "left",
    },
  },
  {
    type: "list",
    label: "List",
    icon: "≡",
    defaults: {
      ordered: false,
      items: ["First item", "Second item", "Third item"],
    },
  },
  {
    type: "slider",
    label: "Slider",
    icon: "◫",
    defaults: {
      slides: [{ src: "", alt: "", title: "", caption: "", url: "" }],
      height: "md",
      itemsPerView: 1,
      imageFit: "cover",
      captionLayout: "bottom",
    },
  },
  {
    type: "contentGrid",
    label: "Article / Feed grid",
    icon: "▦",
    defaults: {
      heading: "Latest Articles",
      source: "articles",
      categoryId: "",
      perPage: 6,
      columns: 3,
      showExcerpt: true,
      order: "desc",
    },
  },
  {
    type: "section",
    label: "Section (Full Width)",
    icon: "▣",
    defaults: {
      rows: [],
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 48,
      paddingBottom: 48,
    },
  },
];

export interface RowLayout {
  id: string;
  label: string;
  icon: string;
  spans: number[];
}

/** Prebuilt row layouts — clicking/dragging one inserts a fully formed row. */
export const ROW_LAYOUTS: RowLayout[] = [
  { id: "two-halves", label: "2 columns (6+6)", icon: "▥", spans: [6, 6] },
  { id: "main-sidebar", label: "Main + sidebar (8+4)", icon: "▤", spans: [8, 4] },
  { id: "sidebar-main", label: "Sidebar + main (4+8)", icon: "▧", spans: [4, 8] },
  { id: "three", label: "3 columns (4+4+4)", icon: "▦", spans: [4, 4, 4] },
  { id: "wide-narrow", label: "Wide + narrow (9+3)", icon: "▧", spans: [9, 3] },
];

function freshColumn(span: number): ColumnData {
  return { id: crypto.randomUUID(), span, blocks: [] };
}

/** Build a row block from a prebuilt layout preset. */
export function createRowLayout(layoutId: string): RowBlock {
  const layout = ROW_LAYOUTS.find((l) => l.id === layoutId);
  const spans = layout?.spans ?? [6, 6];
  return {
    id: crypto.randomUUID(),
    type: "row",
    props: {
      columns: spans.map(freshColumn),
      gap: 24,
      align: "stretch",
      stackOnMobile: true,
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingY: 24,
      fullWidth: false,
    },
  };
}

/** Deep-copy any non-row block props (arrays are cloned so trees never share state). */
function cloneProps(type: BlockType, defaults: Block["props"]): Block["props"] {
  const src = defaults as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(src)) {
    const value = src[key];
    out[key] = Array.isArray(value)
      ? (value as unknown[]).map((item) =>
          item && typeof item === "object" ? { ...(item as object) } : item,
        )
      : value && typeof value === "object"
        ? structuredClone(value)
        : value;
  }
  return out as Block["props"];
}

export function createBlock(type: BlockType): Block {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
  if (!def) throw new Error(`Unknown block type: ${type}`);

  if (type === "row") {
    return {
      id: crypto.randomUUID(),
      type: "row",
      props: {
        columns: [freshColumn(6), freshColumn(6)],
        gap: 24,
        align: "stretch",
        stackOnMobile: true,
        bgColor: undefined,
        bgImage: "",
        textColor: undefined,
        paddingY: 24,
        fullWidth: false,
      },
    } as Block;
  }

  if (type === "section") {
    return {
      id: crypto.randomUUID(),
      type: "section",
      props: {
        rows: [],
        bgColor: undefined,
        bgImage: "",
        textColor: undefined,
        paddingTop: 48,
        paddingBottom: 48,
      },
    } as Block;
  }

  return {
    id: crypto.randomUUID(),
    type,
    props: cloneProps(type, def.defaults),
  } as Block;
}