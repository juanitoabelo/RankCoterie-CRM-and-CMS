// @vitest-environment happy-dom
import { act, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import ElementStyleTab from "./ElementStyleTab";
import type { BlockStyleSchema, ElementStyles } from "@/lib/page-builder/element-style";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SCHEMA: BlockStyleSchema = {
  blockType: "demo",
  blockLabel: "Demo Block",
  elements: [
    {
      key: "heading",
      label: "Heading",
      fields: [
        { key: "fontSize", label: "Size", kind: "number", min: 1, max: 99 },
        { key: "color", label: "Color", kind: "color" },
        { key: "textAlign", label: "Align", kind: "align" },
      ],
    },
  ],
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function cleanup() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(cleanup);

function renderTab(props: { value?: ElementStyles; onChange: (next: ElementStyles) => void }) {
  cleanup();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <ElementStyleTab
        schema={SCHEMA}
        value={props.value}
        onChange={props.onChange}
        themeColors={[{ key: "accent", label: "Accent", color: "#112233" }]}
      />,
    );
  });
  return container;
}

function clickText(el: HTMLElement, text: string) {
  const target = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === text);
  if (!target) throw new Error(`no button labelled ${text}`);
  act(() => target.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

function setNumber(el: HTMLElement, value: string) {
  const input = el.querySelector('input[type="number"]') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("ElementStyleTab", () => {
  it("writes the changed field under the active device", () => {
    const onChange = vi.fn();
    const el = renderTab({ onChange });

    setNumber(el, "20");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ heading: { mobile: { fontSize: 20 } } });
  });

  it("routes edits to the device selected in the tab bar", () => {
    const onChange = vi.fn();
    const el = renderTab({ onChange });

    clickText(el, "Desktop");
    setNumber(el, "32");

    expect(onChange).toHaveBeenLastCalledWith({ heading: { md: { fontSize: 32 } } });
  });

  it("shows the stored value for the active device", () => {
    const el = renderTab({
      value: { heading: { md: { fontSize: 48 } } },
      onChange: vi.fn(),
    });

    clickText(el, "Desktop");
    const input = el.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.value).toBe("48");
  });

  it("clears a field when the input is emptied and drops the element when it becomes empty", () => {
    const onChange = vi.fn();
    const el = renderTab({ value: { heading: { mobile: { fontSize: 20 } } }, onChange });

    setNumber(el, "");

    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("toggles a text-align value and clears it when re-selected", () => {
    const onChange = vi.fn();
    const el = renderTab({ onChange });

    const center = el.querySelector('button[title="center"]') as HTMLButtonElement;
    act(() => center.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onChange).toHaveBeenLastCalledWith({ heading: { mobile: { textAlign: "center" } } });

    const onChange2 = vi.fn();
    const el2 = renderTab({ value: { heading: { mobile: { textAlign: "center" } } }, onChange: onChange2 });
    const center2 = el2.querySelector('button[title="center"]') as HTMLButtonElement;
    act(() => center2.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onChange2).toHaveBeenLastCalledWith({});
  });

  it("round-trips edits through a controlled parent", () => {
    const seen: ElementStyles[] = [];
    function Harness() {
      const [value, setValue] = useState<ElementStyles>({});
      return (
        <ElementStyleTab
          schema={SCHEMA}
          value={value}
          onChange={(next) => {
            seen.push(next);
            setValue(next);
          }}
        />
      );
    }
    cleanup();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<Harness />));

    setNumber(container, "20");
    clickText(container, "Desktop");
    setNumber(container, "40");

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.value).toBe("40");
    expect(seen[seen.length - 1]).toEqual({ heading: { mobile: { fontSize: 20 }, md: { fontSize: 40 } } });
  });

  it("applies a theme swatch color", () => {
    const onChange = vi.fn();
    const el = renderTab({ onChange });

    const swatch = el.querySelector('button[title="Accent"]') as HTMLButtonElement;
    act(() => swatch.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(onChange).toHaveBeenLastCalledWith({ heading: { mobile: { color: "#112233" } } });
  });
});
