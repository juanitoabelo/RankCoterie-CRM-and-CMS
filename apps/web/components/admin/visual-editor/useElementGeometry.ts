"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PB_EL_ATTR } from "./constants";

export interface PbRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Tracks the on-screen rectangles (relative to the shared canvas container) of
 * every element carrying `data-pb-el`. Re-measures when the DOM subtree changes,
 * the window resizes, or content shifts (polled lightly while active).
 */
export function useElementGeometry() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Map<string, PbRect>>(new Map());
  const [version, setVersion] = useState(0);
  const rectsRef = useRef<Map<string, PbRect>>(new Map());

  const measure = useCallback(() => {
    const root = canvasRef.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    if (base.width === 0 && base.height === 0) return;
    const next = new Map<string, PbRect>();
    root.querySelectorAll<HTMLElement>(`[${PB_EL_ATTR}]`).forEach((el) => {
      const id = el.getAttribute(PB_EL_ATTR);
      if (!id) return;
      const r = el.getBoundingClientRect();
      next.set(id, {
        left: r.left - base.left,
        top: r.top - base.top,
        width: r.width,
        height: r.height,
      });
    });

    const prev = rectsRef.current;
    if (prev.size === next.size) {
      let same = true;
      for (const [id, rect] of next) {
        const p = prev.get(id);
        if (
          !p ||
          Math.abs(p.left - rect.left) > 0.5 ||
          Math.abs(p.top - rect.top) > 0.5 ||
          Math.abs(p.width - rect.width) > 0.5 ||
          Math.abs(p.height - rect.height) > 0.5
        ) {
          same = false;
          break;
        }
      }
      if (same) return;
    }

    rectsRef.current = next;
    setRects(next);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(root);

    const mo = new MutationObserver(() => measure());
    mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });

    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    // Lightweight polling catches layout shifts from fonts/images/animation.
    const interval = window.setInterval(() => measure(), 900);

    measure();

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", onResize);
      window.clearInterval(interval);
    };
  }, [measure]);

  return { canvasRef, rects, version };
}