"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import {
  buildAdvancedHoverCss,
  buildTransformCss,
  getAdvancedHoverTransition,
  getAdvancedPaddingStyle,
  getAdvancedPositionStyle,
  getAdvancedSpacingStyle,
  getAdvancedStickyStyle,
  getAdvancedWidthStyle,
  getCacheAttribute,
  getEntranceAnimationClass,
  getGridItemStyle,
  getMaskStyle,
  getScrollingEffectStyle,
  getVisibilityClasses,
  hasAdvancedHover,
  isDateConditionVisible,
  needsClientGate,
  parseCustomAttributes,
  scopeCustomCss,
  type SpacingValue,
} from "./renderHelpers";

/* ── Display Condition Gate ─────────────────────────────────────────────── */

const AUTH_COOKIE_MARKERS = [
  "sb-access-token",
  "sb-refresh-token",
  "next-auth.session-token",
  "__session",
  "auth_token",
  "nhost_session",
];

function detectLoggedIn(): boolean {
  const cookies = document.cookie.split(";").map((c) => c.trim());
  return cookies.some((c) =>
    AUTH_COOKIE_MARKERS.some((marker) => c.startsWith(`${marker}=`) || c.startsWith(marker)),
  );
}

function evaluateDisplayCondition(
  condition: string,
  date?: string,
  urlFragment?: string,
): boolean {
  if (condition === "logged_in" || condition === "logged_out") {
    const authed = detectLoggedIn();
    return condition === "logged_in" ? authed : !authed;
  }
  if (condition === "url_contains") {
    return urlFragment ? window.location.href.includes(urlFragment) : true;
  }
  if (condition === "date_after") {
    return date ? new Date() >= new Date(`${date}T00:00:00`) : true;
  }
  if (condition === "date_before") {
    return date ? new Date() <= new Date(`${date}T23:59:59`) : true;
  }
  return true;
}

export function DisplayConditionGate({
  condition,
  date,
  urlFragment,
  children,
}: {
  condition?: string;
  date?: string;
  urlFragment?: string;
  children: ReactNode;
}) {
  const visible = useSyncExternalStore(
    () => () => {},
    () => evaluateDisplayCondition(condition ?? "always", date, urlFragment),
    () => true,
  );

  if (!visible) return null;
  return <>{children}</>;
}

/* ── Mouse Effects (subtle parallax following the cursor) ───────────────── */

export function MouseEffectLayer({
  enabled,
  children,
}: {
  enabled?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  if (!enabled) return <>{children}</>;

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = rect.width > 0 ? (e.clientX - rect.left) / rect.width - 0.5 : 0;
        const dy = rect.height > 0 ? (e.clientY - rect.top) / rect.height - 0.5 : 0;
        setOffset({ x: Math.round(dx * 12), y: Math.round(dy * 12) });
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
    >
      <div
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          transition: "transform 0.18s ease-out",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Advanced Frame ─────────────────────────────────────────────────────── */

/**
 * Applies every Advanced-tab setting to a leaf block: position, width, grid
 * spans, transform (+hover), hover background/border, mask, margin/padding,
 * custom attributes, scoped custom CSS, entrance animation, responsive hide
 * classes, display conditions, cache flag and motion effects.
 *
 * `block` may carry a `style` prop (style-guide breakpoints); the frame keeps
 * the stock markup untouched and only adds the advanced layer around it.
 */
export function BlockAdvancedFrame({
  block,
  children,
}: {
  block: { id: string; props: Record<string, unknown> };
  children: ReactNode;
}) {
  const p = block.props as Record<string, unknown>;

  /* Server-safe evaluation for date conditions (also re-evaluated client-side). */
  const dateVisible = isDateConditionVisible(
    p.displayCondition as string,
    p.displayConditionDate as string,
  );
  const gateNeeded = needsClientGate(p.displayCondition as string);

  const baseTransform = buildTransformCss(p);
  const hoverCss = hasAdvancedHover(p) ? buildAdvancedHoverCss(block.id, p) : "";
  const customCss = scopeCustomCss(p.customCss as string, block.id);

  const mergedStyle: CSSProperties = {
    ...getAdvancedPositionStyle(p.position as string),
    ...getAdvancedStickyStyle(p.sticky as string),
    ...getAdvancedSpacingStyle(p.margin as SpacingValue),
    ...getAdvancedPaddingStyle(p.padding as SpacingValue),
    ...getAdvancedWidthStyle(p.width as string),
    ...getGridItemStyle(p.gridColumnSpan, p.gridRowSpan),
    ...(baseTransform ? { transform: baseTransform } : {}),
    ...getMaskStyle(p.mask as boolean),
    ...getScrollingEffectStyle(p.scrollingEffects as boolean, p.bgImage as string),
  };
  if (p.zIndex !== undefined && p.zIndex !== null && p.zIndex !== "") {
    mergedStyle.zIndex = Number(p.zIndex);
  }
  if (hoverCss) Object.assign(mergedStyle, getAdvancedHoverTransition());

  const visibilityClass = getVisibilityClasses({
    hideOnDesktop: p.hideOnDesktop as boolean,
    hideOnTablet: p.hideOnTablet as boolean,
    hideOnMobile: p.hideOnMobile as boolean,
  });

  /* showOn* are the inverse of hideOn* on map/video blocks. */
  const showOnClasses = [
    p.showOnDesktop === false ? "pb-hide-desktop" : "",
    p.showOnTablet === false ? "pb-hide-tablet" : "",
    p.showOnMobile === false ? "pb-hide-mobile" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const animClass = getEntranceAnimationClass(p.entranceAnimation as string);

  const mergedClass = [
    (p.cssClasses as string) || "",
    visibilityClass,
    showOnClasses,
    animClass,
  ]
    .filter(Boolean)
    .join(" ");

  const mergedAttrs = {
    ...parseCustomAttributes(p.customAttributes as string),
    ...getCacheAttribute(p.cacheSetting as string),
  };

  if (dateVisible === false) return null;

  let content = (
    <div
      id={(p.cssId as string) || undefined}
      className={mergedClass || undefined}
      style={mergedStyle}
      {...mergedAttrs}
    >
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {hoverCss && <style dangerouslySetInnerHTML={{ __html: hoverCss }} />}
      <MouseEffectLayer enabled={p.mouseEffects as boolean}>{children}</MouseEffectLayer>
    </div>
  );

  if (gateNeeded) {
    content = (
      <DisplayConditionGate
        condition={p.displayCondition as string}
        date={p.displayConditionDate as string}
        urlFragment={p.displayConditionUrl as string}
      >
        {content}
      </DisplayConditionGate>
    );
  }

  return content;
}