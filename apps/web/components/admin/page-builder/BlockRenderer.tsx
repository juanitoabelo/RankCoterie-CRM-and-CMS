import { type Block, type RowBlock } from "@/lib/page-builder/types";

const SPAN_CLASS: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

function HeroBlock({ block }: { block: Block & { type: "hero" } }) {
  return (
    <section
      className="px-6 py-20 text-center"
      style={{ backgroundColor: block.props.bgColor, color: block.props.textColor }}
    >
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {block.props.heading}
        </h1>
        {block.props.subheading && (
          <p className="mt-4 text-lg opacity-80">{block.props.subheading}</p>
        )}
      </div>
    </section>
  );
}

function TextBlock({ block }: { block: Block & { type: "text" } }) {
  const alignCls =
    block.props.align === "center"
      ? "text-center"
      : block.props.align === "right"
        ? "text-right"
        : "text-left";
  return (
    <section className="px-6 py-10">
      <div
        className={`mx-auto max-w-3xl leading-relaxed text-zinc-700 ${alignCls}`}
        dangerouslySetInnerHTML={{ __html: block.props.content }}
      />
    </section>
  );
}

function ImageBlock({ block }: { block: Block & { type: "image" } }) {
  const widthClass =
    block.props.width === "narrow"
      ? "max-w-xl"
      : block.props.width === "wide"
        ? "max-w-5xl"
        : "max-w-6xl";

  return (
    <section className="px-6 py-6">
      <figure className={`mx-auto ${widthClass}`}>
        {block.props.src && (
          <img
            src={block.props.src}
            alt={block.props.alt}
            className="w-full rounded-lg object-cover"
          />
        )}
        {block.props.caption && (
          <figcaption className="mt-2 text-center text-sm text-zinc-500">
            {block.props.caption}
          </figcaption>
        )}
      </figure>
    </section>
  );
}

function CtaBlock({ block }: { block: Block & { type: "cta" } }) {
  return (
    <section
      className="px-6 py-16 text-center"
      style={{ backgroundColor: block.props.bgColor }}
    >
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-bold text-zinc-900">{block.props.heading}</h2>
        {block.props.body && (
          <p className="mt-3 text-zinc-600">{block.props.body}</p>
        )}
        {block.props.buttonText && (
          <a
            href={block.props.buttonUrl}
            className="mt-6 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {block.props.buttonText}
          </a>
        )}
      </div>
    </section>
  );
}

function FeaturesBlock({ block }: { block: Block & { type: "features" } }) {
  const cols =
    block.props.columns === 2
      ? "sm:grid-cols-2"
      : block.props.columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {block.props.heading && (
          <h2 className="text-center text-2xl font-bold text-zinc-900">
            {block.props.heading}
          </h2>
        )}
        <div className={`mt-10 grid gap-8 ${cols}`}>
          {block.props.items.map((item, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl text-zinc-700">
                {item.icon}
              </div>
              <h3 className="mt-4 font-semibold text-zinc-900">{item.title}</h3>
              {item.description && (
                <p className="mt-2 text-sm text-zinc-600">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpacerBlock({ block }: { block: Block & { type: "spacer" } }) {
  return <div style={{ height: block.props.height }} />;
}

function DividerBlock() {
  return (
    <div className="px-6 py-4">
      <hr className="mx-auto max-w-3xl border-zinc-200" />
    </div>
  );
}

function RowBlock({ block }: { block: RowBlock }) {
  return (
    <section className="px-6 py-6">
      <div
        className="grid grid-cols-12"
        style={{ gap: block.props.gap, alignItems: block.props.align }}
      >
        {block.props.columns.map((column) => (
          <div
            key={column.id}
            className={`col-span-12 ${SPAN_CLASS[column.span] ?? "md:col-span-6"}`}
            style={{ minWidth: 0 }}
          >
            <RenderBlocks blocks={column.blocks} />
          </div>
        ))}
      </div>
    </section>
  );
}

const RENDERERS: Record<string, React.ComponentType<{ block: Block }>> = {
  hero: HeroBlock as React.ComponentType<{ block: Block }>,
  text: TextBlock as React.ComponentType<{ block: Block }>,
  image: ImageBlock as React.ComponentType<{ block: Block }>,
  cta: CtaBlock as React.ComponentType<{ block: Block }>,
  features: FeaturesBlock as React.ComponentType<{ block: Block }>,
  spacer: SpacerBlock as React.ComponentType<{ block: Block }>,
  divider: DividerBlock as React.ComponentType<{ block: Block }>,
  row: RowBlock as React.ComponentType<{ block: Block }>,
};

function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block) => {
        const Renderer = RENDERERS[block.type];
        if (!Renderer) return null;
        return <Renderer key={block.id} block={block} />;
      })}
    </>
  );
}

export default function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div>
      <RenderBlocks blocks={blocks} />
    </div>
  );
}