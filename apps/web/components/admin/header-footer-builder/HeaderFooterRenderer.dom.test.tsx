// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import HeaderFooterRenderer from "./HeaderFooterRenderer";
import type { HeaderFooterBlock } from "@/lib/header-footer/types";

const menuBlock = {
  id: "menu-toggle-test",
  type: "menu",
  props: {
    menuId: "header",
    orientation: "horizontal",
    style: "hamburger",
    align: "left",
    gap: 16,
    mobileMenuStyle: "slide",
    mobileBreakpoint: 1024,
    toggleButton: "hamburger",
  },
} as HeaderFooterBlock;

let container: HTMLDivElement;
let root: Root;

describe("header mobile menu toggle", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("swaps the burger for an X and back when toggled", async () => {
    await act(async () => {
      root.render(
        <HeaderFooterRenderer
          blocks={[menuBlock]}
          menus={{ header: [] }}
          previewViewport="mobile"
        />,
      );
    });

    const burger = 'path[d="M3 7H21M3 12H21M3 17H21"]';
    const close = 'path[d="M18 6L6 18M6 6L18 18"]';
    const toggle = () =>
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Open menu"], [aria-label="Close menu"]',
      );
    expect(toggle()?.querySelector(burger)).toBeTruthy();
    expect(toggle()?.querySelector(close)).toBeNull();

    await act(async () => {
      toggle()?.click();
    });
    expect(container.querySelector('[aria-label="Close menu"]')).toBeTruthy();
    expect(toggle()?.querySelector(close)).toBeTruthy();
    expect(toggle()?.querySelector(burger)).toBeNull();

    await act(async () => {
      toggle()?.click();
    });
    expect(container.querySelector('[aria-label="Open menu"]')).toBeTruthy();
    expect(toggle()?.querySelector(burger)).toBeTruthy();
    expect(toggle()?.querySelector(close)).toBeNull();
  });
});
