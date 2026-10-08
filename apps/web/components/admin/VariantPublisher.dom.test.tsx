// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

vi.mock("@/app/(admin)/admin/content/actions", () => ({
  previewRegion: vi.fn(),
  publishTemplate: vi.fn(),
}));

import VariantPublisher, { type TemplateOption } from "./VariantPublisher";
import type { PickerRegion } from "@/components/regions/RegionPicker";

const regions: PickerRegion[] = [
  { id: "CA", state: "CA", stateFull: "California", city: null },
  { id: "VA", state: "VA", stateFull: "Virginia", city: null },
  { id: "TX", state: "TX", stateFull: "Texas", city: null },
];

function option(
  id: string,
  title: string,
  regionIds: string[],
): TemplateOption {
  return { id, title, status: "LIVE", variantCount: regionIds.length, regionIds };
}

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

function statewideCheckbox(stateFull: string): HTMLInputElement | undefined {
  const label = [...container.querySelectorAll("label")].find(
    (l) => l.textContent?.trim() === `${stateFull} (statewide)`,
  );
  return label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
}

describe("VariantPublisher target region persistence", () => {
  it("pre-checks regions that already have saved variants", async () => {
    await act(async () => {
      root?.render(
        <VariantPublisher
          templates={[option("t1", "Sample post", ["CA", "VA"])]}
          regions={regions}
        />,
      );
    });

    expect(statewideCheckbox("California")?.checked).toBe(true);
    expect(statewideCheckbox("Virginia")?.checked).toBe(true);
    expect(statewideCheckbox("Texas")?.checked).toBe(false);
  });

  it("loads the selected template's saved regions when switching templates", async () => {
    await act(async () => {
      root?.render(
        <VariantPublisher
          templates={[option("t1", "Sample post", ["CA"]), option("t2", "Other post", ["TX"])]}
          regions={regions}
        />,
      );
    });

    expect(statewideCheckbox("California")?.checked).toBe(true);
    expect(statewideCheckbox("Texas")?.checked).toBe(false);

    const templateSelect = container.querySelector<HTMLSelectElement>("select");
    expect(templateSelect).toBeTruthy();
    act(() => {
      templateSelect!.value = "t2";
      templateSelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(statewideCheckbox("California")?.checked).toBe(false);
    expect(statewideCheckbox("Texas")?.checked).toBe(true);
  });
});
