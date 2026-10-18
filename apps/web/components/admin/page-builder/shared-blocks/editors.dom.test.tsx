// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { createBlock, SHARED_BLOCK_TYPES } from "@/lib/page-builder/types";
import BlockEditor from "../BlockEditor";

let container: HTMLDivElement;
let root: Root;

describe("shared block editors", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    })) as unknown as typeof fetch;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it(
    "renders an editor for every shared block type",
    async () => {
      expect(SHARED_BLOCK_TYPES.length).toBe(30);
      for (const type of SHARED_BLOCK_TYPES) {
        await act(async () => {
          root.render(
            <BlockEditor block={createBlock(type)} onChange={() => undefined} />,
          );
        });
        expect(container.textContent ?? "", `editor for ${type}`).toContain("content");
      }
    },
    30000,
  );

  it(
    "exposes element-level Style tab controls for shared blocks",
    async () => {
      await act(async () => {
        root.render(<BlockEditor block={createBlock("pricing")} onChange={() => undefined} />);
      });
      const styleTab = Array.from(container.querySelectorAll("button")).find(
        (button) => (button.textContent ?? "").trim().toLowerCase() === "style",
      );
      expect(styleTab).toBeTruthy();
      await act(async () => {
        styleTab!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(container.textContent ?? "").toContain("Style individual parts of");
      expect(container.textContent ?? "").toContain("Pricing Table");
    },
    30000,
  );
});
