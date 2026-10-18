// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import ContentSliderFrontend, { SliderPreviewProvider, SliderRegionProvider } from "./ContentSliderFrontend";
import { createBlock, type ContentSliderBlock } from "@/lib/page-builder/types";

let container: HTMLDivElement;
let root: Root;

function propsOf(type: Parameters<typeof createBlock>[0]): ContentSliderBlock["props"] {
  return createBlock(type).props as ContentSliderBlock["props"];
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
};

describe("ContentSliderFrontend", () => {
  it("renders live items and strips un-rendered {{region}} tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            { id: "1", title: "Alpha Dentist {{region}}", subtitle: "Best {{in region}}", image: "/x.jpg", url: "/a", badge: null },
          ],
        }),
      }) as unknown as Response),
    );
    await act(async () => {
      root.render(<ContentSliderFrontend props={propsOf("blogArticleSlider")} />);
    });
    await flush();
    expect(container.querySelector('[data-lp-el="item"]')).toBeTruthy();
    expect(container.textContent).toContain("Alpha Dentist");
    expect(container.textContent).not.toContain("{{region}}");
    expect(container.textContent).not.toContain("{{in region}}");
  });

  it("shows sample slides in editor preview when a live source returns nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ items: [] }) }) as unknown as Response),
    );
    await act(async () => {
      root.render(
        <SliderPreviewProvider>
          <ContentSliderFrontend props={propsOf("productSlider")} />
        </SliderPreviewProvider>,
      );
    });
    await flush();
    expect(container.querySelectorAll('[data-lp-el="item"]').length).toBeGreaterThan(0);
  });

  it("renders region tokens when a region context is provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            { id: "1", title: "Alpha Dentist {{in region}}", subtitle: null, image: "/x.jpg", url: "/a", badge: null },
          ],
        }),
      }) as unknown as Response),
    );
    await act(async () => {
      root.render(
        <SliderRegionProvider value={{ regionName: "Sacramento, CA" }}>
          <ContentSliderFrontend props={propsOf("blogArticleSlider")} />
        </SliderRegionProvider>,
      );
    });
    await flush();
    expect(container.textContent).toContain("Alpha Dentist in Sacramento, CA");
    expect(container.textContent).not.toContain("{{");
  });

  it("renders the button on live slides when Show button is enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            { id: "1", title: "Alpha", subtitle: null, image: "/x.jpg", url: "/a", badge: null },
          ],
        }),
      }) as unknown as Response),
    );
    const props: ContentSliderBlock["props"] = { ...propsOf("productSlider"), showButton: true, buttonText: "Shop now" };
    await act(async () => {
      root.render(<ContentSliderFrontend props={props} />);
    });
    await flush();
    const button = container.querySelector('[data-lp-el="button"]');
    expect(button?.textContent).toContain("Shop now");
    expect(button?.getAttribute("href")).toBe("/a");
  });

  it("hides the horizontal scroll bar when the option is off", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            { id: "1", title: "Alpha", subtitle: null, image: "/x.jpg", url: "/a", badge: null },
          ],
        }),
      }) as unknown as Response),
    );
    const props: ContentSliderBlock["props"] = { ...propsOf("productSlider"), showScrollbar: false };
    await act(async () => {
      root.render(<ContentSliderFrontend props={props} />);
    });
    await flush();
    const track = container.querySelector('[data-lp-el="item"]')?.parentElement;
    expect(track?.className).toContain("[scrollbar-width:none]");
  });

  it("renders static slides without fetching", async () => {
    const props: ContentSliderBlock["props"] = {
      ...propsOf("imageSlider"),
      showTitle: true,
      slides: [
        { src: "/one.jpg", alt: "one", title: "One", caption: "c1", url: "", buttonText: "", buttonUrl: "" },
      ],
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => {
      root.render(<ContentSliderFrontend props={props} />);
    });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector('[data-lp-el="item"]')).toBeTruthy();
    expect(container.textContent).toContain("One");
  });
});
