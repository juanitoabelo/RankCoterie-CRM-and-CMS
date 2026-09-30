// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import ProductGridFrontend from "./ProductGridFrontend";
import type { ProductGridBlock } from "@/lib/page-builder/types";

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

type Item = {
  id: string;
  name: string;
  slug: string;
  excerpt: string | null;
  price: number;
  regularPrice: number;
  onSale: boolean;
  imageAssetId: string | null;
  rating: number;
  reviewCount: number;
  stockStatus: string;
  featured: boolean;
  categories: { id: string; name: string; slug: string }[];
};

const CATEGORIES = [
  { id: "cat-apparel", name: "Grid Test Apparel", slug: "apparel", parentId: null },
  { id: "cat-gear", name: "Grid Test Gear", slug: "gear", parentId: null },
  { id: "cat-home", name: "Grid Test Home", slug: "home", parentId: null },
];

function item(
  name: string,
  categoryId: string,
  price: number,
  options: Partial<Item> = {},
): Item {
  const category = CATEGORIES.find((c) => c.id === categoryId)!;
  return {
    id: `prod-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name: `Grid Test ${name}`,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    excerpt: `Short blurb for ${name} with markup.`,
    price,
    regularPrice: price,
    onSale: false,
    imageAssetId: "asset-1",
    rating: 4,
    reviewCount: 5,
    stockStatus: "IN_STOCK",
    featured: false,
    categories: [{ id: category.id, name: category.name, slug: category.slug }],
    ...options,
  };
}

const ITEMS: Item[] = [
  item("Apparel Five", "cat-apparel", 49.99),
  item("Apparel Four", "cat-apparel", 39.99),
  item("Apparel One", "cat-apparel", 9.99),
  item("Apparel Three", "cat-apparel", 29.99),
  item("Apparel Two", "cat-apparel", 13.99, { regularPrice: 19.99, onSale: true }),
  item("Gear Four", "cat-gear", 89.99),
  item("Gear One", "cat-gear", 41.99, { regularPrice: 59.99, onSale: true }),
  item("Gear Three", "cat-gear", 79.99),
  item("Gear Two", "cat-gear", 69.99),
  item("Home One", "cat-home", 69.99, { regularPrice: 99.99, onSale: true }),
  item("Home Three", "cat-home", 119.99, { stockStatus: "OUT_OF_STOCK" }),
  item("Home Two", "cat-home", 109.99),
];

const requests: string[] = [];

function gridResponse(url: URL) {
  const page = Number(url.searchParams.get("page") || 1);
  const perPage = Number(url.searchParams.get("perPage") || 9);
  const category = url.searchParams.get("category") || "";
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const minPrice = Number(url.searchParams.get("minPrice") || 0);
  const maxPrice = Number(url.searchParams.get("maxPrice") || 0);
  const inStockOnly = url.searchParams.get("inStock") === "1";
  const filterCategories = (url.searchParams.get("filterCategories") || "")
    .split(",")
    .filter(Boolean);

  let items = ITEMS.filter((product) => {
    if (category && !product.categories.some((c) => c.id === category)) return false;
    if (q && !product.name.toLowerCase().includes(q)) return false;
    if (inStockOnly && product.stockStatus === "OUT_OF_STOCK") return false;
    if (minPrice && product.price < minPrice) return false;
    if (maxPrice && product.price > maxPrice) return false;
    return true;
  });

  const order = url.searchParams.get("order");
  const sort = url.searchParams.get("sort") || "desc";
  const dir = sort === "asc" ? 1 : -1;
  if (order === "name") items = [...items].sort((a, b) => a.name.localeCompare(b.name) * dir);
  if (order === "price") items = [...items].sort((a, b) => (a.price - b.price) * dir);

  const categories = filterCategories.length
    ? CATEGORIES.filter((c) => filterCategories.includes(c.id))
    : CATEGORIES;

  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    page,
    perPage,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / perPage)),
    categories,
  };
}

const baseProps: ProductGridBlock["props"] = {
  heading: "Shop the collection",
  columnsDesktop: 3,
  columnsTablet: 2,
  columnsMobile: 1,
  productsPerPage: 4,
  categoryId: "",
  layout: "grid",
  showCategoryFilter: true,
  filterCategories: [],
  showExcerpt: true,
  excerptLength: 150,
  showFeaturedImage: true,
  showPrice: true,
  showRating: true,
  showAddToCart: true,
  showWishlist: true,
  showCategory: true,
  showPagination: true,
  orderBy: "name",
  sortOrder: "asc",
  cardAnimation: "fadeUp",
  hoverEffect: "lift",
  filterAttributes: {},
  minPrice: 0,
  maxPrice: 0,
  inStockOnly: false,
  showSearch: true,
  searchPlaceholder: "Search products...",
  cardStyle: "shadow",
  imageAspect: "16:9",
};

async function settle(ms = 450) {
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

function titles(): string[] {
  return [...container.querySelectorAll(".pg-title")].map((el) => el.textContent ?? "");
}

function findButton(label: string): HTMLButtonElement | null {
  return (
    [...container.querySelectorAll("button")].find(
      (btn) => (btn.textContent ?? "").trim() === label,
    ) ?? null
  );
}

function lastGridRequest(): URL {
  const entry = requests.filter((r) => r.includes("/api/product-grid")).at(-1)!;
  return new URL(entry, "http://localhost");
}

let container: HTMLDivElement;
let root: Root;

describe("ProductGridFrontend", () => {
  beforeEach(async () => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    (globalThis as Record<string, unknown>).IntersectionObserver = MockIntersectionObserver;
    window.localStorage.clear();
    requests.length = 0;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      requests.push(url.toString());
      if (url.pathname === "/api/product-grid") {
        return { ok: true, status: 200, json: async () => gridResponse(url) };
      }
      if (url.pathname === "/api/cart") {
        return { ok: true, status: 200, json: async () => ({ ok: true, itemCount: 3 }) };
      }
      return { ok: false, status: 404, json: async () => ({ error: "not found" }) };
    }) as unknown as typeof fetch;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<ProductGridFrontend props={baseProps} />);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("loads a page of products and renders the card grid", async () => {
    await settle();
    expect(container.querySelectorAll("[data-pg-card]").length).toBe(4);
    expect(titles()).toEqual([
      "Grid Test Apparel Five",
      "Grid Test Apparel Four",
      "Grid Test Apparel One",
      "Grid Test Apparel Three",
    ]);
    expect(container.querySelector("h2")?.textContent).toBe("Shop the collection");
    expect(container.textContent).toContain("12 products");
    expect(container.querySelectorAll(".pg-pill").length).toBe(4);
    expect(container.querySelectorAll(".pg-cart-btn").length).toBe(4);
    expect(container.querySelectorAll(".pg-wishlist").length).toBe(4);
    expect(container.querySelector(".pg-skeleton")).toBeNull();
    expect(container.querySelector(".pg-price")?.textContent).toMatch(/\$\d/);
    expect(container.querySelector(".pg-excerpt")?.textContent).toContain("Short blurb");

    const request = lastGridRequest();
    expect(request.searchParams.get("perPage")).toBe("4");
    expect(request.searchParams.get("order")).toBe("name");
    expect(request.searchParams.get("sort")).toBe("asc");
    expect(request.searchParams.get("category")).toBe("");
  });

  it("paginates with the Next button", async () => {
    await settle();
    const next = findButton("Next →");
    expect(next).toBeTruthy();
    expect(next!.disabled).toBe(false);
    click(next);
    await settle();
    expect(lastGridRequest().searchParams.get("page")).toBe("2");
    expect(titles()[0]).toBe("Grid Test Apparel Two");
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("2");
    expect(findButton("← Prev")).toBeTruthy();
  });

  it("filters by category from the pill bar", async () => {
    await settle();
    click(findButton("Grid Test Gear"));
    await settle();
    expect(lastGridRequest().searchParams.get("category")).toBe("cat-gear");
    expect(container.querySelectorAll("[data-pg-card]").length).toBe(4);
    expect(titles().every((title) => title.startsWith("Grid Test Gear"))).toBe(true);
    expect(container.textContent).toContain("4 products");
    expect(findButton("Grid Test Gear")?.className).toContain("is-active");
    expect(findButton("All")?.className).not.toContain("is-active");
  });

  it("searches after the debounce and shows an empty state", async () => {
    await settle();
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "zzzz-no-match");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle(700);
    expect(lastGridRequest().searchParams.get("q")).toBe("zzzz-no-match");
    expect(container.textContent).toContain("No products match your filters.");
    expect(container.textContent).toContain("0 products");
    expect(container.querySelectorAll("[data-pg-card]").length).toBe(0);
  });

  it("changes sort order from the toolbar", async () => {
    await settle();
    const select = container.querySelector("select") as HTMLSelectElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
    act(() => {
      setter.call(select, "Price: high to low");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settle();
    const request = lastGridRequest();
    expect(request.searchParams.get("order")).toBe("price");
    expect(request.searchParams.get("sort")).toBe("desc");
    expect(titles()[0]).toBe("Grid Test Home Three");
  });

  it("adds a product to the cart and confirms", async () => {
    await settle();
    const buttons = [...container.querySelectorAll(".pg-cart-btn")];
    expect(buttons.length).toBe(4);
    click(buttons[0]);
    await settle(900);
    const cartCall = requests.find((r) => r.includes("/api/cart"));
    expect(cartCall).toBeTruthy();
    expect(buttons[0].textContent).toContain("Added to cart");
    expect(buttons[0].className).toContain("is-added");
  });

  it("toggles the wishlist heart and persists it", async () => {
    await settle();
    const heart = container.querySelector(".pg-wishlist") as HTMLButtonElement;
    expect(heart).toBeTruthy();
    expect(heart.getAttribute("aria-pressed")).toBe("false");
    click(heart);
    await settle();
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    expect(JSON.parse(window.localStorage.getItem("canopy:wishlist") ?? "[]")).toHaveLength(1);
    click(heart);
    await settle();
    expect(JSON.parse(window.localStorage.getItem("canopy:wishlist") ?? "[]")).toHaveLength(0);
  });

  it("renders masonry layout and applies price and stock filters", async () => {
    await act(async () => {
      root.unmount();
      container.innerHTML = "";
      root = createRoot(container);
      root.render(
        <ProductGridFrontend
          props={{
            ...baseProps,
            layout: "isotope",
            showCategoryFilter: false,
            showSearch: false,
            showWishlist: false,
            inStockOnly: true,
            minPrice: 100,
            productsPerPage: 12,
          }}
        />,
      );
    });
    await settle();
    expect(container.querySelector(".pg-grid-isotope")).toBeTruthy();
    expect(container.querySelectorAll("[data-pg-card]").length).toBe(1);
    expect(container.textContent).toContain("1 product");
    const request = lastGridRequest();
    expect(request.searchParams.get("inStock")).toBe("1");
    expect(request.searchParams.get("minPrice")).toBe("100");
    const price = parseFloat(
      (container.querySelector(".pg-price")?.textContent ?? "0").replace(/[^0-9.]/g, ""),
    );
    expect(price).toBeGreaterThanOrEqual(100);
    expect(titles()).toEqual(["Grid Test Home Two"]);
  });

  it("respects the single-category block setting", async () => {
    await act(async () => {
      root.unmount();
      container.innerHTML = "";
      root = createRoot(container);
      root.render(
        <ProductGridFrontend props={{ ...baseProps, categoryId: "cat-gear", showCategoryFilter: false }} />,
      );
    });
    await settle();
    expect(lastGridRequest().searchParams.get("category")).toBe("cat-gear");
    expect(container.textContent).toContain("4 products");
    expect(titles().every((title) => title.startsWith("Grid Test Gear"))).toBe(true);
  });
});
