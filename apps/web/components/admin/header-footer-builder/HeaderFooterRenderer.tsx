"use client";

/**
 * Header / Footer Builder — Public Block Renderer
 *
 * Renders header/footer blocks for the public site. Reuses page builder
 * renderers for standard blocks and adds specialized renderers for
 * header/footer-specific blocks.
 */
import { createContext, useContext, useState, useRef } from "react";
import Link from "next/link";
import type { Block } from "@/lib/page-builder/types";
import type { HeaderFooterBlock, ContainerSettings } from "@/lib/header-footer/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/header-footer/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { resolveColumnWidths, renderColumnSpanClass } from "@/lib/page-builder/spans";
import { styleScopeClass, renderStyleGuide } from "@/lib/page-builder/style";
import type { StyleBreakpoints } from "@/lib/page-builder/types";
import {
  getEntranceAnimationClass,
  getVisibilityClasses,
  getHeightStyle,
  getBackgroundStyle,
  renderOverlay,
  renderShapeDivider,
  getStickyStyle,
  getTypographyScopeStyle,
  getVerticalAlignStyle,
  resolveTag,
} from "../page-builder/renderHelpers";

/* ── Menu Context ──────────────────────────────────────────────────────── */

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  target?: string | null;
  children?: MenuItem[];
}

export interface MenuData {
  header?: MenuItem[];
  footer?: MenuItem[];
}

const MenuContext = createContext<MenuData>({});

function useMenuContext() {
  return useContext(MenuContext);
}

/* ── Specialized Block Renderers ────────────────────────────────────────── */

function LogoRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  
  const sizeToCss = (v: unknown, fallback?: string): string | undefined => {
    if (v === undefined || v === null) return fallback;
    if (typeof v === "number") return v === 0 ? fallback : `${v}px`;
    if (typeof v === "object" && v !== null && "value" in v) {
      const sv = v as { value: number; unit: string };
      return sv.value === 0 ? fallback : `${sv.value}${sv.unit}`;
    }
    return fallback;
  };
  
  const alignment = (p.alignment as string) ?? "left";
  const alignClass = alignment === "center" ? "mx-auto block" : alignment === "right" ? "ml-auto block" : "block";
  
  const imgStyle: React.CSSProperties = {
    width: sizeToCss(p.imageWidth, "100%"),
    maxWidth: sizeToCss(p.imageMaxWidth),
    height: sizeToCss(p.imageHeight, "auto"),
    maxHeight: sizeToCss(p.imageMaxHeight),
    opacity: p.opacity !== undefined && (p.opacity as number) < 100 ? (p.opacity as number) / 100 : undefined,
    borderTopLeftRadius: p.borderRadiusTop ? `${p.borderRadiusTop}px` : undefined,
    borderTopRightRadius: p.borderRadiusRight ? `${p.borderRadiusRight}px` : undefined,
    borderBottomRightRadius: p.borderRadiusBottom ? `${p.borderRadiusBottom}px` : undefined,
    borderBottomLeftRadius: p.borderRadiusLeft ? `${p.borderRadiusLeft}px` : undefined,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle as string : undefined,
    borderWidth: p.borderWidth ? `${p.borderWidth}px` : undefined,
    borderColor: p.borderColor as string,
    boxShadow: p.boxShadow as string,
    transition: "opacity 0.3s ease",
  };
  
  const hoverOpacity = p.hoverOpacity !== undefined && (p.hoverOpacity as number) < 100 ? (p.hoverOpacity as number) / 100 : undefined;
  
  return (
    <div className={alignClass} style={{ textAlign: alignment === "center" ? "center" : alignment === "right" ? "right" : "left" }}>
      <Link href={(p.linkTo as string) || "/"} className="inline-block">
        {p.src ? (
          <img
            src={p.src as string}
            alt={(p.alt as string) || ""}
            style={imgStyle}
            className="hover:opacity-75"
          />
        ) : (
          <span className="text-lg font-bold text-zinc-900">Logo</span>
        )}
      </Link>
    </div>
  );
}

/* ── Menu Renderer ───────────────────────────────────────────────────────── */

function SubmenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function HamburgerIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7H21M3 12H21M3 17H21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function CloseIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function DesktopMenuItem({
  item,
  textColor,
  hoverColor,
  activeColor,
  fontSize,
  pointer,
  pointerWidth,
  pointerColor,
  hPadding,
  vPadding,
  fontFamily,
  fontWeight,
  textTransform,
  letterSpacing,
  dropdownBgColor,
  dropdownTextColor,
  dropdownHoverColor,
  animation,
}: {
  item: MenuItem;
  textColor?: string;
  hoverColor?: string;
  activeColor?: string;
  fontSize?: number;
  pointer?: string;
  pointerWidth?: number;
  pointerColor?: string;
  hPadding?: number;
  vPadding?: number;
  fontFamily?: string;
  fontWeight?: string;
  textTransform?: string;
  letterSpacing?: number;
  dropdownBgColor?: string;
  dropdownTextColor?: string;
  dropdownHoverColor?: string;
  animation?: string;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  const pointerStyle: React.CSSProperties = {};
  if (pointer === "underline") {
    pointerStyle.borderBottom = `${pointerWidth ?? 2}px solid ${pointerColor ?? textColor ?? "#fff"}`;
    pointerStyle.paddingBottom = "2px";
  }

  const animationClass = animation === "fade"
    ? "transition-all duration-200"
    : animation === "grow"
      ? "transition-transform duration-200 hover:scale-105"
      : "";

  const itemStyle: React.CSSProperties = {
    color: textColor,
    fontSize,
    padding: `${vPadding ?? 8}px ${hPadding ?? 12}px`,
    fontFamily,
    fontWeight,
    textTransform: textTransform as React.CSSProperties["textTransform"],
    letterSpacing,
    position: "relative",
    ...pointerStyle,
  };

  return (
    <div
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={item.href}
        target={item.target ?? undefined}
        className={`inline-flex items-center gap-1 transition-colors ${animationClass}`}
        style={itemStyle}
        onMouseEnter={(e) => {
          if (hoverColor) e.currentTarget.style.color = hoverColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = textColor ?? "";
        }}
      >
        {item.label}
        {hasChildren && <SubmenuIcon className="ml-0.5 opacity-60" />}
      </Link>

      {hasChildren && isOpen && (
        <div
          className="absolute left-0 top-full z-50 min-w-[200px] rounded-md border border-zinc-200 py-1 shadow-lg"
          style={{
            backgroundColor: dropdownBgColor ?? "#ffffff",
            animation: animation === "fade" ? "fadeIn 0.15s ease-in" : undefined,
          }}
        >
          {item.children!.map((child) => (
            <Link
              key={child.id}
              href={child.href}
              target={child.target ?? undefined}
              className="block px-4 py-2 text-sm transition-colors hover:bg-zinc-50"
              style={{ color: dropdownTextColor ?? "#333333" }}
              onMouseEnter={(e) => {
                if (dropdownHoverColor) e.currentTarget.style.backgroundColor = dropdownHoverColor;
                e.currentTarget.style.color = hoverColor ?? dropdownTextColor ?? "#333333";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "";
                e.currentTarget.style.color = dropdownTextColor ?? "#333333";
              }}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenuPanel({
  items,
  isOpen,
  onClose,
  textColor,
  hoverColor,
  activeColor,
  fontSize,
  mobileTextAlign,
  fullMobileWidth,
  dropdownBgColor,
  dropdownTextColor,
  dropdownHoverColor,
  hPadding,
  vPadding,
  fontFamily,
  fontWeight,
  textTransform,
  letterSpacing,
}: {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  textColor?: string;
  hoverColor?: string;
  activeColor?: string;
  fontSize?: number;
  mobileTextAlign?: string;
  fullMobileWidth?: boolean;
  dropdownBgColor?: string;
  dropdownTextColor?: string;
  dropdownHoverColor?: string;
  hPadding?: number;
  vPadding?: number;
  fontFamily?: string;
  fontWeight?: string;
  textTransform?: string;
  letterSpacing?: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const textAlign = mobileTextAlign === "center"
    ? "text-center"
    : mobileTextAlign === "right"
      ? "text-right"
      : "text-left";

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 z-50 h-full overflow-y-auto transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${fullMobileWidth ? "w-full" : "w-80"}`}
        style={{ backgroundColor: dropdownBgColor ?? "#ffffff" }}
      >
        {/* Close button */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <span className="text-sm font-medium" style={{ color: textColor }}>Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-zinc-100"
          >
            <CloseIcon size={20} color={textColor} />
          </button>
        </div>

        {/* Menu items */}
        <nav className={`${textAlign} py-2`}>
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    target={item.target ?? undefined}
                    className="flex-1 transition-colors"
                    style={{
                      color: textColor,
                      fontSize,
                      padding: `${vPadding ?? 12}px ${hPadding ?? 16}px`,
                      fontFamily,
                      fontWeight,
                      textTransform: textTransform as React.CSSProperties["textTransform"],
                      letterSpacing,
                      display: "block",
                    }}
                    onClick={onClose}
                  >
                    {item.label}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex h-10 w-10 items-center justify-center transition-transform"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        color: textColor,
                      }}
                    >
                      <SubmenuIcon />
                    </button>
                  )}
                </div>

                {/* Submenu */}
                {hasChildren && isExpanded && (
                  <div className="border-t border-zinc-100">
                    {item.children!.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        target={child.target ?? undefined}
                        className="block transition-colors"
                        style={{
                          color: dropdownTextColor ?? textColor,
                          fontSize: fontSize ? fontSize - 2 : 14,
                          padding: `${vPadding ?? 10}px ${hPadding ?? 32}px`,
                          fontFamily,
                          fontWeight,
                          textTransform: textTransform as React.CSSProperties["textTransform"],
                          letterSpacing,
                        }}
                        onClick={onClose}
                        onMouseEnter={(e) => {
                          if (dropdownHoverColor) e.currentTarget.style.backgroundColor = dropdownHoverColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "";
                        }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}

function MenuRenderer({ block }: { block: Block }) {
  const p = block.props as unknown as {
    menuId?: string;
    orientation: string;
    align: string;
    gap: number;
    textColor?: string;
    hoverColor?: string;
    fontSize?: number;
    style: string;
    pointer?: string;
    pointerWidth?: number;
    pointerColor?: string;
    animation?: string;
    hPadding?: number;
    vPadding?: number;
    spaceBetween?: number;
    mobileMenuStyle?: string;
    mobileBreakpoint?: number;
    fullMobileWidth?: boolean;
    mobileTextAlign?: string;
    toggleButton?: string;
    toggleAlign?: string;
    toggleColor?: string;
    toggleSize?: number;
    dropdownBgColor?: string;
    dropdownTextColor?: string;
    dropdownHoverColor?: string;
    activeColor?: string;
    fontFamily?: string;
    fontWeight?: string;
    textTransform?: string;
    letterSpacing?: number;
    cssId?: string;
    cssClasses?: string;
  };

  const menus = useMenuContext();
  const menuKey = (p.menuId || "header").toLowerCase() as "header" | "footer";
  const items = menus[menuKey] ?? menus.header ?? [];
  const [mobileOpen, setMobileOpen] = useState(false);
  const breakpoint = p.mobileBreakpoint ?? 1024;

  const alignClass =
    p.align === "center"
      ? "justify-center"
      : p.align === "right"
        ? "justify-end"
        : p.align === "between"
          ? "justify-between"
          : "justify-start";

  const isHamburger = p.style === "hamburger" || p.toggleButton === "hamburger";

  return (
    <>
      {/* CSS for animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: ${breakpoint}px) {
          .menu-desktop-nav { display: none !important; }
          .menu-mobile-toggle { display: flex !important; }
        }
        @media (min-width: ${breakpoint + 1}px) {
          .menu-mobile-toggle { display: none !important; }
        }
      `}} />

      {/* Desktop Navigation */}
      <nav
        id={p.cssId || undefined}
        className={`menu-desktop-nav flex items-center ${alignClass} ${p.orientation === "vertical" ? "flex-col" : "flex-row flex-wrap"}`}
        style={{
          gap: p.spaceBetween ?? p.gap,
          color: p.textColor,
          fontSize: p.fontSize,
        }}
      >
        {items.map((item) => (
          <DesktopMenuItem
            key={item.id}
            item={item}
            textColor={p.textColor}
            hoverColor={p.hoverColor}
            activeColor={p.activeColor}
            fontSize={p.fontSize}
            pointer={p.pointer}
            pointerWidth={p.pointerWidth}
            pointerColor={p.pointerColor}
            hPadding={p.hPadding}
            vPadding={p.vPadding}
            fontFamily={p.fontFamily}
            fontWeight={p.fontWeight}
            textTransform={p.textTransform}
            letterSpacing={p.letterSpacing}
            dropdownBgColor={p.dropdownBgColor}
            dropdownTextColor={p.dropdownTextColor}
            dropdownHoverColor={p.dropdownHoverColor}
            animation={p.animation}
          />
        ))}
      </nav>

      {/* Mobile Toggle Button */}
      <div
        className={`menu-mobile-toggle hidden items-center ${
          p.toggleAlign === "center"
            ? "justify-center"
            : p.toggleAlign === "right"
              ? "justify-end"
              : "justify-start"
        }`}
      >
        <button
          type="button"
          className="flex items-center justify-center"
          onClick={() => setMobileOpen(true)}
          style={{
            color: p.toggleColor ?? p.textColor,
            padding: "8px",
          }}
          aria-label="Open menu"
        >
          <HamburgerIcon size={p.toggleSize ?? 24} color={p.toggleColor ?? p.textColor} />
        </button>
      </div>

      {/* Mobile Menu Panel */}
      <MobileMenuPanel
        items={items}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        textColor={p.textColor}
        hoverColor={p.hoverColor}
        activeColor={p.activeColor}
        fontSize={p.fontSize}
        mobileTextAlign={p.mobileTextAlign}
        fullMobileWidth={p.fullMobileWidth}
        dropdownBgColor={p.dropdownBgColor}
        dropdownTextColor={p.dropdownTextColor}
        dropdownHoverColor={p.dropdownHoverColor}
        hPadding={p.hPadding}
        vPadding={p.vPadding}
        fontFamily={p.fontFamily}
        fontWeight={p.fontWeight}
        textTransform={p.textTransform}
        letterSpacing={p.letterSpacing}
      />
    </>
  );
}

function SocialIconsRenderer({ block }: { block: Block }) {
  const p = block.props as unknown as {
    icons: Array<{ platform: string; url: string; label: string }>;
    size: string;
    color: string;
    hoverColor: string;
    gap: number;
  };

  const sizeClass = p.size === "sm" ? "w-4 h-4" : p.size === "lg" ? "w-8 h-8" : "w-6 h-6";

  const platformIcons: Record<string, string> = {
    facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
    pinterest: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24 18.635 24 24.001 18.633 24.001 12.013 24.001 5.393 18.635.026 12.017.026V0z",
    tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  };

  return (
    <div className="flex" style={{ gap: p.gap }}>
      {p.icons.map((icon, i) => (
        <a
          key={i}
          href={icon.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={icon.label}
          className="transition-colors"
          style={{ color: p.color }}
          onMouseEnter={(e) => (e.currentTarget.style.color = p.hoverColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = p.color)}
        >
          <svg
            className={sizeClass}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {platformIcons[icon.platform] ? (
              <path d={platformIcons[icon.platform]} />
            ) : (
              <circle cx="12" cy="12" r="10" />
            )}
          </svg>
        </a>
      ))}
    </div>
  );
}

function ContactInfoRenderer({ block }: { block: Block }) {
  const p = block.props as unknown as {
    showPhone: boolean;
    showEmail: boolean;
    showAddress: boolean;
    showHours: boolean;
    phone: string;
    email: string;
    address: string;
    hours: string;
    separator: string;
    iconStyle: string;
    textColor?: string;
    fontSize?: number;
  };

  const items: string[] = [];
  if (p.showPhone && p.phone) items.push(p.phone);
  if (p.showEmail && p.email) items.push(p.email);
  if (p.showAddress && p.address) items.push(p.address);
  if (p.showHours && p.hours) items.push(p.hours);

  const sep =
    p.separator === "pipe"
      ? " | "
      : p.separator === "dot"
        ? " · "
        : p.separator === "space"
          ? " "
          : "\n";

  return (
    <div
      style={{
        color: p.textColor,
        fontSize: p.fontSize,
        whiteSpace: p.separator === "newline" ? "pre-line" : undefined,
      }}
    >
      {items.join(sep)}
    </div>
  );
}

function SearchRenderer({ block }: { block: Block }) {
  const p = block.props as unknown as {
    placeholder: string;
    style: string;
    width: number;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    borderRadius: number;
  };

  return (
    <form action="/search" method="GET" style={{ maxWidth: p.width }}>
      <input
        type="search"
        name="q"
        placeholder={p.placeholder}
        className="w-full px-3 py-2 text-sm outline-none"
        style={{
          backgroundColor: p.bgColor,
          borderColor: p.borderColor,
          color: p.textColor,
          borderRadius: p.borderRadius,
          border: `1px solid ${p.borderColor || "#d1d5db"}`,
        }}
      />
    </form>
  );
}

/* ── Style Scope Helper ─────────────────────────────────────────────────── */

function styleScope(block: Block, inner: React.ReactNode): React.ReactNode {
  const style = (block.props as { style?: StyleBreakpoints }).style;
  const css = renderStyleGuide(block.id, style);
  if (!css) return inner;
  return (
    <>
      <style>{css}</style>
      <div className={styleScopeClass(block.id)}>{inner}</div>
    </>
  );
}

/* ── Row Renderer ────────────────────────────────────────────────────────── */

function RowRenderer({ block }: { block: Block }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;

  const bgStyle = getBackgroundStyle({
    bgType: p.bgType,
    bgColor: p.bgColor,
    bgImage: p.bgImage,
    bgSize: p.bgSize,
    bgPosition: p.bgPosition,
    bgRepeat: p.bgRepeat,
    bgGradientStart: p.bgGradientStart,
    bgGradientEnd: p.bgGradientEnd,
    bgGradientAngle: p.bgGradientAngle,
  });

  const rowStyle: React.CSSProperties = {
    width: "100%",
    ...bgStyle,
    color: p.textColor,
    paddingTop: p.padding?.top ?? p.paddingY,
    paddingRight: p.padding?.right,
    paddingBottom: p.padding?.bottom ?? p.paddingY,
    paddingLeft: p.padding?.left,
    marginTop: p.margin?.top,
    marginRight: p.margin?.right,
    marginBottom: p.margin?.bottom,
    marginLeft: p.margin?.left,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle : undefined,
    borderWidth: p.borderWidth,
    borderColor: p.borderColor,
    borderRadius: p.borderRadius,
    boxShadow: p.boxShadow,
    zIndex: p.zindex || undefined,
    position: "relative",
    overflow: p.overflow && p.overflow !== "default" ? p.overflow : undefined,
    ...getStickyStyle(p.sticky),
  };

  const heightStyle = getHeightStyle(p.height, p.minHeight);
  if (heightStyle) {
    Object.assign(rowStyle, heightStyle);
  }

  const animClass = getEntranceAnimationClass(p.entranceAnimation);
  const visClass = getVisibilityClasses({
    hideOnDesktop: p.hideOnDesktop,
    hideOnTablet: p.hideOnTablet,
    hideOnMobile: p.hideOnMobile,
  });
  const reverseTablet = p.reverseColumnsTablet ? "pb-reverse-tablet" : "";
  const reverseMobile = p.reverseColumnsMobile ? "pb-reverse-mobile" : "";
  const rowClasses = [animClass, visClass, p.cssClasses].filter(Boolean).join(" ");

  // Content Width: apply boxed or full-width constraints
  const rowWidth = p.width ?? (p.fullWidth ? "full" : "boxed");
  if (rowWidth === "boxed") {
    rowStyle.maxWidth = p.maxWidth ? `${p.maxWidth}px` : "var(--theme-max-width, 1200px)";
    rowStyle.marginLeft = "auto";
    rowStyle.marginRight = "auto";
  }

  const RowTag = resolveTag(p.htmlTag, "div");

  return (
    <RowTag
      style={rowStyle}
      id={p.cssId || undefined}
      className={rowClasses || undefined}
    >
      {renderOverlay({ overlayColor: p.overlayColor, overlayOpacity: p.overlayOpacity })}
      {renderShapeDivider("top", p.shapeDividerTop, p.shapeDividerTopColor, p.shapeDividerTopWidth, p.shapeDividerTopHeight)}
      {renderShapeDivider("bottom", p.shapeDividerBottom, p.shapeDividerBottomColor, p.shapeDividerBottomWidth, p.shapeDividerBottomHeight)}
      <div
        className={`grid grid-cols-12 ${reverseTablet} ${reverseMobile}`}
        style={{
          gap: p.gap,
          rowGap: p.gapRow,
          alignItems: p.align,
          flexDirection: p.direction === "column" ? "column" : undefined,
          flexWrap: p.wrap === "wrap" ? "wrap" : undefined,
          ...getVerticalAlignStyle(p.verticalAlign),
          ...getTypographyScopeStyle({
            headingColor: p.headingColor,
            textColor: p.textColor,
            linkColor: p.linkColor,
            linkHoverColor: p.linkHoverColor,
            textAlign: p.textAlign,
          }),
        }}
      >
        {p.columns.map((col: any, idx: number) => {
          const widths = resolveColumnWidths(col, p.stackOnMobile);
          const spanClass = renderColumnSpanClass(widths);
          const colStyle: React.CSSProperties = {
            backgroundColor: col.bgColor,
            backgroundImage: col.bgImage ? `url(${col.bgImage})` : undefined,
            backgroundPosition: col.bgPosition,
            backgroundSize: col.bgSize,
            backgroundRepeat: col.bgRepeat,
            borderStyle: col.borderStyle !== "none" ? col.borderStyle : undefined,
            borderWidth: col.borderWidth,
            borderColor: col.borderColor,
            borderRadius: col.borderRadius,
            boxShadow: col.boxShadow,
            marginTop: col.margin?.top,
            marginRight: col.margin?.right,
            marginBottom: col.margin?.bottom,
            marginLeft: col.margin?.left,
            paddingTop: col.padding?.top,
            paddingRight: col.padding?.right,
            paddingBottom: col.padding?.bottom,
            paddingLeft: col.padding?.left,
            zIndex: col.zindex || undefined,
            position: "relative" as const,
            display: "flex",
            flexDirection: "column",
            justifyContent: col.justifyContent ?? "flex-start",
            alignItems: col.alignItems ?? "stretch",
            minHeight: col.minHeight,
            order: idx,
          };
          const colOverlayStyle: React.CSSProperties | undefined = col.bgImage && col.overlayOpacity
            ? {
                position: "absolute",
                inset: 0,
                backgroundColor: col.overlayColor || "#000000",
                opacity: col.overlayOpacity / 100,
                pointerEvents: "none",
              }
            : undefined;
          return (
            <div
              key={col.id}
              className={spanClass}
              style={colStyle}
              id={col.cssId || undefined}
            >
              {colOverlayStyle && <div style={colOverlayStyle} />}
              <RenderBlocks blocks={col.blocks as HeaderFooterBlock[]} />
            </div>
          );
        })}
      </div>
      {p.customCss && <style dangerouslySetInnerHTML={{ __html: p.customCss }} />}
    </RowTag>
  );
}

/* ── Simple Leaf Renderers (reuse from page builder where possible) ─────── */

const HEADING_SIZES = {
  1: "text-4xl font-bold tracking-tight sm:text-5xl",
  2: "text-3xl font-bold tracking-tight sm:text-4xl",
  3: "text-2xl font-bold sm:text-3xl",
  4: "text-xl font-semibold sm:text-2xl",
  5: "text-lg font-semibold",
  6: "text-base font-semibold",
} as const;

function HeadingRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  const level = (p.level as number) || 2;
  const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"] as const)[level - 1] as React.ElementType;

  const alignCls =
    p.align === "center"
      ? "text-center"
      : p.align === "right"
        ? "text-right"
        : p.align === "justify"
          ? "text-justify"
          : "text-left";

  // Responsive hide classes
  const hideClasses = [
    p.hideOnDesktop ? "hidden lg:block" : "",
    p.hideOnTablet ? "hidden md:block" : "",
    p.hideOnMobile ? "hidden sm:block" : "",
  ].filter(Boolean).join(" ");

  // Width classes
  const widthCls = p.width === "full" ? "w-full" : p.width === "boxed" ? "mx-auto max-w-3xl" : p.width === "inline" ? "inline-block" : "";

  // Build inline styles
  const headingStyle: React.CSSProperties = {};

  if (p.textColor) headingStyle.color = p.textColor as string;
  else headingStyle.color = "rgb(24, 24, 27)";
  if (p.fontFamily) headingStyle.fontFamily = p.fontFamily as string;
  if (p.fontWeight) headingStyle.fontWeight = p.fontWeight as string;
  if (p.fontSize) headingStyle.fontSize = `${p.fontSize}${p.fontSizeUnit || "px"}`;
  if (p.textTransform) headingStyle.textTransform = p.textTransform as React.CSSProperties["textTransform"];
  if (p.textDecoration) headingStyle.textDecoration = p.textDecoration as React.CSSProperties["textDecoration"];
  if (p.lineHeight) headingStyle.lineHeight = p.lineHeight as number;
  if (p.letterSpacing !== undefined) headingStyle.letterSpacing = p.letterSpacing as number;
  if (p.wordSpacing !== undefined) headingStyle.wordSpacing = p.wordSpacing as number;
  if (p.textShadow) headingStyle.textShadow = p.textShadow as string;
  if (p.blendMode) headingStyle.mixBlendMode = p.blendMode as string;

  // Margin
  if (p.margin) {
    const m = p.margin as Record<string, string>;
    headingStyle.marginTop = m.top || undefined;
    headingStyle.marginRight = m.right || undefined;
    headingStyle.marginBottom = m.bottom || undefined;
    headingStyle.marginLeft = m.left || undefined;
  }

  // Padding
  if (p.padding) {
    const pad = p.padding as Record<string, string>;
    headingStyle.paddingTop = pad.top || undefined;
    headingStyle.paddingRight = pad.right || undefined;
    headingStyle.paddingBottom = pad.bottom || undefined;
    headingStyle.paddingLeft = pad.left || undefined;
  }

  // Border
  if (p.borderStyle && p.borderStyle !== "none") {
    headingStyle.borderStyle = p.borderStyle as string;
    headingStyle.borderWidth = p.borderWidth ? `${p.borderWidth}px` : "1px";
    headingStyle.borderColor = (p.borderColor as string) || "#000";
  }

  // Border radius
  if (p.borderRadiusTop || p.borderRadiusRight || p.borderRadiusBottom || p.borderRadiusLeft) {
    headingStyle.borderTopLeftRadius = p.borderRadiusTop ? `${p.borderRadiusTop}px` : undefined;
    headingStyle.borderTopRightRadius = p.borderRadiusRight ? `${p.borderRadiusRight}px` : undefined;
    headingStyle.borderBottomRightRadius = p.borderRadiusBottom ? `${p.borderRadiusBottom}px` : undefined;
    headingStyle.borderBottomLeftRadius = p.borderRadiusLeft ? `${p.borderRadiusLeft}px` : undefined;
  }

  if (p.boxShadow) headingStyle.boxShadow = p.boxShadow as string;
  if (p.bgColor) headingStyle.backgroundColor = p.bgColor as string;
  if (p.zIndex !== undefined) headingStyle.zIndex = p.zIndex as number;

  // Background image
  if (p.bgImage) {
    headingStyle.backgroundImage = `url(${p.bgImage})`;
    headingStyle.backgroundPosition = (p.bgPosition as string) || "center center";
    headingStyle.backgroundSize = (p.bgSize as string) || "cover";
    headingStyle.backgroundRepeat = (p.bgRepeat as string) || "no-repeat";
  }

  // Transform
  const transforms: string[] = [];
  if (p.rotateZ) transforms.push(`rotate(${p.rotateZ}deg)`);
  if (p.rotateX) transforms.push(`rotateX(${p.rotateX}deg)`);
  if (p.rotateY) transforms.push(`rotateY(${p.rotateY}deg)`);
  if (p.scaleX || p.scaleY) transforms.push(`scale(${p.scaleX || 1}, ${p.scaleY || 1})`);
  if (p.skewX) transforms.push(`skewX(${p.skewX}deg)`);
  if (p.skewY) transforms.push(`skewY(${p.skewY}deg)`);
  if (p.offsetX || p.offsetY) transforms.push(`translate(${p.offsetX || 0}px, ${p.offsetY || 0}px)`);
  if (p.flipH) transforms.push("scaleX(-1)");
  if (p.flipV) transforms.push("scaleY(-1)");
  if (transforms.length > 0) headingStyle.transform = transforms.join(" ");

  // Entrance animation
  const animStyle = p.entranceAnimation ? { animation: `${p.entranceAnimation} 0.6s ease-out` } : {};

  const headingContent = (
    <Tag
      className={`${HEADING_SIZES[level as keyof typeof HEADING_SIZES] || HEADING_SIZES[2]} ${alignCls} ${widthCls} ${hideClasses}`}
      style={headingStyle}
      id={(p.cssId as string) || undefined}
    >
      {p.text as string}
    </Tag>
  );

  // Wrap in link if provided
  const wrapped = p.link ? (
    <a href={p.link as string} target={(p.linkTarget as string) || undefined} className="no-underline" style={{ color: "inherit" }}>
      {headingContent}
    </a>
  ) : headingContent;

  return (
    <div className={(p.cssClasses as string) || ""} {...animStyle}>
      {wrapped}
    </div>
  );
}

function TextRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  return (
    <div
      style={{
        textAlign: (p.align as React.CSSProperties["textAlign"]) || undefined,
        color: (p.textColor as string) || undefined,
      }}
      dangerouslySetInnerHTML={{ __html: p.content as string }}
    />
  );
}

function ImageRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  if (!p.src) return null;
  
  const sizeToCss = (v: unknown, fallback?: string): string | undefined => {
    if (v === undefined || v === null) return fallback;
    if (typeof v === "number") return v === 0 ? fallback : `${v}px`;
    if (typeof v === "object" && v !== null && "value" in v) {
      const sv = v as { value: number; unit: string };
      return sv.value === 0 ? fallback : `${sv.value}${sv.unit}`;
    }
    return fallback;
  };

  const marginToCss = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "number") return v === 0 ? undefined : `${v}px`;
    if (typeof v === "string") return v || undefined;
    return undefined;
  };
  
  const alignment = (p.alignment as string) ?? "left";
  const alignClass = alignment === "center" ? "mx-auto" : alignment === "right" ? "ml-auto" : "";

  const containerStyle: React.CSSProperties = {
    marginTop: marginToCss(p.margin?.top),
    marginRight: marginToCss(p.margin?.right),
    marginBottom: marginToCss(p.margin?.bottom),
    marginLeft: marginToCss(p.margin?.left),
    paddingTop: marginToCss(p.padding?.top),
    paddingRight: marginToCss(p.padding?.right),
    paddingBottom: marginToCss(p.padding?.bottom),
    paddingLeft: marginToCss(p.padding?.left),
  };
  
  const imgStyle: React.CSSProperties = {
    width: sizeToCss(p.imageWidth, "100%"),
    maxWidth: sizeToCss(p.imageMaxWidth),
    height: sizeToCss(p.imageHeight, "auto"),
    maxHeight: sizeToCss(p.imageMaxHeight),
    objectFit: sizeToCss(p.imageHeight) || sizeToCss(p.imageMaxHeight) ? "cover" : undefined,
    opacity: p.opacity !== undefined && (p.opacity as number) < 100 ? (p.opacity as number) / 100 : undefined,
    borderTopLeftRadius: p.borderRadiusTop ? `${p.borderRadiusTop}px` : undefined,
    borderTopRightRadius: p.borderRadiusRight ? `${p.borderRadiusRight}px` : undefined,
    borderBottomRightRadius: p.borderRadiusBottom ? `${p.borderRadiusBottom}px` : undefined,
    borderBottomLeftRadius: p.borderRadiusLeft ? `${p.borderRadiusLeft}px` : undefined,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle as string : undefined,
    borderWidth: p.borderWidth ? `${p.borderWidth}px` : undefined,
    borderColor: p.borderColor as string,
    boxShadow: p.boxShadow as string,
    transition: "opacity 0.3s ease",
  };
  
  return (
    <div style={containerStyle}>
      <figure className={alignClass}>
        <img src={p.src as string} alt={(p.alt as string) || ""} style={imgStyle} className="hover:opacity-75" />
        {(p.caption as string) && (
          <figcaption className="mt-2 text-center text-sm text-zinc-500">
            {p.caption as string}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

function ButtonRenderer({ block }: { block: Block }) {
  const p = block.props as { text: string; url: string; align: string; variant: string };
  return (
    <div style={{ textAlign: p.align as React.CSSProperties["textAlign"] }}>
      <a
        href={p.url}
        className={`inline-block px-6 py-3 text-sm font-medium ${
          p.variant === "outline"
            ? "border-2 border-current"
            : "btn"
        }`}
      >
        {p.text}
      </a>
    </div>
  );
}

function SpacerRenderer({ block }: { block: Block }) {
  const p = block.props as { height: number };
  return <div style={{ height: p.height }} />;
}

function DividerRenderer() {
  return <hr className="border-zinc-200" />;
}

function EmbedRenderer({ block }: { block: Block }) {
  const p = block.props as { html: string };
  return <div dangerouslySetInnerHTML={{ __html: p.html }} />;
}

function TestimonialRenderer({ block }: { block: Block }) {
  const p = block.props as {
    items: Array<{ quote: string; author: string; role: string; rating: number; avatar?: string }>;
    display: "grid" | "slider";
    columns: 1 | 2 | 3;
    itemsPerView: number;
    heading?: string;
  };
  const items = p.items ?? [];
  const columns = p.columns ?? 2;

  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  if (p.display === "slider") {
    return (
      <div className="overflow-x-auto py-4">
        <div className="flex gap-6" style={{ minWidth: "min-content" }}>
          {items.map((item, i) => (
            <figure
              key={i}
              className="flex-shrink-0 rounded-2xl bg-zinc-50 px-8 py-10 text-center"
              style={{ width: `${100 / (p.itemsPerView ?? 2)}%`, minWidth: "300px" }}
            >
              {item.rating > 0 && (
                <div className="text-amber-400">
                  {"★".repeat(Math.max(0, Math.min(5, item.rating)))}
                </div>
              )}
              <blockquote className="mt-4 text-lg font-medium leading-relaxed text-zinc-800">
                {item.quote}
              </blockquote>
              <figcaption className="mt-4 text-sm text-zinc-500">
                {item.avatar && (
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="mx-auto mb-2 h-10 w-10 rounded-full object-cover"
                  />
                )}
                — {item.author}
                {item.role ? `, ${item.role}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      {p.heading && (
        <h2 className="mb-6 text-center text-2xl font-bold text-zinc-900">
          {p.heading}
        </h2>
      )}
      <div className={`mx-auto grid max-w-6xl gap-6 ${colClass}`}>
        {items.map((item, i) => (
          <figure key={i} className="rounded-2xl bg-zinc-50 px-8 py-10 text-center">
            {item.rating > 0 && (
              <div className="text-amber-400">
                {"★".repeat(Math.max(0, Math.min(5, item.rating)))}
              </div>
            )}
            <blockquote className="mt-4 text-lg font-medium leading-relaxed text-zinc-800">
              {item.quote}
            </blockquote>
            <figcaption className="mt-4 text-sm text-zinc-500">
              {item.avatar && (
                <img
                  src={item.avatar}
                  alt={item.author}
                  className="mx-auto mb-2 h-10 w-10 rounded-full object-cover"
                />
              )}
              — {item.author}
              {item.role ? `, ${item.role}` : ""}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ── Icon List Renderer ──────────────────────────────────────────────────── */

function IconListRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  const items = (p.items || []) as Array<{ text: string; icon: string; link?: string }>;
  const layout = (p.layout as string) || "list";
  const isInline = layout === "inline";
  const gap = (p.iconGap as number) ?? 8;
  const space = (p.spaceBetween as number) ?? 0;

  const textStyle: React.CSSProperties = {};
  if (p.textColor) textStyle.color = p.textColor as string;
  if (p.typography && typeof p.typography === "object") {
    const t = p.typography as Record<string, unknown>;
    if (t.fontFamily) textStyle.fontFamily = t.fontFamily as string;
    if (t.fontWeight) textStyle.fontWeight = t.fontWeight as string;
    if (t.fontSize) textStyle.fontSize = `${t.fontSize}${t.fontSizeUnit || "px"}`;
    if (t.lineHeight) textStyle.lineHeight = t.lineHeight as number;
    if (t.letterSpacing !== undefined) textStyle.letterSpacing = t.letterSpacing as number;
    if (t.textTransform) textStyle.textTransform = t.textTransform as React.CSSProperties["textTransform"];
    if (t.textDecoration) textStyle.textDecoration = t.textDecoration as React.CSSProperties["textDecoration"];
  }
  if (p.textShadow) textStyle.textShadow = p.textShadow as string;

  const listStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isInline ? "row" : "column",
    alignItems: p.align === "center" ? "center" : p.align === "right" ? "flex-end" : "flex-start",
    gap: isInline ? `${gap * 2}px` : `${space}px`,
    listStyle: "none",
    margin: 0,
    padding: 0,
  };

  const itemAlign = p.iconVerticalAlign === "top" ? "flex-start" : p.iconVerticalAlign === "bottom" ? "flex-end" : "center";

  if (p.margin && typeof p.margin === "object") {
    const m = p.margin as Record<string, string>;
    if (m.top) listStyle.marginTop = m.top;
    if (m.right) listStyle.marginRight = m.right;
    if (m.bottom) listStyle.marginBottom = m.bottom;
    if (m.left) listStyle.marginLeft = m.left;
  }
  if (p.padding && typeof p.padding === "object") {
    const pd = p.padding as Record<string, string>;
    if (pd.top) listStyle.paddingTop = pd.top;
    if (pd.right) listStyle.paddingRight = pd.right;
    if (pd.bottom) listStyle.paddingBottom = pd.bottom;
    if (pd.left) listStyle.paddingLeft = pd.left;
  }

  return (
    <ul
      id={(p.cssId as string) || undefined}
      className={(p.cssClasses as string) || undefined}
      style={listStyle}
    >
      {items.map((item, i) => {
        const iconStyle: React.CSSProperties = {
          color: (p.iconColor as string) || "#1e40af",
          fontSize: `${(p.iconSize as number) ?? 14}px`,
          lineHeight: 1,
          flexShrink: 0,
        };

        const itemStyle: React.CSSProperties = {
          display: "flex",
          alignItems: itemAlign,
          gap: `${gap}px`,
        };

        const content = (
          <li key={i} style={itemStyle}>
            {item.icon && <span style={iconStyle}>{item.icon}</span>}
            <span style={textStyle}>{item.text}</span>
          </li>
        );

        if (item.link && p.applyLinkOn !== "icon_only") {
          const relParts: string[] = [];
          if (p.openInNewTab) relParts.push("noopener", "noreferrer");
          if (p.linkRel) relParts.push(...(p.linkRel as string).split(" ").filter(Boolean));
          const relAttr = relParts.length > 0 ? relParts.join(" ") : undefined;

          return (
            <a
              key={i}
              href={item.link}
              target={p.openInNewTab ? "_blank" : undefined}
              rel={relAttr}
              style={{ ...itemStyle, textDecoration: "none", color: "inherit" }}
            >
              {item.icon && <span style={iconStyle}>{item.icon}</span>}
              <span style={textStyle}>{item.text}</span>
            </a>
          );
        }

        return content;
      })}
    </ul>
  );
}

/* ── Google Map Renderer ────────────────────────────────────────────────── */

function GoogleMapRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  const location = (p.location as string) || "London Eye, London, United Kingdom";
  const zoom = (p.zoom as number) ?? 10;
  const height = (p.height as number) ?? 400;

  const filters: string[] = [];
  if (p.cssFilterBlur) filters.push(`blur(${p.cssFilterBlur}px)`);
  if (p.cssFilterBrightness && p.cssFilterBrightness !== 100) filters.push(`brightness(${p.cssFilterBrightness}%)`);
  if (p.cssFilterContrast && p.cssFilterContrast !== 100) filters.push(`contrast(${p.cssFilterContrast}%)`);
  if (p.cssFilterSaturation && p.cssFilterSaturation !== 100) filters.push(`saturate(${p.cssFilterSaturation}%)`);
  if (p.cssFilterHue) filters.push(`hue-rotate(${p.cssFilterHue}deg)`);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: `${height}px`,
    position: "relative",
    overflow: "hidden",
  };
  if (p.margin && typeof p.margin === "object") {
    const m = p.margin as Record<string, string>;
    if (m.top) containerStyle.marginTop = m.top;
    if (m.right) containerStyle.marginRight = m.right;
    if (m.bottom) containerStyle.marginBottom = m.bottom;
    if (m.left) containerStyle.marginLeft = m.left;
  }
  if (p.padding && typeof p.padding === "object") {
    const pd = p.padding as Record<string, string>;
    if (pd.top) containerStyle.paddingTop = pd.top;
    if (pd.right) containerStyle.paddingRight = pd.right;
    if (pd.bottom) containerStyle.paddingBottom = pd.bottom;
    if (pd.left) containerStyle.paddingLeft = pd.left;
  }

  const iframeStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    border: 0,
  };
  if (filters.length > 0) {
    iframeStyle.filter = filters.join(" ");
  }

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      id={(p.cssId as string) || undefined}
      className={(p.cssClasses as string) || undefined}
      style={containerStyle}
    >
      <iframe
        src={mapUrl}
        style={iframeStyle}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map: ${location}`}
      />
    </div>
  );
}

/* ── Video Renderer ────────────────────────────────────────────────────── */

function VideoRenderer({ block }: { block: Block }) {
  const p = block.props as Record<string, unknown>;
  const source = (p.source as string) || "youtube";
  const link = (p.link as string) || "";
  const aspectRatio = (p.aspectRatio as string) || "16:9";

  const filters: string[] = [];
  if (p.cssFilterBlur) filters.push(`blur(${p.cssFilterBlur}px)`);
  if (p.cssFilterBrightness && p.cssFilterBrightness !== 100) filters.push(`brightness(${p.cssFilterBrightness}%)`);
  if (p.cssFilterContrast && p.cssFilterContrast !== 100) filters.push(`contrast(${p.cssFilterContrast}%)`);
  if (p.cssFilterSaturation && p.cssFilterSaturation !== 100) filters.push(`saturate(${p.cssFilterSaturation}%)`);
  if (p.cssFilterHue) filters.push(`hue-rotate(${p.cssFilterHue}deg)`);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  };

  const aspectMap: Record<string, string> = {
    "16:9": "56.25%",
    "4:3": "75%",
    "1:1": "100%",
    "21:9": "42.86%",
  };
  containerStyle.paddingBottom = aspectMap[aspectRatio] || "56.25%";

  if (p.margin && typeof p.margin === "object") {
    const m = p.margin as Record<string, string>;
    if (m.top) containerStyle.marginTop = m.top;
    if (m.right) containerStyle.marginRight = m.right;
    if (m.bottom) containerStyle.marginBottom = m.bottom;
    if (m.left) containerStyle.marginLeft = m.left;
  }
  if (p.padding && typeof p.padding === "object") {
    const pd = p.padding as Record<string, string>;
    if (pd.top) containerStyle.paddingTop = pd.top;
    if (pd.right) containerStyle.paddingRight = pd.right;
    if (pd.bottom) containerStyle.paddingBottom = pd.bottom;
    if (pd.left) containerStyle.paddingLeft = pd.left;
  }

  const iframeStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: 0,
  };
  if (filters.length > 0) {
    iframeStyle.filter = filters.join(" ");
  }

  let videoUrl = "";
  const params: string[] = [];

  if (p.autoplay) params.push("autoplay=1");
  if (p.mute) params.push("mute=1");
  if (p.loop) params.push("loop=1");
  if (!p.playerControls) params.push("controls=0");
  if (p.captions) params.push("cc_load_policy=1");
  if (p.privacyMode && (source === "youtube" || source === "vimeo")) params.push("dnt=1");
  if (p.startTime) params.push(`start=${p.startTime}`);
  if (p.endTime) params.push(`end=${p.endTime}`);
  if (p.suggestedVideos === "any") params.push("rel=1");

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";

  if (source === "youtube") {
    const videoId = link.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1] || "";
    videoUrl = videoId ? `https://www.youtube.com/embed/${videoId}${queryString}` : "";
  } else if (source === "vimeo") {
    const videoId = link.match(/vimeo\.com\/(\d+)/)?.[1] || "";
    videoUrl = videoId ? `https://player.vimeo.com/video/${videoId}${queryString}` : "";
  } else if (source === "dailymotion") {
    const videoId = link.match(/dailymotion\.com\/video\/([^_]+)/)?.[1] || "";
    videoUrl = videoId ? `https://www.dailymotion.com/embed/video/${videoId}${queryString}` : "";
  }

  const playIconStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "68px",
    height: "48px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: p.playIconType === "circle" ? "50%" : "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 2,
  };

  const playIconSymbol = p.playIconType === "upArrow" ? "▲" : p.playIconType === "star" ? "★" : "▶";

  return (
    <div
      id={(p.cssId as string) || undefined}
      className={(p.cssClasses as string) || undefined}
      style={containerStyle}
    >
      {p.imageOverlay && p.overlayImage ? (
        <div className="relative h-full w-full">
          <img
            src={p.overlayImage as string}
            alt="Video thumbnail"
            className="h-full w-full object-cover"
            style={filters.length > 0 ? { filter: filters.join(" ") } : undefined}
          />
          {p.playIcon && (
            <div style={playIconStyle}>
              <span style={{ color: "white", fontSize: "20px", marginLeft: "3px" }}>{playIconSymbol}</span>
            </div>
          )}
        </div>
      ) : videoUrl ? (
        <iframe
          src={videoUrl}
          style={iframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading={(p.lazyLoad as boolean) ? "lazy" : "eager"}
          title="Video"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-200">
          <div className="text-center text-zinc-500">
            <span className="text-4xl">▶</span>
            <p className="mt-2 text-sm">Choose your video</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Renderer Map ────────────────────────────────────────────────────────── */

const RENDERERS: Record<string, React.ComponentType<{ block: Block }>> = {
  logo: LogoRenderer,
  menu: MenuRenderer,
  socialIcons: SocialIconsRenderer,
  contactInfo: ContactInfoRenderer,
  search: SearchRenderer,
  heading: HeadingRenderer,
  text: TextRenderer,
  image: ImageRenderer,
  button: ButtonRenderer,
  spacer: SpacerRenderer,
  divider: DividerRenderer,
  embed: EmbedRenderer,
  testimonial: TestimonialRenderer,
  iconList: IconListRenderer,
  googleMap: GoogleMapRenderer,
  video: VideoRenderer,
};

/* ── Section Renderer ───────────────────────────────────────────────────── */

function SectionRenderer({ block }: { block: Block }) {
  const p = block.props as {
    rows: Block[];
    width?: string;
    maxWidth?: number;
    minHeight?: number;
    direction?: string;
    justifyContent?: string;
    alignItems?: string;
    gapCol?: number;
    gapRow?: number;
    wrap?: string;
    bgColor?: string;
    bgImage?: string;
    bgPosition?: string;
    bgSize?: string;
    bgRepeat?: string;
    bgType?: string;
    bgGradientStart?: string;
    bgGradientEnd?: string;
    bgGradientAngle?: number;
    overlayColor?: string;
    overlayOpacity?: number;
    overlayBgType?: string;
    textColor?: string;
    borderStyle?: string;
    borderWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    boxShadow?: string;
    paddingTop?: number;
    paddingBottom?: number;
    margin?: { top: number; right: number; bottom: number; left: number };
    padding?: { top: number; right: number; bottom: number; left: number };
    zindex?: number;
    cssId?: string;
    cssClasses?: string;
    height?: string;
    verticalAlign?: string;
    overflow?: string;
    htmlTag?: string;
    stretchSection?: boolean;
    sticky?: string;
    entranceAnimation?: string;
    hideOnDesktop?: boolean;
    hideOnTablet?: boolean;
    hideOnMobile?: boolean;
    headingColor?: string;
    linkColor?: string;
    linkHoverColor?: string;
    textAlign?: string;
    shapeDividerTop?: string;
    shapeDividerTopColor?: string;
    shapeDividerTopWidth?: number;
    shapeDividerTopHeight?: number;
    shapeDividerBottom?: string;
    shapeDividerBottomColor?: string;
    shapeDividerBottomWidth?: number;
    shapeDividerBottomHeight?: number;
    customCss?: string;
  };

  const bgStyle = getBackgroundStyle({
    bgType: p.bgType,
    bgColor: p.bgColor,
    bgImage: p.bgImage,
    bgSize: p.bgSize,
    bgPosition: p.bgPosition,
    bgRepeat: p.bgRepeat,
    bgGradientStart: p.bgGradientStart,
    bgGradientEnd: p.bgGradientEnd,
    bgGradientAngle: p.bgGradientAngle,
  });

  const outerStyle: React.CSSProperties = {
    width: "100%",
    ...bgStyle,
    color: p.textColor,
    borderStyle: p.borderStyle !== "none" ? p.borderStyle : undefined,
    borderWidth: p.borderWidth,
    borderColor: p.borderColor,
    borderRadius: p.borderRadius,
    boxShadow: p.boxShadow,
    marginTop: p.margin?.top,
    marginRight: p.margin?.right,
    marginBottom: p.margin?.bottom,
    marginLeft: p.margin?.left,
    paddingTop: p.padding?.top ?? p.paddingTop,
    paddingRight: p.padding?.right,
    paddingBottom: p.padding?.bottom ?? p.paddingBottom,
    paddingLeft: p.padding?.left,
    zIndex: p.zindex || undefined,
    position: "relative",
    overflow: p.overflow && p.overflow !== "default" ? p.overflow : undefined,
    ...getStickyStyle(p.sticky),
  };

  const heightStyle = getHeightStyle(p.height, p.minHeight);
  if (heightStyle) Object.assign(outerStyle, heightStyle);

  const animClass = getEntranceAnimationClass(p.entranceAnimation);
  const visClass = getVisibilityClasses({
    hideOnDesktop: p.hideOnDesktop,
    hideOnTablet: p.hideOnTablet,
    hideOnMobile: p.hideOnMobile,
  });
  const sectionClasses = ["pb-section", animClass, visClass, p.cssClasses].filter(Boolean).join(" ");

  const SectionTag = resolveTag(p.htmlTag, "div");

  const innerStyle: React.CSSProperties = {
    maxWidth: p.width === "boxed" ? p.maxWidth : "100%",
    margin: p.width === "boxed" ? "0 auto" : undefined,
    display: "flex",
    flexDirection: p.direction === "column" ? "column" : "row",
    justifyContent: p.justifyContent,
    alignItems: p.alignItems,
    columnGap: p.gapCol,
    rowGap: p.gapRow,
    flexWrap: p.wrap === "wrap" ? "wrap" : undefined,
    ...getVerticalAlignStyle(p.verticalAlign),
    ...getTypographyScopeStyle({
      headingColor: p.headingColor,
      textColor: p.textColor,
      linkColor: p.linkColor,
      linkHoverColor: p.linkHoverColor,
      textAlign: p.textAlign,
    }),
  };

  return (
    <SectionTag
      style={outerStyle}
      id={p.cssId || undefined}
      className={sectionClasses || undefined}
    >
      {renderOverlay({ overlayColor: p.overlayColor, overlayOpacity: p.overlayOpacity })}
      {renderShapeDivider("top", p.shapeDividerTop, p.shapeDividerTopColor, p.shapeDividerTopWidth, p.shapeDividerTopHeight)}
      {renderShapeDivider("bottom", p.shapeDividerBottom, p.shapeDividerBottomColor, p.shapeDividerBottomWidth, p.shapeDividerBottomHeight)}
      <div style={innerStyle}>
        <RenderBlocks blocks={p.rows as HeaderFooterBlock[]} />
      </div>
      {p.customCss && <style dangerouslySetInnerHTML={{ __html: p.customCss }} />}
    </SectionTag>
  );
}

/* ── Recursive Block Renderer ────────────────────────────────────────────── */

function RenderBlocks({ blocks }: { blocks: HeaderFooterBlock[] }) {
  return (
    <>
      {(blocks as Block[]).map((block) => {
        if (isSectionBlock(block)) {
          return <SectionRenderer key={block.id} block={block} />;
        }
        if (isRowBlock(block)) {
          return <RowRenderer key={block.id} block={block} />;
        }
        const Renderer = RENDERERS[block.type];
        if (!Renderer) return null;
        return (
          <div key={block.id}>
            {styleScope(block, <Renderer block={block} />)}
          </div>
        );
      })}
    </>
  );
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export default function HeaderFooterRenderer({
  blocks,
  containerSettings = DEFAULT_CONTAINER_SETTINGS,
  menus = {},
}: {
  blocks: HeaderFooterBlock[];
  containerSettings?: ContainerSettings;
  menus?: MenuData;
}) {
  const outerStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: containerSettings.bgColor,
    backgroundImage: containerSettings.bgImage ? `url(${containerSettings.bgImage})` : undefined,
    backgroundPosition: containerSettings.bgPosition,
    backgroundSize: containerSettings.bgSize,
    backgroundRepeat: containerSettings.bgRepeat,
    borderStyle: containerSettings.borderStyle,
    borderWidth: containerSettings.borderWidth,
    borderColor: containerSettings.borderColor,
    borderRadius: containerSettings.borderRadius,
    marginTop: containerSettings.margin.top,
    marginRight: containerSettings.margin.right,
    marginBottom: containerSettings.margin.bottom,
    marginLeft: containerSettings.margin.left,
    paddingTop: containerSettings.padding.top,
    paddingRight: containerSettings.padding.right,
    paddingBottom: containerSettings.padding.bottom,
    paddingLeft: containerSettings.padding.left,
    position: "relative",
    overflow: "hidden",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: containerSettings.width === "boxed" ? containerSettings.maxWidth : "100%",
    margin: containerSettings.width === "boxed" ? "0 auto" : undefined,
    minHeight: containerSettings.minHeight || undefined,
    display: "flex",
    flexDirection: containerSettings.direction === "column" ? "column" : "row",
    justifyContent: containerSettings.justifyContent,
    alignItems: containerSettings.alignItems,
    columnGap: containerSettings.gapCol,
    rowGap: containerSettings.gapRow,
    flexWrap: containerSettings.wrap,
    zIndex: containerSettings.zindex || undefined,
    position: "relative" as const,
  };

  const overlayStyle: React.CSSProperties | undefined = containerSettings.bgImage && containerSettings.overlayOpacity
    ? {
        position: "absolute",
        inset: 0,
        backgroundColor: containerSettings.overlayColor || "#000000",
        opacity: containerSettings.overlayOpacity / 100,
        pointerEvents: "none",
      }
    : undefined;

  return (
    <MenuContext.Provider value={menus}>
      <div
        style={outerStyle}
        id={containerSettings.cssId || undefined}
        className={containerSettings.cssClasses || undefined}
      >
        {overlayStyle && <div style={overlayStyle} />}
        <div style={innerStyle}>
          <RenderBlocks blocks={blocks} />
        </div>
      </div>
    </MenuContext.Provider>
  );
}

/* ── Single Block Renderer (for canvas previews) ────────────────────────── */

export function HeaderFooterBlockRenderer({ block }: { block: Block }) {
  const Renderer = RENDERERS[block.type];
  if (!Renderer) return null;
  return <Renderer block={block} />;
}
