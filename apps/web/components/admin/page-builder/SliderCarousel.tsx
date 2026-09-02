"use client";

import { useRef } from "react";
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
 * CSS scroll-snap carousel with prev/next arrows. Works without JS (swipe/drag
 * through the snap points); the arrows just scroll the track programmatically.
 * Slides per view and image fit/layout are configurable from the editor.
 */
export default function SliderCarousel({
  slides,
  height,
  itemsPerView,
  imageFit,
  captionLayout,
}: {
  slides: SliderSlide[];
  height: keyof typeof HEIGHT_CLASSES;
  itemsPerView: number;
  imageFit: "cover" | "fluid";
  captionLayout: "bottom" | "center";
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBySlide = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = el.firstElementChild?.clientWidth ?? el.clientWidth;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const slidesWithImages = slides.filter((s) => s.src.trim());
  if (slidesWithImages.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-400">
        Slider images go here
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        {slidesWithImages.map((slide, i) => (
          <div
            key={i}
            className="w-full shrink-0 snap-start"
            style={{ width: widthPercent(itemsPerView) }}
          >
            <SlideFrame
              slide={slide}
              heightClass={HEIGHT_CLASSES[height]}
              imageFit={imageFit}
              captionLayout={captionLayout}
            />
          </div>
        ))}
      </div>
      {slidesWithImages.length > 1 && (
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
    </div>
  );
}

function SlideFrame({
  slide,
  heightClass,
  imageFit,
  captionLayout,
}: {
  slide: SliderSlide;
  heightClass: string;
  imageFit: "cover" | "fluid";
  captionLayout: "bottom" | "center";
}) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.src}
      alt={slide.alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`w-full rounded-lg ${imageFit === "fluid" ? "h-auto" : `object-cover ${heightClass}`}`}
    />
  );

  const hasText = Boolean(slide.title || slide.caption);
  const caption =
    hasText ? (
      <figcaption className="relative overflow-hidden rounded-lg bg-zinc-100">
        {image}
        {captionLayout === "center" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 px-6 text-center text-white">
            {slide.title && <div className="text-lg font-semibold">{slide.title}</div>}
            {slide.caption && <div className="mt-1 text-sm opacity-90">{slide.caption}</div>}
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-black/75 to-transparent px-4 py-3 text-white">
            {slide.title && <div className="text-sm font-semibold">{slide.title}</div>}
            {slide.caption && <div className="mt-0.5 text-xs opacity-90">{slide.caption}</div>}
          </div>
        )}
      </figcaption>
    ) : (
      <figure className="relative overflow-hidden rounded-lg bg-zinc-100">{image}</figure>
    );

  return <div>{slide.url ? <a href={slide.url} className="block">{caption}</a> : caption}</div>;
}