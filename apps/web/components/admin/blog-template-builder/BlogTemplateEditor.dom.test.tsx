// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { createBlogTemplateBlock } from "@/lib/blog-template/types";
import type { BlogTemplateBlock } from "@/lib/blog-template/types";
import BlogTemplateEditor from "./BlogTemplateEditor";

vi.mock("../page-builder/RichTextEditor", () => ({
  default: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) => (
    <textarea
      aria-label="Rich text editor"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

let container: HTMLDivElement;
let root: Root | undefined;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
});

async function renderBlock(block: BlogTemplateBlock) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const activeRoot = createRoot(container);
  root = activeRoot;
  await act(async () => {
    activeRoot.render(
      <BlogTemplateEditor
        block={block}
        onChange={() => {}}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onUpdateColumn={() => {}}
        onAddToColumn={() => {}}
      />,
    );
  });
  return container;
}

async function unmountBlock(view: HTMLDivElement) {
  if (root) {
    const activeRoot = root;
    await act(async () => activeRoot.unmount());
    root = undefined;
  }
  view.remove();
}

describe("BlogTemplateEditor", () => {
  it("uses the Page Content Builder controls for content, media, marketing, and layout blocks", async () => {
    const cases: Array<{ type: BlogTemplateBlock["type"]; expected: string }> = [
      { type: "text", expected: "Content" },
      { type: "video", expected: "Source" },
      { type: "cta", expected: "Button URL" },
      { type: "row", expected: "Content Width" },
    ];

    for (const testCase of cases) {
      const view = await renderBlock(createBlogTemplateBlock(testCase.type));
      expect(view.textContent).toContain(testCase.expected);
      await unmountBlock(view);
    }
  }, 15_000);

  it("keeps Blog-specific post grid settings available", async () => {
    const view = await renderBlock(createBlogTemplateBlock("blogPostGrid"));
    expect(view.textContent).toContain("Posts Per Page");
    expect(view.textContent).toContain("Show Featured Image");
    expect(view.textContent).toContain("Entrance Animation");
    expect(view.textContent).toContain("Hover Effect");
    expect(view.textContent).toContain("Show Category Filter");
    expect(view.textContent).toContain("Show Search");
    expect(view.textContent).toContain("Excerpt Chars");
    expect(view.textContent).toContain("Newest first");

    const styleTab = [...view.querySelectorAll("button")].find(
      (btn) => (btn.textContent ?? "").trim() === "style",
    );
    expect(styleTab).toBeTruthy();
    await act(async () => {
      styleTab!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.textContent).toContain("Card Style");
    expect(view.textContent).toContain("Image Aspect");

    await unmountBlock(view);
  }, 10_000);
});
