"use client";

import { useState, useRef } from "react";
import { isRowBlock, type Block } from "@/lib/page-builder/types";
import { validateBlock } from "@/lib/page-builder/validate";

/**
 * Inline-editable text span. Only active while the user is in "inline edit" mode on
 * the selected block; commits on blur (single history entry per edit).
 */
function InlineText({
  value,
  onChange,
  className,
  multiline,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const [editing, setEditing] = useState(false);

  return (
    <div
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: value }}
      onClick={(e) => {
        e.stopPropagation();
        if (editing) return;
        editingRef.current = true;
        setEditing(true);
        requestAnimationFrame(() => ref.current?.focus());
      }}
      onBlur={() => {
        editingRef.current = false;
        setEditing(false);
        const next = ref.current?.innerHTML ?? "";
        if (next !== value) onChange(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          ref.current?.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          if (ref.current) ref.current.innerHTML = value;
          ref.current?.blur();
        }
      }}
      className={`cursor-text rounded outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ring-offset-1 ${
        editing ? "ring-2 ring-zinc-400" : ""
      } ${className ?? ""}`}
    />
  );
}

function WarningBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      title={`${count} issue${count === 1 ? "" : "s"}`}
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white"
    >
      {count}
    </span>
  );
}

export function BlockPreview({
  block,
  inlineEditing,
  onUpdateProps,
}: {
  block: Block;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
}) {
  const errors = validateBlock(block);
  const edit = inlineEditing && !!onUpdateProps;
  const patch = (props: Block["props"]) => onUpdateProps?.(block.id, props);

  let body: React.ReactNode = null;
  switch (block.type) {
    case "hero":
      body = (
        <div
          className="mx-2 mb-2 rounded-md px-4 py-6 text-center text-xs"
          style={{ backgroundColor: block.props.bgColor, color: block.props.textColor }}
        >
          {edit ? (
            <InlineText
              value={block.props.heading}
              onChange={(v) => patch({ ...block.props, heading: v })}
              className="font-semibold"
            />
          ) : (
            <div className="font-semibold">{block.props.heading || "Hero heading"}</div>
          )}
          {edit ? (
            <InlineText
              value={block.props.subheading}
              onChange={(v) => patch({ ...block.props, subheading: v })}
              className="mt-1 opacity-70"
            />
          ) : (
            <div className="mt-1 opacity-70">{block.props.subheading || "Subheading"}</div>
          )}
        </div>
      );
      break;
    case "text":
      body = (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {edit ? (
            <InlineText
              multiline
              value={block.props.content}
              onChange={(v) => patch({ ...block.props, content: v })}
              className={`line-clamp-3 ${block.props.align === "center" ? "text-center" : block.props.align === "right" ? "text-right" : "text-left"}`}
            />
          ) : (
            <div
              className={`line-clamp-3 rte-content ${block.props.align === "center" ? "text-center" : block.props.align === "right" ? "text-right" : "text-left"}`}
              dangerouslySetInnerHTML={{ __html: block.props.content }}
            />
          )}
        </div>
      );
      break;
    case "image":
      body = <ImagePreview key={block.props.src} block={block} />;
      break;
    case "cta":
      body = (
        <div
          className="mx-2 mb-2 rounded-md px-4 py-4 text-center text-xs"
          style={{ backgroundColor: block.props.bgColor }}
        >
          {edit ? (
            <InlineText
              value={block.props.heading}
              onChange={(v) => patch({ ...block.props, heading: v })}
              className="font-medium text-zinc-900"
            />
          ) : (
            <div className="font-medium text-zinc-900">{block.props.heading || "CTA heading"}</div>
          )}
          {edit ? (
            <InlineText
              value={block.props.body}
              onChange={(v) => patch({ ...block.props, body: v })}
              className="mt-1 text-zinc-600"
            />
          ) : (
            <div
              className="mt-1 text-zinc-600 rte-content"
              dangerouslySetInnerHTML={{
                __html: block.props.body || "<p>CTA body</p>",
              }}
            />
          )}
          <div className="mt-2 inline-block rounded bg-zinc-900 px-3 py-1 text-xs text-white">
            {block.props.buttonText || "Button"}
          </div>
        </div>
      );
      break;
    case "features":
      body = (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-2 text-xs">
          {edit ? (
            <InlineText
              value={block.props.heading}
              onChange={(v) => patch({ ...block.props, heading: v })}
              className="font-medium text-zinc-700"
            />
          ) : (
            <div className="font-medium text-zinc-700">{block.props.heading || "Features"}</div>
          )}
          <div className="mt-1 text-zinc-500">
            {block.props.items.length} items · {block.props.columns} columns
          </div>
        </div>
      );
      break;
    case "button":
      body = (
        <div className="mx-2 mb-2 flex py-2 text-xs">
          <a
            href={block.props.url || "#"}
            onClick={(e) => e.preventDefault()}
            className={`rounded-md px-4 py-1.5 font-medium ${
              block.props.variant === "outline"
                ? "border border-zinc-900 text-zinc-900"
                : "bg-zinc-900 text-white"
            }`}
          >
            {block.props.text || "Button"}
          </a>
        </div>
      );
      body = edit ? (
        <div className="mx-2 mb-2 py-2 text-xs">
          <InlineText
            value={block.props.text}
            onChange={(v) => patch({ ...block.props, text: v })}
            className="inline-block rounded-md bg-zinc-900 px-4 py-1.5 font-medium text-white"
          />
        </div>
      ) : (
        body
      );
      break;
    case "embed":
      body = (
        <div className="mx-2 mb-2 rounded-md bg-zinc-900 px-3 py-2 font-mono text-[10px] text-zinc-100">
          <div dangerouslySetInnerHTML={{ __html: block.props.html.slice(0, 120) }} />
        </div>
      );
      break;
    case "faq":
      body = (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-2 text-xs">
          <div className="font-medium text-zinc-700">{block.props.heading || "FAQ"}</div>
          <div className="mt-1 text-zinc-500">{block.props.items.length} questions</div>
        </div>
      );
      break;
    case "testimonial":
      body = (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-3 text-xs">
          <div className="text-amber-400">{"★".repeat(Math.max(0, Math.min(5, block.props.rating)))}</div>
          {edit ? (
            <InlineText
              multiline
              value={block.props.quote}
              onChange={(v) => patch({ ...block.props, quote: v })}
              className="mt-1 italic text-zinc-700"
            />
          ) : (
            <div
              className="mt-1 italic text-zinc-700 rte-content"
              dangerouslySetInnerHTML={{
                __html: block.props.quote || "<p>Testimonial quote</p>",
              }}
            />
          )}
          <div className="mt-1 text-zinc-500">
            — {block.props.author || "Author"}
            {block.props.role ? `, ${block.props.role}` : ""}
          </div>
        </div>
      );
      break;
    case "spacer":
      body = (
        <div className="mx-2 mb-2 flex items-center justify-center text-xs text-zinc-300">
          ↕ {block.props.height}px
        </div>
      );
      break;
    case "divider":
      body = (
        <div className="mx-2 mb-2">
          <hr className="border-zinc-200" />
        </div>
      );
      break;
    case "heading":
      body = (
        <div className="mx-2 mb-2 px-3 py-2 text-xs">
          <div
            className={`text-zinc-900 ${
              block.props.align === "center" ? "text-center" : block.props.align === "right" ? "text-right" : "text-left"
            }`}
          >
            H{block.props.level} ·
            {edit ? (
              <InlineText
                value={block.props.text}
                onChange={(v) => patch({ ...block.props, text: v })}
                className="font-semibold"
              />
            ) : (
              <span className="font-semibold">{block.props.text || "Heading text"}</span>
            )}
          </div>
        </div>
      );
      break;
    case "list":
      body = (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {block.props.ordered ? (
            <ol className="list-decimal space-y-0.5 pl-4">
              {block.props.items.slice(0, 5).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul className="list-disc space-y-0.5 pl-4">
              {block.props.items.slice(0, 5).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {block.props.items.length > 5 && (
            <p className="mt-1 text-[10px] text-zinc-400">
              +{block.props.items.length - 5} more items
            </p>
          )}
        </div>
      );
      break;
    case "slider":
      body = (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-2 text-xs">
          {block.props.slides[0]?.src ? (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.props.slides[0].src}
                alt={block.props.slides[0].alt}
                className="h-14 w-20 rounded object-cover"
              />
              <div className="text-zinc-600">
                Slider · {block.props.slides.length} slide
                {block.props.slides.length === 1 ? "" : "s"} ·{" "}
                {(block.props.itemsPerView ?? 1)} per view ·{" "}
                {(block.props.imageFit ?? "cover")} ·{" "}
                {(block.props.captionLayout ?? "bottom")} ·{" "}
                {block.props.slides[0].title || "Untitled"}
              </div>
            </div>
          ) : (
            <div className="text-zinc-500">
              ◫ Slider · {block.props.slides.length} slide
              {block.props.slides.length === 1 ? "" : "s"} — pick images in Settings
            </div>
          )}
        </div>
      );
      break;
    case "contentGrid":
      body = (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <div className="font-medium text-zinc-700">
            ▦ {block.props.heading || "Article / Feed grid"}
          </div>
          <p className="mt-1 text-zinc-500">
            {block.props.source === "articles" ? "Articles" : "Feeds"} ·{" "}
            {block.props.categoryId ? "Filtered by category" : "All categories"} ·{" "}
            {block.props.perPage} per page · {block.props.columns} columns
          </p>
          <p className="mt-1 text-[10px] text-zinc-400">
            Cards load live on the published page with pagination.
          </p>
        </div>
      );
      break;
    case "row":
      body = <div className="px-2 pb-2 text-xs text-zinc-400">Row layout</div>;
      break;
    case "section":
      body = (
        <div className="px-2 pb-2 text-xs text-zinc-400">
          Section · {block.props.rows?.length ?? 0} row{(block.props.rows?.length ?? 0) !== 1 ? "s" : ""}
        </div>
      );
      break;
    default:
      body = null;
  }

  return (
    <div className="relative">
      {body}
      <WarningBadge count={errors.length} />
      {errors.length > 0 && (
        <div className="mx-2 mb-2 space-y-0.5">
          {errors.map((err, i) => (
            <p key={i} className="text-[10px] text-amber-600">
              ⚠ {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ImagePreview({ block }: { block: Block & { type: "image" } }) {
  const [broken, setBroken] = useState(false);
  const isFull = block.props.width !== "wide" && block.props.width !== "narrow";
  const frameCls = isFull
    ? "mb-2 flex min-h-[96px] items-center justify-center overflow-hidden rounded-md bg-zinc-100"
    : "mx-2 mb-2 flex min-h-[96px] items-center justify-center overflow-hidden rounded-md bg-zinc-100 px-3 py-4";

  if (!block.props.src) {
    return (
      <div className="mx-2 mb-2 rounded-md bg-zinc-100 px-3 py-4 text-center text-xs text-zinc-400">
        🖼 Image placeholder
      </div>
    );
  }

  if (broken) {
    return (
      <div className="mx-2 mb-2 rounded-md bg-zinc-100 px-3 py-4 text-center text-xs text-amber-600">
        ⚠ Image failed to load
      </div>
    );
  }

  return (
    <div className={frameCls}>
      <img
        src={block.props.src}
        alt={block.props.alt}
        onError={() => setBroken(true)}
        className={isFull ? "max-h-40 w-full rounded object-cover" : "max-h-32 max-w-full rounded object-contain"}
      />
    </div>
  );
}

export { isRowBlock };