export interface BlockBase {
  id: string;
  type: string;
}

export interface HeroBlock extends BlockBase {
  type: "hero";
  props: {
    heading: string;
    subheading: string;
    bgColor: string;
    textColor: string;
  };
}

export interface TextBlock extends BlockBase {
  type: "text";
  props: {
    content: string;
    align: "left" | "center" | "right";
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
  };
}

export interface FeaturesBlock extends BlockBase {
  type: "features";
  props: {
    heading: string;
    items: Array<{ icon: string; title: string; description: string }>;
    columns: 2 | 3 | 4;
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

export const COLUMN_SPANS = [3, 4, 6, 8, 12] as const;
export type ColumnSpan = (typeof COLUMN_SPANS)[number];

export interface ColumnData {
  id: string;
  span: number; // grid units out of a 12-column grid
  blocks: Block[];
}

export interface RowBlock extends BlockBase {
  type: "row";
  props: {
    columns: ColumnData[];
    gap: number; // px between columns
    align: "start" | "center" | "end" | "stretch";
  };
}

export type Block =
  | HeroBlock
  | TextBlock
  | ImageBlock
  | CtaBlock
  | FeaturesBlock
  | SpacerBlock
  | DividerBlock
  | RowBlock;

export type BlockType = Block["type"];

export function isRowBlock(block: Block): block is RowBlock {
  return block.type === "row";
}

/** Block types allowed inside a row column (i.e. everything except rows). */
export const LEAF_BLOCK_TYPES: BlockType[] = [
  "hero",
  "text",
  "image",
  "cta",
  "features",
  "spacer",
  "divider",
];

/** Id prefix used by draggable palette items so drag events can be distinguished from real blocks. */
export const PALETTE_PREFIX = "palette:";

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
    defaults: { columns: [], gap: 24, align: "stretch" },
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
];

export function createBlock(type: BlockType): Block {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
  if (!def) throw new Error(`Unknown block type: ${type}`);

  if (type === "row") {
    return {
      id: crypto.randomUUID(),
      type: "row",
      props: {
        columns: [
          { id: crypto.randomUUID(), span: 6, blocks: [] },
          { id: crypto.randomUUID(), span: 6, blocks: [] },
        ],
        gap: 24,
        align: "stretch",
      },
    } as Block;
  }

  const defaults = def.defaults as Record<string, unknown>;
  const props =
    type === "features"
      ? {
          ...defaults,
          items: (defaults.items as Array<Record<string, unknown>>).map((i) => ({ ...i })),
        }
      : { ...defaults };

  return {
    id: crypto.randomUUID(),
    type,
    props,
  } as Block;
}