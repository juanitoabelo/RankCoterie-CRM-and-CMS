import { type Block, type RowBlock, type StyleBreakpoints } from "@/lib/page-builder/types";
import {
  renderColumnSpanClass,
  resolveColumnWidths,
} from "@/lib/page-builder/spans";
import { renderStyleGuide, styleScopeClass } from "@/lib/page-builder/style";
import { renderLocalizedContent, type RegionContext } from "@/lib/localization/render";
import SliderCarousel from "./SliderCarousel";
import ContentGridFrontend from "./ContentGridFrontend";

/** Wrap a block's markup so per-breakpoint style-guide CSS applies to it. */
function styleScope(block: Block, inner: React.ReactNode): React.ReactNode {
  const css = renderStyleGuide(block.id, (block.props as { style?: StyleBreakpoints }).style);
  if (!css) return inner;
  return (
    <>
      <style>{css}</style>
      <div className={styleScopeClass(block.id)}>{inner}</div>
    </>
  );
}

function HeroBlock({ block, ctx }: { block: Block & { type: "hero" }; ctx: RegionContext }) {
  return styleScope(
    block,
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
    </section>,
  );
}

function TextBlock({ block, ctx }: { block: Block & { type: "text" }; ctx: RegionContext }) {
  const alignCls =
    block.props.align === "center"
      ? "text-center"
      : block.props.align === "right"
        ? "text-right"
        : "text-left";
  return styleScope(
    block,
    <section className="px-6 py-10">
      <div
        className={`mx-auto max-w-3xl leading-relaxed text-zinc-700 rte-content ${alignCls}`}
        dangerouslySetInnerHTML={{ __html: renderLocalizedContent(block.props.content, ctx) }}
      />
    </section>,
  );
}

