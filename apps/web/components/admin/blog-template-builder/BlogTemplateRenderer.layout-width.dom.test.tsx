// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type { Block } from "@/lib/page-builder/types";
import { createBlogTemplateBlock, DEFAULT_CONTAINER_SETTINGS } from "@/lib/blog-template/types";
import BlogTemplateRenderer from "./BlogTemplateRenderer";

let container: HTMLDivElement;
let root: Root | undefined;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container.remove();
  root = undefined;
});

async function renderBlocks(blocks: Block[]) {
  await act(async () => {
    root?.render(
      <BlogTemplateRenderer
        blocks={blocks}
        containerSettings={DEFAULT_CONTAINER_SETTINGS}
        templateType="single"
      />,
    );
  });
}

describe("BlogTemplateRenderer layout widths", () => {
  it("centers boxed sections at their configured width while full-width sections span the canvas", async () => {
    const section = createBlogTemplateBlock("section");
    section.props = {
      ...section.props,
      width: "boxed",
      maxWidth: 1200,
      cssId: "layout-section",
    };

    await renderBlocks([section]);

    const boxedContent = container.querySelector<HTMLElement>("#layout-section > div");
    expect(boxedContent?.style.width).toBe("100%");
    expect(boxedContent?.style.maxWidth).toBe("1200px");
    expect(boxedContent?.style.margin).toBe("0px auto");

    section.props = { ...section.props, width: "full" };
    await renderBlocks([section]);

    const fullContent = container.querySelector<HTMLElement>("#layout-section > div");
    expect(fullContent?.style.width).toBe("100%");
    expect(fullContent?.style.maxWidth).toBe("100%");
    expect(fullContent?.style.margin).toBe("");
  });

  it("centers boxed rows at their configured width and keeps full-width rows unconstrained", async () => {
    const row = createBlogTemplateBlock("row");
    row.props = {
      ...row.props,
      width: "boxed",
      maxWidth: 1200,
      cssId: "layout-row",
    };

    await renderBlocks([row]);

    const rowStyleText = (element: HTMLElement | null) => {
      const className = element?.className
        .split(/\s+/)
        .find((name) => name.startsWith("pbx-") && name.includes("-row-"));
      if (!className) return "";
      return (
        Array.from(document.querySelectorAll("style[data-pb-dyn]"))
          .map((node) => node.textContent ?? "")
          .find((css) => css.includes(`.${className} {`)) ?? ""
      );
    };

    const boxedRow = container.querySelector<HTMLElement>("#layout-row");
    const boxedCss = rowStyleText(boxedRow);
    expect(boxedRow?.className).toMatch(/pbx-/);
    expect(boxedCss).toMatch(/width:\s*100%/);
    expect(boxedCss).toMatch(/max-width:\s*1200px/);
    expect(boxedCss).toMatch(/margin-left:\s*auto/);
    expect(boxedCss).toMatch(/margin-right:\s*auto/);

    row.props = { ...row.props, width: "full" };
    await renderBlocks([row]);

    const fullRow = container.querySelector<HTMLElement>("#layout-row");
    const fullCss = rowStyleText(fullRow);
    expect(fullRow?.className).toMatch(/pbx-/);
    expect(fullCss).toMatch(/width:\s*100%/);
    expect(fullCss).not.toMatch(/max-width:\s*1200px/);
    expect(fullCss).not.toMatch(/margin-left:\s*auto/);
    expect(fullCss).not.toMatch(/margin-right:\s*auto/);
  });

  it("centers the overall boxed template canvas at its configured max width", async () => {
    const settings = {
      ...DEFAULT_CONTAINER_SETTINGS,
      width: "boxed" as const,
      maxWidth: 1200,
    };
    await act(async () => {
      root?.render(
        <BlogTemplateRenderer
          blocks={[]}
          containerSettings={settings}
          templateType="single"
        />,
      );
    });

    const canvas = container.querySelector<HTMLElement>("[style]");
    const inner = canvas?.firstElementChild as HTMLElement | null;
    expect(inner?.style.width).toBe("100%");
    expect(inner?.style.maxWidth).toBe("1200px");
    expect(inner?.style.margin).toBe("0px auto");
  });
});
