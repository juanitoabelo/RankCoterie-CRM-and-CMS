"use client";

import { useEffect, useRef, useState } from "react";
import type { SliderSlide } from "@/lib/page-builder/types";

const HEIGHT_CLASSES = {
  sm: "h-40 sm:h-56",
  md: "h-56 sm:h-80",
  lg: "h-72 sm:h-96",
} as const;

function widthPercent(itemsPerView: number): string {
  const clamped = Math.max(1, Math.min(8, itemsPerView));
  const raw = Math.floor(100 / clamped);
  return `${raw}%`;
}

/**
 * CSS scroll-snap carousel with prev/next arrows, optional dots and autoplay.
 * Works without JS (swipe/drag through the snap points); the arrows just scroll
 * the track programmatically. Slides per view and image fit/layout are
 * configurable from the editor. Slides without an image render as text cards so
 * content pulled from listings/sections/categories still displays.
 */
export default function SliderCarousel({
  slides,
  height,
  itemsPerView,
  imageFit,
  captionLayout,
  showArrows = true,
  showDots = true,
  showScrollbar = true,
  autoplay = false,
  showImage = true,
  showTitle = false,
  showCaption = true,
  showButton = false,
}: {
  slides: SliderSlide[];
  height: keyof typeof HEIGHT_CLASSES;
  itemsPerView: number;
  imageFit: "cover" | "fluid";
  captionLayout: "bottom" | "center";
  showArrows?: boolean;
  showDots?: boolean;
  showScrollbar?: boolean;
  autoplay?: boolean;
  showImage?: boolean;
  showTitle?: boolean;
  showCaption?: boolean;
  showButton?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const visibleSlides = slides.filter(
    (s) => s.src.trim() || s.title.trim() || s.caption.trim(),
  );

  const scrollBySlide = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = el.firstElementChild?.clientWidth ?? el.clientWidth;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  useEffect(() => {
    if (!autoplay || visibleSlides.length <= 1) return;
    const id = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const step = el.firstElementChild?.clientWidth ?? el.clientWidth;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: step, behavior: "smooth" });
    }, 3500);
    return () => window.clearInterval(id);
  }, [autoplay, visibleSlides.length]);

  if (visibleSlides.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-400">
        No slides to show yet
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={() => {
          const el = trackRef.current;
          if (!el) return;
          const step = el.firstElementChild?.clientWidth ?? el.clientWidth;
          if (step > 0) setActive(Math.round(el.scrollLeft / step));
        }}
        className={`flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scroll-smooth ${showScrollbar ? "" : "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"}`}
        style={{ scrollbarWidth: showScrollbar ? "thin" : "none" }}
      >
        {visibleSlides.map((slide, i) => (
          <div
            key={i}
            className="w-full shrink-0 snap-start"
            style={{ width: widthPercent(itemsPerView) }}
            data-lp-el="item"
          >
            <SlideFrame
              slide={slide}
              heightClass={HEIGHT_CLASSES[height]}
              imageFit={imageFit}
              captionLayout={captionLayout}
              showImage={showImage}
              showTitle={showTitle}
              showCaption={showCaption}
              showButton={showButton}
            />
          </div>
        ))}
      </div>

      {showArrows && visibleSlides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => scrollBySlide(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => scrollBySlide(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            ›
          </button>
        </>
      )}

      {showDots && visibleSlides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {visibleSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === active}
              onClick={() => {
                const el = trackRef.current;
                if (!el) return;
                const step = el.firstElementChild?.clientWidth ?? el.clientWidth;
                el.scrollTo({ left: step * i, behavior: "smooth" });
              }}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === active ? "bg-zinc-800" : "bg-zinc-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlideFrame({
  slide,
  heightClass,
  imageFit,
  captionLayout,
  showImage,
  showTitle,
  showCaption,
  showButton,
}: {
  slide: SliderSlide;
  heightClass: string;
  imageFit: "cover" | "fluid";
  captionLayout: "bottom" | "center";
  showImage: boolean;
  showTitle: boolean;
  showCaption: boolean;
  showButton: boolean;
}) {
  const hasImage = showImage && Boolean(slide.src.trim());

  const media = hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.src}
      alt={slide.alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      data-lp-el="image"
      className={`w-full rounded-lg ${imageFit === "fluid" ? "h-auto" : `object-cover ${heightClass}`}`}
    />
  ) : (
    <div className={`flex w-full items-center justify-center rounded-lg bg-zinc-200 ${heightClass}`} aria-hidden />
  );

  const text = (
    <>
      {showTitle && slide.title && (
        <div className="text-lg font-semibold" data-lp-el="title">
          {slide.title}
        </div>
      )}
      {showCaption && slide.caption && <div className="mt-1 text-sm opacity-90">{slide.caption}</div>}
      {showButton && slide.buttonText && (
        <a
          href={slide.buttonUrl || "#"}
          data-lp-el="button"
          className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
        >
          {slide.buttonText}
        </a>
      )}
    </>
  );

  const hasText = Boolean(
    (showTitle && slide.title) || (showCaption && slide.caption) || (showButton && slide.buttonText),
  );

  if (!hasText) {
    const figure = <figure className="relative overflow-hidden rounded-lg bg-zinc-100">{media}</figure>;
    return <div>{slide.url ? <a href={slide.url} className="block">{figure}</a> : figure}</div>;
  }

  const caption = (
    <figcaption className="relative overflow-hidden rounded-lg bg-zinc-100">
      {media}
      {captionLayout === "center" ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 px-6 text-center text-white"
          data-lp-el="caption"
        >
          <div className="max-w-xl">{text}</div>
        </div>
      ) : (
        <div
          className="absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-black/75 to-transparent px-4 py-3 text-white"
          data-lp-el="caption"
        >
          {showTitle && slide.title && (
            <div className="text-sm font-semibold" data-lp-el="title">
              {slide.title}
            </div>
          )}
          {showCaption && slide.caption && <div className="mt-0.5 text-xs opacity-90">{slide.caption}</div>}
          {showButton && slide.buttonText && (
            <a
              href={slide.buttonUrl || "#"}
              data-lp-el="button"
              className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              {slide.buttonText}
            </a>
          )}
        </div>
      )}
    </figcaption>
  );

  return <div>{slide.url ? <a href={slide.url} className="block">{caption}</a> : caption}</div>;
}
