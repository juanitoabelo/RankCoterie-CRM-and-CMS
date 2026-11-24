"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface ProductGalleryImage {
  id: string;
  assetId: string;
  alt: string | null;
}

export default function ProductGallery({
  images,
  productName,
  activeAssetId,
}: {
  images: ProductGalleryImage[];
  productName: string;
  activeAssetId?: string | null;
}) {
  const [selection, setSelection] = useState(() => ({
    assetId: activeAssetId ?? null,
    index: 0,
  }));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbnailTrack = useRef<HTMLDivElement>(null);
  const mainImageButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const selectedAssetId = activeAssetId ?? null;

  if (selection.assetId !== selectedAssetId) {
    const nextIndex = selectedAssetId ? images.findIndex((image) => image.assetId === selectedAssetId) : 0;
    setSelection({ assetId: selectedAssetId, index: nextIndex >= 0 ? nextIndex : 0 });
  }

  const activeIndex = Math.min(selection.index, Math.max(0, images.length - 1));
  const activeImage = images[activeIndex];

  function selectIndex(next: number | ((current: number) => number)) {
    setSelection((current) => ({
      ...current,
      index: typeof next === "function" ? next(current.index) : next,
    }));
  }

  useEffect(() => {
    if (!lightboxOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") {
        setSelection((current) => ({
          ...current,
          index: (current.index - 1 + images.length) % images.length,
        }));
      }
      if (event.key === "ArrowRight") {
        setSelection((current) => ({
          ...current,
          index: (current.index + 1) % images.length,
        }));
      }
    }

    closeButton.current?.focus();
    const returnFocus = mainImageButton.current;
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [images.length, lightboxOpen]);

  function scrollThumbnails(direction: -1 | 1) {
    thumbnailTrack.current?.scrollBy({
      left: direction * (thumbnailTrack.current.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  if (!activeImage) {
    return (
      <div className="pdp-gallery-empty">No image</div>
    );
  }

  return (
    <div>
      <button
        ref={mainImageButton}
        type="button"
        className="pdp-gallery-main group"
        onClick={() => setLightboxOpen(true)}
        aria-label={`View larger image: ${activeImage.alt || productName}`}
      >
        <Image
          src={`/api/assets/${activeImage.assetId}/`}
          alt={activeImage.alt || productName}
          fill
          preload
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="pdp-gallery-image object-contain p-3 transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
        />
        <span className="pdp-gallery-counter">
          {activeIndex + 1} / {images.length}
        </span>
      </button>

      {images.length > 1 && (
        <div className="relative mt-3">
          {images.length > 5 && (
            <button
              type="button"
              onClick={() => scrollThumbnails(-1)}
              aria-label="Scroll thumbnails left"
              className="absolute left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-sm hover:bg-white"
            >
              <span aria-hidden="true">‹</span>
            </button>
          )}
          <div
            ref={thumbnailTrack}
            className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-0.5 pb-1"
            role="group"
            aria-label="Product images"
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => selectIndex(index)}
                aria-label={`Show image ${index + 1}: ${image.alt || productName}`}
                aria-pressed={index === activeIndex}
                className={`pdp-gallery-thumb ${index === activeIndex ? "pdp-gallery-thumb-active" : ""}`}
              >
                <Image
                  src={`/api/assets/${image.assetId}/`}
                  alt={image.alt || productName}
                  fill
                  sizes="100px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
          {images.length > 5 && (
            <button
              type="button"
              onClick={() => scrollThumbnails(1)}
              aria-label="Scroll thumbnails right"
              className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-sm hover:bg-white"
            >
              <span aria-hidden="true">›</span>
            </button>
          )}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Product image: ${activeImage.alt || productName}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLightboxOpen(false);
          }}
        >
          <button
            ref={closeButton}
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ×
          </button>
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => selectIndex((index) => (index - 1 + images.length) % images.length)}
              aria-label="Previous product image"
              className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 sm:left-6"
            >
              ‹
            </button>
          )}
          <div className="relative h-full max-h-[85vh] w-full max-w-6xl">
            <Image
              src={`/api/assets/${activeImage.assetId}/`}
              alt={activeImage.alt || productName}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => selectIndex((index) => (index + 1) % images.length)}
              aria-label="Next product image"
              className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 sm:right-6"
            >
              ›
            </button>
          )}
          {images.length > 1 && (
            <p className="absolute bottom-4 text-sm text-white/80">
              {activeIndex + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
