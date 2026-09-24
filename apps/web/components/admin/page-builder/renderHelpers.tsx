import React from "react";
import type { CSSProperties, ReactNode } from "react";
import { styleScopeClass } from "@/lib/page-builder/style";

/* ── Dynamic HTML Tag ──────────────────────────────────────────────────── */

/* eslint-disable @typescript-eslint/no-explicit-any */
const TAG_MAP: Record<string, any> = {
  div: "div",
  section: "section",
  article: "article",
  aside: "aside",
  main: "main",
  header: "header",
  footer: "footer",
  nav: "nav",
};

export function resolveTag(htmlTag?: string, fallback = "div"): React.ComponentType<Record<string, unknown>> {
  if (!htmlTag || htmlTag === "default") return TAG_MAP[fallback] ?? TAG_MAP.div;
  return TAG_MAP[htmlTag] ?? TAG_MAP.div;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ── Entrance Animation CSS ─────────────────────────────────────────────── */

const ANIMATION_MAP: Record<string, string> = {
  fadeIn: "pb-fade-in",
  fadeInUp: "pb-fade-in-up",
  fadeInDown: "pb-fade-in-down",
  fadeInLeft: "pb-fade-in-left",
  fadeInRight: "pb-fade-in-right",
  zoomIn: "pb-zoom-in",
  zoomInUp: "pb-zoom-in-up",
  bounceIn: "pb-bounce-in",
  slideInUp: "pb-slide-in-up",
  slideInDown: "pb-slide-in-down",
  slideInRight: "pb-slide-in-right",
  slideInLeft: "pb-slide-in-left",
};

export function getEntranceAnimationClass(animation?: string): string {
  if (!animation) return "";
  return ANIMATION_MAP[animation] ?? "";
}

/* ── Responsive Visibility Classes ──────────────────────────────────────── */

export function getVisibilityClasses(props: {
  hideOnDesktop?: boolean;
  hideOnTablet?: boolean;
  hideOnMobile?: boolean;
}): string {
  const classes: string[] = [];
  if (props.hideOnDesktop) classes.push("pb-hide-desktop");
  if (props.hideOnTablet) classes.push("pb-hide-tablet");
  if (props.hideOnMobile) classes.push("pb-hide-mobile");
  return classes.join(" ");
}

/* ── Height Style ───────────────────────────────────────────────────────── */

export function getHeightStyle(height?: string, minHeight?: number): CSSProperties | undefined {
  if (!height || height === "default") {
    return minHeight ? { minHeight: `${minHeight}px` } : undefined;
  }
  if (height === "fitToScreen") {
    return { minHeight: "100vh" };
  }
  if (height === "minHeight" && minHeight) {
    return { minHeight: `${minHeight}px` };
  }
  return undefined;
}

/* ── Gradient Background ────────────────────────────────────────────────── */

export function getBackgroundStyle(props: {
  bgType?: string;
  bgColor?: string;
  bgImage?: string;
  bgSize?: string;
  bgPosition?: string;
  bgRepeat?: string;
  bgGradientStart?: string;
  bgGradientEnd?: string;
  bgGradientAngle?: number;
}): CSSProperties {
  if (props.bgType === "gradient" && props.bgGradientStart && props.bgGradientEnd) {
    const angle = props.bgGradientAngle ?? 180;
    return {
      background: `linear-gradient(${angle}deg, ${props.bgGradientStart}, ${props.bgGradientEnd})`,
    };
  }
  return {
    backgroundColor: props.bgColor,
    backgroundImage: props.bgImage ? `url(${props.bgImage})` : undefined,
    backgroundSize: props.bgImage ? (props.bgSize || "cover") : undefined,
    backgroundPosition: props.bgImage ? (props.bgPosition || "center center") : undefined,
    backgroundRepeat: props.bgImage ? (props.bgRepeat || "no-repeat") : undefined,
  };
}

/* ── Overlay Style ──────────────────────────────────────────────────────── */

export function renderOverlay(props: {
  overlayBgType?: string;
  overlayColor?: string;
  overlayColor2?: string;
  overlayGradientStart?: string;
  overlayGradientEnd?: string;
  overlayGradientAngle?: number;
  overlayOpacity?: number;
}): ReactNode {
  const opacity = (props.overlayOpacity ?? 50) / 100;
  const isGradient = props.overlayBgType === "gradient";
  const hasGradientColors =
    props.overlayGradientStart || props.overlayGradientEnd || props.overlayColor2;

  if (isGradient || hasGradientColors) {
    const start = props.overlayGradientStart || props.overlayColor || "#000000";
    const end = props.overlayGradientEnd || props.overlayColor2 || start;
    const angle = props.overlayGradientAngle ?? 180;
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${angle}deg, ${start}, ${end})`,
          opacity,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (!props.overlayColor && props.overlayOpacity === undefined) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: props.overlayColor || "#000000",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

/* ── Shape Divider SVG ──────────────────────────────────────────────────── */

const SHAPE_SVGS: Record<string, (color: string) => string> = {
  mountains: (c) => `<polygon points="0,0 1000,0 1000,100 500,200 0,100" fill="${c}"/>`,
  drops: (c) => `<path d="M0,0 Q250,100 500,0 Q750,100 1000,0 L1000,100 L0,100 Z" fill="${c}"/>`,
  clouds: (c) => `<path d="M0,0 Q125,80 250,30 Q375,80 500,0 Q625,80 750,30 Q875,80 1000,0 L1000,100 L0,100 Z" fill="${c}"/>`,
  tilt: (c) => `<polygon points="0,0 1000,0 1000,100 0,200" fill="${c}"/>`,
  wave: (c) => `<path d="M0,0 C250,100 750,0 1000,100 L1000,100 L0,100 Z" fill="${c}"/>`,
  triangle_opacity: (c) => `<polygon points="0,0 500,100 1000,0 1000,100 L0,100 Z" fill="${c}" opacity="0.5"/>`,
};

export function renderShapeDivider(
  position: "top" | "bottom",
  shape?: string,
  color?: string,
  width?: number,
  height?: number,
): ReactNode {
  if (!shape || !SHAPE_SVGS[shape]) return null;
  const svgContent = SHAPE_SVGS[shape](color ?? "#ffffff");
  const w = width ?? 100;
  const h = height ?? 100;
  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    width: `${w}%`,
    height: `${h}px`,
    lineHeight: 0,
    ...(position === "top"
      ? { top: 0, transform: "scaleY(-1)" }
      : { bottom: 0 }),
  };
  return (
    <div style={style} className="pointer-events-none" aria-hidden="true">
      <svg
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}

/* ── Sticky Style ───────────────────────────────────────────────────────── */

export function getStickyStyle(sticky?: string): CSSProperties {
  if (!sticky || sticky === "none") return {};
  return {
    position: "sticky" as const,
    ...(sticky === "top" ? { top: 0 } : { bottom: 0 }),
  };
}

/* ── Typography Scope ───────────────────────────────────────────────────── */

export function getTypographyScopeStyle(props: {
  headingColor?: string;
  textColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  textAlign?: string;
}): CSSProperties {
  const style: CSSProperties = {};
  if (props.headingColor) {
    (style as Record<string, string>)["--pb-heading-color"] = props.headingColor;
  }
  if (props.textColor) {
    (style as Record<string, string>)["--pb-text-color"] = props.textColor;
  }
  if (props.linkColor) {
    (style as Record<string, string>)["--pb-link-color"] = props.linkColor;
  }
  if (props.linkHoverColor) {
    (style as Record<string, string>)["--pb-link-hover-color"] = props.linkHoverColor;
  }
  if (props.textAlign) {
    style.textAlign = props.textAlign as CSSProperties["textAlign"];
  }
  return style;
}

/* ── Vertical Align ─────────────────────────────────────────────────────── */

export function getVerticalAlignStyle(
  align?: string,
  direction?: "" | "row" | "column",
): CSSProperties {
  if (!align || align === "default") return {};
  const map: Record<string, string> = {
    top: "flex-start",
    middle: "center",
    bottom: "flex-end",
    spaceBetween: "space-between",
    spaceAround: "space-around",
  };
  const value = map[align] ?? align;
  // Column flex: main axis is vertical → justify-content positions content vertically.
  // Row/grid: cross axis is vertical → align-items.
  if (direction === "column") {
    return { justifyContent: value };
  }
  return { alignItems: value };
}

/* ── Advanced: Grid Item ────────────────────────────────────────────────── */

export function getGridItemStyle(
  gridColumnSpan?: unknown,
  gridRowSpan?: unknown,
): CSSProperties {
  const style: CSSProperties = {};
  if (gridColumnSpan && gridColumnSpan !== "default") {
    style.gridColumn = `span ${gridColumnSpan}`;
  }
  if (gridRowSpan && gridRowSpan !== "default") {
    style.gridRow = `span ${gridRowSpan}`;
  }
  return style;
}

/* ── Advanced: Position ─────────────────────────────────────────────────── */

const POSITION_MAP: Record<string, string> = {
  absolute: "absolute",
  fixed: "fixed",
  relative: "relative",
  sticky: "sticky",
};

export function getAdvancedPositionStyle(position?: string): CSSProperties {
  if (!position || position === "default" || !POSITION_MAP[position]) return {};
  return { position: POSITION_MAP[position] as CSSProperties["position"] };
}

/* ── Advanced: Width ────────────────────────────────────────────────────── */

export function getAdvancedWidthStyle(width?: string): CSSProperties {
  if (width === "full") return { width: "100%" };
  if (width === "boxed") {
    return { maxWidth: "var(--theme-max-width, 1200px)", marginLeft: "auto", marginRight: "auto" };
  }
  if (width === "inline") return { display: "inline-block" };
  return {};
}

/* ── Advanced: Transform ────────────────────────────────────────────────── */

type TransformKey =
  | "rotateZ"
  | "rotateX"
  | "rotateY"
  | "scaleX"
  | "scaleY"
  | "skewX"
  | "skewY"
  | "offsetX"
  | "offsetY"
  | "flipH"
  | "flipV";

export function buildTransformCss(
  props: Record<string, unknown>,
  prefix: "" | "hover" = "",
): string | undefined {
  const get = (key: TransformKey): number | boolean | undefined => {
    const prefixed = key.charAt(0).toUpperCase() + key.slice(1);
    return props[`${prefix}${prefixed}`] as number | boolean | undefined;
  };

  const parts: string[] = [];
  const rotateZ = get("rotateZ");
  if (rotateZ) parts.push(`rotate(${rotateZ}deg)`);
  const rotateX = get("rotateX");
  if (rotateX) parts.push(`rotateX(${rotateX}deg)`);
  const rotateY = get("rotateY");
  if (rotateY) parts.push(`rotateY(${rotateY}deg)`);

  const scaleX = get("scaleX");
  const scaleY = get("scaleY");
  if (scaleX || scaleY) parts.push(`scale(${scaleX ?? 1}, ${scaleY ?? 1})`);

  const skewX = get("skewX");
  if (skewX) parts.push(`skewX(${skewX}deg)`);
  const skewY = get("skewY");
  if (skewY) parts.push(`skewY(${skewY}deg)`);

  const offsetX = get("offsetX");
  const offsetY = get("offsetY");
  if (offsetX || offsetY) parts.push(`translate(${offsetX ?? 0}px, ${offsetY ?? 0}px)`);

  if (get("flipH")) parts.push("scaleX(-1)");
  if (get("flipV")) parts.push("scaleY(-1)");

  return parts.length > 0 ? parts.join(" ") : undefined;
}

/* ── Advanced: Spacing ──────────────────────────────────────────────────── */

export function spacingToCss(v: number | string | undefined): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return v === 0 ? undefined : `${v}px`;
  if (typeof v === "string") return v || undefined;
  return undefined;
}

export interface SpacingValue {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

export function getAdvancedSpacingStyle(spacing?: SpacingValue): CSSProperties {
  if (!spacing) return {};
  const style: CSSProperties = {};
  const top = spacingToCss(spacing.top);
  const right = spacingToCss(spacing.right);
  const bottom = spacingToCss(spacing.bottom);
  const left = spacingToCss(spacing.left);
  if (top) style.marginTop = top;
  if (right) style.marginRight = right;
  if (bottom) style.marginBottom = bottom;
  if (left) style.marginLeft = left;
  return style;
}

export function getAdvancedPaddingStyle(spacing?: SpacingValue): CSSProperties {
  if (!spacing) return {};
  const style: CSSProperties = {};
  const top = spacingToCss(spacing.top);
  const right = spacingToCss(spacing.right);
  const bottom = spacingToCss(spacing.bottom);
  const left = spacingToCss(spacing.left);
  if (top) style.paddingTop = top;
  if (right) style.paddingRight = right;
  if (bottom) style.paddingBottom = bottom;
  if (left) style.paddingLeft = left;
  return style;
}

/* ── Advanced: Mask ─────────────────────────────────────────────────────── */

export function getMaskStyle(mask?: boolean): CSSProperties {
  if (!mask) return {};
  const value =
    "radial-gradient(closest-side, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)";
  return { WebkitMaskImage: value, maskImage: value };
}

/* ── Advanced: Scrolling Effects ────────────────────────────────────────── */

export function getScrollingEffectStyle(
  scrollingEffects?: boolean,
  bgImage?: string,
): CSSProperties {
  if (!scrollingEffects || !bgImage) return {};
  return { backgroundAttachment: "fixed" };
}

/* ── Advanced: Sticky ───────────────────────────────────────────────────── */

export function getAdvancedStickyStyle(sticky?: string): CSSProperties {
  if (!sticky || sticky === "none") return {};
  return {
    position: "sticky" as const,
    ...(sticky === "top" ? { top: 0 } : { bottom: 0 }),
  };
}

/* ── Advanced: Custom Attributes ────────────────────────────────────────── */

export function parseCustomAttributes(raw?: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!raw) return attrs;
  for (const line of raw.split(/\r?\n/)) {
    const sep = line.indexOf("|");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (key) attrs[key] = value;
  }
  return attrs;
}

/* ── Advanced: Custom CSS scoping ───────────────────────────────────────── */

export function scopeCustomCss(css?: string, blockId?: string): string {
  const trimmed = css?.trim();
  if (!trimmed) return "";
  if (!blockId) return trimmed;
  const scope = styleScopeClass(blockId);
  return trimmed.replace(/(^|[^\w-])selector(?=[^\w-]|$)/g, `$1.${scope}`);
}

/* ── Advanced: Cache Setting ────────────────────────────────────────────── */

export function getCacheAttribute(cacheSetting?: string): Record<string, string> {
  if (!cacheSetting || cacheSetting === "default") return {};
  return { "data-cache": cacheSetting === "active" ? "active" : "inactive" };
}

/* ── Advanced: Hover styles ─────────────────────────────────────────────── */

function hoverKey(key: string): string {
  return `hover${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function buildHoverBackgroundCss(props: Record<string, unknown>): string | undefined {
  const g = (k: string) => props[hoverKey(k)] as string | undefined;
  if (g("bgType") === "gradient" && g("bgGradientStart") && g("bgGradientEnd")) {
    const angle = (props[hoverKey("bgGradientAngle")] as number) ?? 180;
    return `background: linear-gradient(${angle}deg, ${g("bgGradientStart")}, ${g("bgGradientEnd")}) !important;`;
  }
  const decls: string[] = [];
  if (g("bgColor")) decls.push(`background-color: ${g("bgColor")} !important;`);
  if (g("bgImage")) {
    decls.push(`background-image: url(${g("bgImage")}) !important;`);
    decls.push(`background-size: ${g("bgSize") || "cover"} !important;`);
    decls.push(`background-position: ${g("bgPosition") || "center center"} !important;`);
    decls.push(`background-repeat: ${g("bgRepeat") || "no-repeat"} !important;`);
  }
  return decls.length > 0 ? decls.join(" ") : undefined;
}

export function buildHoverBorderCss(props: Record<string, unknown>): string | undefined {
  const g = (k: string) => props[hoverKey(k)] as string | undefined;
  const decls: string[] = [];
  const style = g("borderStyle");
  if (style && style !== "none") {
    if (g("borderWidth") !== undefined && g("borderWidth") !== null) {
      decls.push(
        `border-style: ${style} !important; border-width: ${g("borderWidth")}px !important; border-color: ${g("borderColor") || "#000000"} !important;`,
      );
    } else {
      decls.push(`border-style: ${style} !important; border-color: ${g("borderColor") || "#000000"} !important;`);
    }
  }
  if (g("boxShadow")) decls.push(`box-shadow: ${g("boxShadow")} !important;`);
  return decls.length > 0 ? decls.join(" ") : undefined;
}

export function hasAdvancedHover(props: Record<string, unknown>): boolean {
  return (
    Boolean(buildTransformCss(props, "hover")) ||
    Boolean(buildHoverBackgroundCss(props)) ||
    Boolean(buildHoverBorderCss(props))
  );
}

export function buildAdvancedHoverCss(blockId: string, props: Record<string, unknown>): string {
  const decls: string[] = [];
  const transform = buildTransformCss(props, "hover");
  if (transform) decls.push(`transform: ${transform} !important;`);
  const background = buildHoverBackgroundCss(props);
  if (background) decls.push(background);
  const border = buildHoverBorderCss(props);
  if (border) decls.push(border);
  if (decls.length === 0) return "";
  const scope = styleScopeClass(blockId);
  return `.${scope}:hover { ${decls.join(" ")} }`;
}

export function getAdvancedHoverTransition(): CSSProperties {
  return {
    transition:
      "transform 0.3s ease, background-color 0.3s ease, border-color 0.3s ease, border-width 0.3s ease, box-shadow 0.3s ease",
  };
}

/* ── Advanced: Display Conditions ───────────────────────────────────────── */

export function isDateConditionVisible(condition?: string, date?: string): boolean | null {
  if (condition === "date_after") {
    return date ? new Date() >= new Date(`${date}T00:00:00`) : true;
  }
  if (condition === "date_before") {
    return date ? new Date() <= new Date(`${date}T23:59:59`) : true;
  }
  return null;
}

export function needsClientGate(condition?: string): boolean {
  return condition === "logged_in" || condition === "logged_out" || condition === "url_contains";
}
