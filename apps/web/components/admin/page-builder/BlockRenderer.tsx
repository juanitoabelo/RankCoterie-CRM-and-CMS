import { type Block, type RowBlock } from "@/lib/page-builder/types";
import { renderLocalizedContent, type RegionContext } from "@/lib/localization/render";

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

const FIXED_SPAN_CLASS: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};

function HeroBlock({ block, ctx }: { block: Block & { type: "hero" }; ctx: RegionContext }) {
  return (
    <section
      className="px-6 py-20 text-center"
      style={{ backgroundColor: block.props.bgColor, color: block.props.textColor }}
    >
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {renderLocalizedContent(block.props.heading, ctx)}
        </h1>
        {block.props.subheading && (
          <p className="mt-4 text-lg opacity-80">
            {renderLocalizedContent(block.props.subheading, ctx)}
          </p>
        )}
      </div>
    </section>
  );
}

function TextBlock({ block, ctx }: { block: Block & { type: "text" }; ctx: RegionContext }) {
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
        dangerouslySetInnerHTML={{ __html: renderLocalizedContent(block.props.content, ctx) }}
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.props.src}
            alt={block.props.alt}
            loading="lazy"
            referrerPolicy="no-referrer"
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

function CtaBlock({ block, ctx }: { block: Block & { type: "cta" }; ctx: RegionContext }) {
  return (
    <section
      className="px-6 py-16 text-center"
      style={{ backgroundColor: block.props.bgColor }}
    >
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-bold text-zinc-900">
          {renderLocalizedContent(block.props.heading, ctx)}
        </h2>
        {block.props.body && (
          <p className="mt-3 text-zinc-600">{renderLocalizedContent(block.props.body, ctx)}</p>
        )}
        {block.props.buttonText && (
          <a
            href={block.props.buttonUrl}
            className="mt-6 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {renderLocalizedContent(block.props.buttonText, ctx)}
          </a>
        )}
      </div>
    </section>
  );
}

function FeaturesBlock({ block, ctx }: { block: Block & { type: "features" }; ctx: RegionContext }) {
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
            {renderLocalizedContent(block.props.heading, ctx)}
          </h2>
        )}
        <div className={`mt-10 grid gap-8 ${cols}`}>
          {block.props.items.map((item, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl text-zinc-700">
                {item.icon}
              </div>
              <h3 className="mt-4 font-semibold text-zinc-900">
                {renderLocalizedContent(item.title, ctx)}
              </h3>
              {item.description && (
                <p className="mt-2 text-sm text-zinc-600">
                  {renderLocalizedContent(item.description, ctx)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ButtonBlock({ block, ctx }: { block: Block & { type: "button" }; ctx: RegionContext }) {
  const alignCls =
    block.props.align === "center"
      ? "flex justify-center"
      : block.props.align === "right"
        ? "flex justify-end"
        : "flex justify-start";
  return (
    <section className="px-6 py-4">
      <div className={`mx-auto max-w-6xl ${alignCls}`}>
        <a
          href={block.props.url}
          className={`inline-block rounded-lg px-6 py-3 text-sm font-medium transition-colors ${
            block.props.variant === "outline"
              ? "border border-zinc-900 text-zinc-900 hover:bg-zinc-100"
              : "bg-zinc-900 text-white hover:bg-zinc-700"
          }`}
        >
          {renderLocalizedContent(block.props.text, ctx)}
        </a>
      </div>
    </section>
  );
}

function EmbedBlock({ block }: { block: Block & { type: "embed" } }) {
  return (
    <section className="px-6 py-6">
      <div
        className="mx-auto max-w-6xl"
        dangerouslySetInnerHTML={{ __html: block.props.html }}
      />
    </section>
  );
}

function FaqBlock({ block, ctx }: { block: Block & { type: "faq" }; ctx: RegionContext }) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        {block.props.heading && (
          <h2 className="text-center text-2xl font-bold text-zinc-900">
            {renderLocalizedContent(block.props.heading, ctx)}
          </h2>
        )}
        <div className="mt-8 space-y-3">
          {block.props.items.map((item, i) => (
            <details
              key={i}
              className="group rounded-lg border border-zinc-200 bg-white open:shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-zinc-900">
                {renderLocalizedContent(item.question, ctx)}
                <span className="text-zinc-400 transition-transform group-open:rotate-45">＋</span>
              </summary>
              <div className="border-t border-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600">
                {renderLocalizedContent(item.answer, ctx)}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialBlock({ block, ctx }: { block: Block & { type: "testimonial" }; ctx: RegionContext }) {
  return (
    <section className="px-6 py-12">
      <figure className="mx-auto max-w-3xl rounded-2xl bg-zinc-50 px-8 py-10 text-center">
        <div className="text-amber-400">
          {"★".repeat(Math.max(0, Math.min(5, block.props.rating)))}</div>
        <blockquote className="mt-4 text-xl font-medium leading-relaxed text-zinc-800">
          “{renderLocalizedContent(block.props.quote, ctx)}”
        </blockquote>
        <figcaption className="mt-4 text-sm text-zinc-500">
          — {block.props.author}
          {block.props.role ? `, ${block.props.role}` : ""}
        </figcaption>
      </figure>
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

function RowBlock({ block, ctx }: { block: RowBlock; ctx: RegionContext }) {
  return (
    <section className="px-6 py-6">
      <div
        className="grid grid-cols-12"
        style={{ gap: block.props.gap, alignItems: block.props.align }}
      >
        {block.props.columns.map((column) => (
          <div
            key={column.id}
            className={
              block.props.stackOnMobile === false
                ? FIXED_SPAN_CLASS[column.span] ?? "col-span-6"
                : `col-span-12 ${SPAN_CLASS[column.span] ?? "md:col-span-6"}`
            }
            style={{ minWidth: 0 }}
          >
            <RenderBlocks blocks={column.blocks} ctx={ctx} />
          </div>
        ))}
      </div>
    </section>
  );
}

const RENDERERS: Record<string, React.ComponentType<{ block: Block; ctx: RegionContext }>> = {
  hero: HeroBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  text: TextBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  image: ImageBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  cta: CtaBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  features: FeaturesBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  button: ButtonBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  embed: EmbedBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  faq: FaqBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  testimonial: TestimonialBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  spacer: SpacerBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  divider: DividerBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  row: RowBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
};

function RenderBlocks({
  blocks,
  ctx,
}: {
  blocks: Block[];
  ctx: RegionContext;
}) {
  return (
    <>
      {blocks.map((block) => {
        const Renderer = RENDERERS[block.type];
        if (!Renderer) return null;
        return <Renderer key={block.id} block={block} ctx={ctx} />;
      })}
    </>
  );
}

export default function BlockRenderer({
  blocks,
  ctx = {},
}: {
  blocks: Block[];
  ctx?: RegionContext;
}) {
  return (
    <div>
      <RenderBlocks blocks={blocks} ctx={ctx} />
    </div>
  );
}