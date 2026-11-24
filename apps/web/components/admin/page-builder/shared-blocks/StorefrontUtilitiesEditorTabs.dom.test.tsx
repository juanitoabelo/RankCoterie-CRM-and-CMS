// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { createBlock } from "@/lib/page-builder/types";
import StorefrontUtilitiesEditorTabs from "./StorefrontUtilitiesEditorTabs";

let container: HTMLDivElement;
let root: Root;

async function clickTab(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim().toLowerCase() === label,
  );
  if (!button) throw new Error(`Missing ${label} tab`);
  await act(async () => button.click());
}

describe("StorefrontUtilitiesEditorTabs", () => {
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

  it("renders content, style, and advanced tabs", async () => {
    await act(async () => {
      root.render(
        <StorefrontUtilitiesEditorTabs
          block={createBlock("storefrontUtilities")}
          onChange={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Show cart icon");

    await clickTab("style");
    expect(container.textContent).toContain("Style individual parts of");
    expect(container.textContent).toContain("Storefront Utilities");
    expect(container.textContent).toContain("Utility link");
    expect(container.textContent).toContain("Count badge");

    await clickTab("advanced");
    expect(container.textContent).toContain("Layout");
    expect(container.textContent).toContain("Display Conditions");
  });
});
