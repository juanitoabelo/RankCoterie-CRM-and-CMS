// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import ArticleBindingsEditor from "./ArticleBindingsEditor";

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

describe("ArticleBindingsEditor", () => {
  it("lets a single-post text block bind its content to the article body", async () => {
    const changes: Record<string, unknown>[] = [];
    await act(async () => {
      root?.render(
        <ArticleBindingsEditor
          blockType="text"
          props={{ content: "Static text" }}
          onChange={(props) => changes.push(props)}
        />,
      );
    });

    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    act(() => {
      details?.setAttribute("open", "");
    });
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Article data for Content"]');
    expect(select).toBeTruthy();
    act(() => {
      select!.value = "body";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(changes.at(-1)?.bindings).toEqual({ content: "body" });
    expect(changes.at(-1)?.content).toBe("Static text");
  });

  it("offers the uploaded featured image as a background-image source", async () => {
    await act(async () => {
      root?.render(
        <ArticleBindingsEditor
          blockType="section"
          props={{ bgImage: "" }}
          onChange={() => {}}
        />,
      );
    });

    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Article data for Background image"]');
    expect(select?.querySelector('option[value="featuredImage"]')?.textContent).toBe("Featured image");
  });
});
