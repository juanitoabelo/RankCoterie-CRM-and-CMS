"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Block, ContentSliderBlock, SliderSlide } from "@/lib/page-builder/types";
import { renderLocalizedContent, type RegionContext } from "@/lib/localization/render";
import SliderCarousel from "./SliderCarousel";

type Item = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  url: string | null;
  badge: string | null;
};

/** Editor visual previews set this so empty live sliders still show a sample. */
const SliderPreviewContext = createContext(false);

export function SliderPreviewProvider({
  value = true,
  children,
}: {
  value?: boolean;
  children: React.ReactNode;
}) {
  return <SliderPreviewContext.Provider value={value}>{children}</SliderPreviewContext.Provider>;
}

/** Template renderers (geo/listing) supply the active region so {{region}} renders. */
const SliderRegionContext = createContext<RegionContext>({});

export function SliderRegionProvider({
  value,
  children,
}: {
  value: RegionContext;
  children: React.ReactNode;
}) {
  return <SliderRegionContext.Provider value={value}>{children}</SliderRegionContext.Provider>;
}

function readIds(props: ContentSliderBlock["props"], key: "categoryIds" | "sectionIds" | "topicIds"): string[] {
  const list = props[key];
  if (Array.isArray(list) && list.length) return list.filter(Boolean);
  const legacy = props[
    key === "categoryIds" ? "categoryId" : key === "sectionIds" ? "sectionId" : "topicId"
  ];
  return legacy ? [legacy] : [];
}

function localize(value: string | null | undefined, ctx: RegionContext): string {
  return renderLocalizedContent(value ?? "", ctx);
}

function toSlide(item: Item, ctx: RegionContext, buttonText: string, buttonUrl: string): SliderSlide {
  return {
    src: item.image ?? "",
    alt: localize(item.title, ctx),
    title: localize(item.title, ctx),
    caption: localize(item.subtitle, ctx),
    url: item.url ?? "",
    buttonText,
    buttonUrl: item.url || buttonUrl,
  };
}

function demoImage(label: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/><text x="50%" y="50%" fill="white" font-family="system-ui,sans-serif" font-size="34" font-weight="700" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Sample slides shown while editing so the slider always has a visible preview. */
function demoSlides(noun: string, buttonText = ""): SliderSlide[] {
  const palettes: Array<[string, string]> = [
    ["#6366f1", "#8b5cf6"],
    ["#0ea5e9", "#22d3ee"],
    ["#f59e0b", "#ef4444"],
    ["#10b981", "#22c55e"],
  ];
  return palettes.map(([from, to], i) => ({
    src: demoImage(`${noun} ${i + 1}`, from, to),
    alt: `${noun} preview ${i + 1}`,
    title: `Sample ${noun} ${i + 1}`,
    caption: `Preview of how each ${noun} slide will appear.`,
    url: "",
    buttonText,
    buttonUrl: "",
  }));
}

function useSliderItems(props: ContentSliderBlock["props"]) {
  const live = props.contentSource !== "static";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

  const categoryIds = readIds(props, "categoryIds");
  const sectionIds = readIds(props, "sectionIds");
  const topicIds = readIds(props, "topicIds");

  const key = [
    props.contentSource,
    categoryIds.join(","),
    sectionIds.join(","),
    topicIds.join(","),
    props.limit,
    props.orderBy,
    props.sortOrder,
  ].join("|");

  useEffect(() => {
    if (!live) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      source: props.contentSource,
      categoryIds: categoryIds.join(","),
      sectionIds: sectionIds.join(","),
      topicIds: topicIds.join(","),
      limit: String(props.limit ?? 9),
      orderBy: props.orderBy ?? "date",
      sortOrder: props.sortOrder ?? "desc",
    });
    fetch(`/api/content-slider?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load slider content."))))
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load slider content.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { items, loading, error, live };
}

/** Live/static content slider body: fetches source content and renders the carousel. */
export default function ContentSliderFrontend({
  props,
  ctx,
}: {
  props: ContentSliderBlock["props"];
  ctx?: RegionContext;
}) {
  const preview = useContext(SliderPreviewContext);
  const providedRegion = useContext(SliderRegionContext);
  const region: RegionContext = { ...providedRegion, ...ctx };
  const { items, loading, error, live } = useSliderItems(props);
  const buttonText = props.buttonText ?? "Learn more";
  const buttonUrl = props.buttonUrl ?? "";

  if (live && loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-zinc-100" />;
  }
  if (live && error) {
    return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>;
  }

  const localized = items.map((item) => toSlide(item, region, buttonText, buttonUrl));
  const slides =
    live && localized.length > 0
      ? localized
      : live && preview
        ? demoSlides(props.contentSource as string, buttonText)
        : live
          ? []
          : props.slides.map((s) => ({
              ...s,
              title: localize(s.title, region),
              caption: localize(s.caption, region),
              buttonText: localize(s.buttonText, region) || buttonText,
              buttonUrl: s.buttonUrl || s.url || buttonUrl,
            }));

  return (
    <SliderCarousel
      slides={slides}
      height={props.height ?? "md"}
      itemsPerView={props.itemsPerView ?? 3}
      imageFit={props.imageFit ?? "cover"}
      captionLayout={props.captionLayout ?? "bottom"}
      showArrows={props.showArrows ?? true}
      showDots={props.showDots ?? true}
      showScrollbar={props.showScrollbar ?? true}
      autoplay={props.autoplay ?? false}
      showImage={props.showImage ?? true}
      showTitle={props.showTitle ?? false}
      showCaption={props.showCaption ?? true}
      showButton={props.showButton ?? false}
    />
  );
}

/** Template-renderer adapter: takes a block and renders its slider content. */
export function ContentSliderBlockBody({
  block,
  ctx = {},
}: {
  block: Block;
  ctx?: RegionContext;
}) {
  return <ContentSliderFrontend props={(block as ContentSliderBlock).props} ctx={ctx} />;
}
