// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { createBlock, type Block, type BlockType } from "@/lib/page-builder/types";
import { SHARED_RENDERERS, renderSharedBlock } from "./renderers";

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let container: HTMLDivElement;
let root: Root;

async function renderBlock(block: Block) {
  await act(async () => {
    root.render(<>{renderSharedBlock(block)}</>);
  });
}

async function settle(ms = 30) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

function click(element: Element | null) {
  expect(element).toBeTruthy();
  act(() => {
    element!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("shared block renderers", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    (globalThis as Record<string, unknown>).IntersectionObserver = MockIntersectionObserver;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/categories") {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: "c1", title: "Plumbers", slug: "plumbers", parentId: null },
            { id: "c2", title: "Electricians", slug: "electricians", parentId: null },
          ],
        };
      }
      if (url.pathname === "/api/content-slider") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              { id: "l1", title: "Acme Plumbing", subtitle: "Best in town", image: null, url: "/listing/acme", badge: null },
            ],
          }),
        };
      }
      if (url.pathname === "/api/content-grid") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [{ id: "p1", title: "How to find a plumber", excerpt: "A quick guide", image: null, url: "/how-to" }],
          }),
        };
      }
      if (url.pathname === "/api/product-grid") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [{ id: "prod1", name: "Widget" }] }),
        };
      }
      if (url.pathname === "/api/products") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [{ id: "prod1", name: "Widget", slug: "widget", excerpt: "A great widget", price: 9.99, imageAssetId: null }],
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({ error: "not found" }) };
    }) as unknown as typeof fetch;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("registers every advertised shared block type", () => {
    const expected: BlockType[] = [
      "pricing", "leadForm", "stats", "logos", "tabs", "searchHero",
      "listingCategories", "featuredListings", "mapListings", "toc",
      "relatedPosts", "authorBio", "shareButtons", "postMeta", "newsletter",
      "productCategories", "productSpotlight", "announcement", "breadcrumbs",
      "socialLinks", "countdown", "gallery", "steps", "shapeDivider",
      "reviews", "relatedListings", "businessInfo", "facetBar",
      "comparisonTable", "team",
    ];
    for (const type of expected) {
      expect(SHARED_RENDERERS[type], `${type} renderer`).toBeTruthy();
    }
  });

  it("renders a pricing table with plans and features", async () => {
    await renderBlock(createBlock("pricing"));
    expect(container.textContent).toContain("Simple, transparent pricing");
    expect(container.textContent).toContain("Starter");
    expect(container.textContent).toContain("Business");
    expect(container.textContent).toContain("Custom domain");
    expect(container.querySelectorAll('[data-lp-el="item"]').length).toBe(3);
  });

  it("renders a lead form posting to /api/leads", async () => {
    await renderBlock(createBlock("leadForm"));
    const form = container.querySelector('form[action="/api/leads"]');
    expect(form).toBeTruthy();
    expect(container.querySelector('input[name="email"]')).toBeTruthy();
    expect(container.querySelector('textarea[name="message"]')).toBeTruthy();
  });

  it("renders stats", async () => {
    await renderBlock(createBlock("stats"));
    expect(container.textContent).toContain("500+");
    expect(container.textContent).toContain("Happy customers");
  });

  it("renders partner logos when images are set", async () => {
    const block = createBlock("logos");
    (block.props as { items: Array<{ src: string }> }).items[0].src = "/logo.png";
    await renderBlock(block);
    expect(container.querySelectorAll("img").length).toBe(1);
    expect(container.textContent).toContain("Trusted by teams everywhere");
  });

  it("switches tabs on click", async () => {
    await renderBlock(createBlock("tabs"));
    expect(container.textContent).toContain("Overview content goes here.");
    const tabs = container.querySelectorAll('[role="tab"]');
    click(tabs[1]);
    expect(container.textContent).toContain("Feature details go here.");
  });

  it("renders the directory search hero with a search form", async () => {
    await renderBlock(createBlock("searchHero"));
    expect(container.textContent).toContain("Find what you need");
    expect(container.querySelector("form")).toBeTruthy();
    expect(container.querySelector('input[type="search"]')).toBeTruthy();
  });

  it("loads and links listing categories", async () => {
    await renderBlock(createBlock("listingCategories"));
    await settle();
    expect(container.textContent).toContain("Plumbers");
    const link = container.querySelector('a[href="/g/plumbers/"]');
    expect(link).toBeTruthy();
  });

  it("loads featured listings from the slider API", async () => {
    await renderBlock(createBlock("featuredListings"));
    await settle();
    expect(container.textContent).toContain("Acme Plumbing");
  });

  it("renders a map iframe and listing links", async () => {
    await renderBlock(createBlock("mapListings"));
    await settle();
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain("google.com/maps");
    expect(container.textContent).toContain("Acme Plumbing");
  });

  it("builds a table of contents from page headings", async () => {
    const h = document.createElement("h2");
    h.textContent = "Section One";
    document.body.appendChild(h);
    await renderBlock(createBlock("toc"));
    await settle();
    expect(container.textContent).toContain("Section One");
    document.body.removeChild(h);
  });

  it("loads related posts", async () => {
    await renderBlock(createBlock("relatedPosts"));
    await settle();
    expect(container.textContent).toContain("How to find a plumber");
  });

  it("renders an author bio", async () => {
    await renderBlock(createBlock("authorBio"));
    expect(container.textContent).toContain("Jane Doe");
    expect(container.textContent).toContain("local services");
  });

  it("renders share buttons with network links", async () => {
    await renderBlock(createBlock("shareButtons"));
    expect(container.textContent).toContain("Share this");
    expect(container.querySelector('a[href*="facebook.com"]')).toBeTruthy();
    expect(container.querySelector('a[href*="linkedin.com"]')).toBeTruthy();
  });

  it("renders post meta", async () => {
    await renderBlock(createBlock("postMeta"));
    expect(container.textContent).toContain("By Admin");
    expect(container.textContent).toContain("5 min read");
  });

  it("renders a newsletter signup that confirms on submit", async () => {
    await renderBlock(createBlock("newsletter"));
    expect(container.textContent).toContain("Subscribe to our newsletter");
    const form = container.querySelector("form");
    act(() => {
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toContain("Thanks for subscribing!");
  });

  it("renders product categories", async () => {
    await renderBlock(createBlock("productCategories"));
    await settle();
    expect(container.textContent).toContain("Electricians");
  });

  it("loads a product into the spotlight", async () => {
    const block = createBlock("productSpotlight");
    (block.props as { productId: string }).productId = "prod1";
    await renderBlock(block);
    await settle();
    expect(container.textContent).toContain("Widget");
    expect(container.querySelector('a[href="/widget"]')).toBeTruthy();
  });

  it("renders an announcement bar", async () => {
    await renderBlock(createBlock("announcement"));
    expect(container.textContent).toContain("Save 20% on annual plans");
    expect(container.textContent).toContain("Learn more");
  });

  it("renders breadcrumbs from the current path", async () => {
    await renderBlock(createBlock("breadcrumbs"));
    await settle();
    expect(container.textContent).toContain("Home");
  });

  it("renders social links", async () => {
    await renderBlock(createBlock("socialLinks"));
    expect(container.querySelectorAll('[data-lp-el="item"]').length).toBe(4);
    expect(container.querySelector('a[aria-label="facebook"]')).toBeTruthy();
  });

  it("renders a countdown timer with day/hour cells", async () => {
    const block = createBlock("countdown");
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    (block.props as { targetDate: string }).targetDate = future;
    await renderBlock(block);
    expect(container.textContent).toContain("Days");
    expect(container.textContent).toContain("Seconds");
  });

  it("renders a gallery when images are set", async () => {
    const block = createBlock("gallery");
    const images = (block.props as { images: Array<{ src: string }> }).images;
    images[0].src = "/a.png";
    images[1].src = "/b.png";
    await renderBlock(block);
    expect(container.querySelectorAll("img").length).toBe(2);
  });

  it("renders steps", async () => {
    await renderBlock(createBlock("steps"));
    expect(container.textContent).toContain("How it works");
    expect(container.textContent).toContain("Compare");
  });

  it("renders a decorative shape divider svg", async () => {
    await renderBlock(createBlock("shapeDivider"));
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.querySelector("path")).toBeTruthy();
  });

  it("emits scoped element styles for styleable parts", async () => {
    const block = createBlock("pricing");
    (block.props as { elementStyles: unknown }).elementStyles = {
      heading: { mobile: { color: "#ff0000" } },
      item: { lg: { backgroundColor: "#000000" } },
    };
    await renderBlock(block);
    const css = Array.from(document.querySelectorAll("style"))
      .map((node) => node.textContent ?? "")
      .join("\n");
    expect(css).toContain(`.pb-${block.id} [data-lp-el="heading"]`);
    expect(css).toContain(`.pb-${block.id} [data-lp-el="item"]`);
    expect(css).toContain("@media (min-width: 1024px)");
    expect(container.querySelector('[data-lp-el="heading"]')).toBeTruthy();
  });
});
