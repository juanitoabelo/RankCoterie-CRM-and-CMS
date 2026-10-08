// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { createBlock, type Block } from "@/lib/page-builder/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/blog-template/types";
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

describe("BlogTemplateRenderer article bindings", () => {
  it("renders bound article title, HTML body, featured image, and layout background", async () => {
    const heading = createBlock("heading");
    heading.props = {
      ...heading.props,
      text: "Static heading",
      cssId: "bound-title",
      bindings: { text: "title" },
    } as typeof heading.props;

    const text = createBlock("text");
    text.props = {
      ...text.props,
      content: "<p>Static body</p>",
      cssId: "bound-body",
      bindings: { content: "body" },
    } as typeof text.props;

    const image = createBlock("image");
    image.props = {
      ...image.props,
      src: "/static.jpg",
      alt: "Static image",
      cssId: "bound-image",
      bindings: { src: "featuredImage", alt: "featuredImageAlt" },
    } as typeof image.props;

    const section = createBlock("section");
    section.props = {
      ...section.props,
      cssId: "bound-section",
      bindings: { bgImage: "featuredImage" },
    } as typeof section.props;

    const blocks: Block[] = [section, heading, text, image];
    await act(async () => {
      root?.render(
        <BlogTemplateRenderer
          blocks={blocks}
          containerSettings={DEFAULT_CONTAINER_SETTINGS}
          templateType="single"
          article={{
            id: "article-1",
            title: "Bound article title",
            slug: "bound-article",
            body: "<p>Article body from current post</p>",
            metaDesc: "Post summary",
            ogImage: null,
            featuredImage: "/api/assets/featured-1",
            featuredImageAlt: "Post cover image",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Bound article title");
    expect(container.innerHTML).toContain("Article body from current post");
    expect(container.querySelector<HTMLImageElement>("img")?.src).toContain("/api/assets/featured-1");
    expect(container.querySelector<HTMLImageElement>("img")?.alt).toBe("Post cover image");
    expect(container.querySelector<HTMLElement>("#bound-section")?.style.backgroundImage).toContain("/api/assets/featured-1");
  }, 15_000);
});
