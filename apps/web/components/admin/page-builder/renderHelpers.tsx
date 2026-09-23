import React from "react";
import type { CSSProperties, ReactNode } from "react";

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

export function getVerticalAlignStyle(align?: string): CSSProperties {
  if (!align || align === "default") return {};
  const map: Record<string, string> = {
    top: "flex-start",
    middle: "center",
    bottom: "flex-end",
    spaceBetween: "space-between",
    spaceAround: "space-around",
  };
  return { alignItems: map[align] ?? align };
}
