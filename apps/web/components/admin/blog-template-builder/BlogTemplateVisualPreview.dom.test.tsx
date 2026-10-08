// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { createBlogTemplateBlock } from "@/lib/blog-template/types";
import BlogTemplateVisualPreview from "./BlogTemplateVisualPreview";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/blog-template/types";

vi.mock("./BlogTemplateRenderer", () => ({
  default: ({ article }: { article: { title: string; body: string } }) => (
    <article>
      <h1>{article.title}</h1>
      <div>{article.body}</div>
    </article>
  ),
}));

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

describe("BlogTemplateVisualPreview", () => {
  it("renders a single-post template with sample article content", async () => {
    const blocks = [createBlogTemplateBlock("articleHero")];
    await act(async () => {
      root?.render(
        <BlogTemplateVisualPreview
          blocks={blocks}
          containerSettings={DEFAULT_CONTAINER_SETTINGS}
          viewport="desktop"
        />,
      );
    });

    expect(container.textContent).toContain("A sample article title");
    expect(container.textContent).toContain("sample article content");
  });
});