function ImageBlock({ block }: { block: Block & { type: "image" } }) {
  const isFull = block.props.width !== "wide" && block.props.width !== "narrow";
  const widthClass = isFull
    ? "w-full"
    : block.props.width === "narrow"
      ? "max-w-xl"
      : "max-w-5xl";

  return (
    <section className={isFull ? "py-6" : "px-6 py-6"}>
      <figure className={`mx-auto ${widthClass}`}>
        {block.props.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.props.src}
            alt={block.props.alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-auto w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-400">
            Image placeholder
          </div>
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
  return styleScope(
    block,
    <section
      className="px-6 py-16 text-center"
      style={{ backgroundColor: block.props.bgColor }}
    >
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-bold text-zinc-900">
          {renderLocalizedContent(block.props.heading, ctx)}
        </h2>
        {block.props.body && (
          <div
            className="mt-3 text-zinc-600 rte-content"
            dangerouslySetInnerHTML={{ __html: renderLocalizedContent(block.props.body, ctx) }}
          />
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
    </section>,
  );
}

function FeaturesBlock({ block, ctx }: { block: Block & { type: "features" }; ctx: RegionContext }) {
  const cols =
    block.props.columns === 2
      ? "sm:grid-cols-2"
      : block.props.columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return styleScope(
    block,
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
                <p
                  className="mt-2 text-sm text-zinc-600 rte-content"
                  dangerouslySetInnerHTML={{
                    __html: renderLocalizedContent(item.description, ctx),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>,
  );
}

function ButtonBlock({ block, ctx }: { block: Block & { type: "button" }; ctx: RegionContext }) {
  const alignCls =
    block.props.align === "center"
      ? "flex justify-center"
      : block.props.align === "right"
        ? "flex justify-end"
        : "flex justify-start";
  return styleScope(
    block,
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
    </section>,
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
  return styleScope(
    block,
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
              <div className="border-t border-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600 rte-content">
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderLocalizedContent(item.answer, ctx),
                  }}
                />
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>,
  );
}

function TestimonialBlock({ block, ctx }: { block: Block & { type: "testimonial" }; ctx: RegionContext }) {
  return styleScope(
    block,
    <section className="px-6 py-12">
      <figure className="mx-auto max-w-3xl rounded-2xl bg-zinc-50 px-8 py-10 text-center">
        <div className="text-amber-400">
          {"★".repeat(Math.max(0, Math.min(5, block.props.rating)))}</div>
        <blockquote className="mt-4 text-xl font-medium leading-relaxed text-zinc-800">
          <div
            className="rte-content"
            dangerouslySetInnerHTML={{
              __html: renderLocalizedContent(block.props.quote, ctx),
            }}
          />
        </blockquote>
        <figcaption className="mt-4 text-sm text-zinc-500">
          — {block.props.author}
          {block.props.role ? `, ${block.props.role}` : ""}
        </figcaption>
      </figure>
    </section>,
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

const HEADING_SIZES = {
  1: "text-4xl font-bold tracking-tight sm:text-5xl",
  2: "text-3xl font-bold tracking-tight sm:text-4xl",
  3: "text-2xl font-bold text-zinc-900 sm:text-3xl",
  4: "text-xl font-semibold text-zinc-900 sm:text-2xl",
  5: "text-lg font-semibold text-zinc-900",
  6: "text-base font-semibold text-zinc-900",
} as const;

function HeadingBlock({ block, ctx }: { block: Block & { type: "heading" }; ctx: RegionContext }) {
  const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"] as const)[block.props.level - 1] as keyof JSX.IntrinsicElements;
  const alignCls =
    block.props.align === "center"
      ? "text-center"
      : block.props.align === "right"
        ? "text-right"
        : "text-left";
  return styleScope(
    block,
    <section className="px-6 py-6">
      <Tag className={`${HEADING_SIZES[block.props.level]} ${alignCls}`}>
        {renderLocalizedContent(block.props.text, ctx)}
      </Tag>
    </section>,
  );
}

function ListBlock({ block, ctx }: { block: Block & { type: "list" }; ctx: RegionContext }) {
  const items = block.props.items
    .map((item) => renderLocalizedContent(item, ctx))
    .filter((item) => item.trim());
  if (items.length === 0) return null;

  return styleScope(
    block,
    <section className="px-6 py-6">
      <div className="mx-auto max-w-3xl text-zinc-700">
        {block.props.ordered ? (
          <ol className="list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-zinc-900">
            {items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ol>
        ) : (
          <ul className="list-disc space-y-1.5 pl-5 marker:text-zinc-400">
            {items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>,
  );
}

function SliderBlock({ block }: { block: Block & { type: "slider" } }) {
  return styleScope(
    block,
    <section className="px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <SliderCarousel
          slides={block.props.slides}
          height={block.props.height ?? "md"}
          itemsPerView={block.props.itemsPerView ?? 1}
          imageFit={block.props.imageFit ?? "cover"}
          captionLayout={block.props.captionLayout ?? "bottom"}
        />
      </div>
    </section>,
  );
}

function ContentGridBlock({ block }: { block: Block & { type: "contentGrid" } }) {
  return styleScope(
    block,
    <ContentGridFrontend
      heading={block.props.heading}
      source={block.props.source}
      categoryId={block.props.categoryId}
      perPage={block.props.perPage}
      columns={block.props.columns}
      showExcerpt={block.props.showExcerpt}
      order={block.props.order}
    />,
  );
}

function RowBlock({ block, ctx }: { block: RowBlock; ctx: RegionContext }) {
  const bg = block.props.bgImage
    ? {
        backgroundColor: block.props.bgColor,
        backgroundImage: `url(${block.props.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : { backgroundColor: block.props.bgColor };
  return (
    <section
      className={block.props.fullWidth ? "py-0" : "px-6 py-6"}
      style={{
        ...bg,
        color: block.props.textColor,
        paddingTop: block.props.fullWidth ? undefined : block.props.paddingY,
        paddingBottom: block.props.fullWidth ? undefined : block.props.paddingY,
      }}
    >
      <div
        className="grid grid-cols-12"
        style={{ gap: block.props.gap, alignItems: block.props.align }}
      >
        {block.props.columns.map((column) => {
          const colBg = column.bgImage
            ? {
                backgroundColor: column.bgColor,
                backgroundImage: `url(${column.bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : { backgroundColor: column.bgColor };
          return (
            <div
              key={column.id}
              className={renderColumnSpanClass(
                resolveColumnWidths(column, block.props.stackOnMobile !== false),
              )}
              style={{ minWidth: 0, ...colBg }}
            >
              <RenderBlocks blocks={column.blocks} ctx={ctx} />
            </div>
          );
        })}
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
  heading: HeadingBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  list: ListBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  slider: SliderBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
  contentGrid: ContentGridBlock as React.ComponentType<{ block: Block; ctx: RegionContext }>,
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