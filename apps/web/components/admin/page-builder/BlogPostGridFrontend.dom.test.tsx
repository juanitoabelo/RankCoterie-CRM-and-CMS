// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import BlogPostGridFrontend from "./BlogPostGridFrontend";
import type { BlogPostGridBlock } from "@/lib/page-builder/types";

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

type Item = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  author: string | null;
  createdAt: string;
  category: { id: string; title: string; slug: string } | null;
};

const CATEGORIES = [
  { id: "cat-one", name: "Blog Test Cat One", slug: "cat-one" },
  { id: "cat-two", name: "Blog Test Cat Two", slug: "cat-two" },
  { id: "cat-three", name: "Blog Test Cat Three", slug: "cat-three" },
];

function post(title: string, categoryId: string, date: string): Item {
  const category = CATEGORIES.find((c) => c.id === categoryId)!;
  return {
    id: `post-${title.toLowerCase().replace(/\s+/g, "-")}`,
    title: `Blog Test ${title}`,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    excerpt: `Excerpt for ${title}.`,
    image: null,
    author: "Blog Test Author",
    createdAt: date,
    category: { id: category.id, title: category.name, slug: category.slug },
  };
}

const ITEMS: Item[] = [
  post("Post Alpha", "cat-one", "2025-01-06T00:00:00.000Z"),
  post("Post Beta", "cat-one", "2025-01-05T00:00:00.000Z"),
  post("Post Gamma", "cat-two", "2025-01-04T00:00:00.000Z"),
  post("Post Delta", "cat-two", "2025-01-03T00:00:00.000Z"),
  post("Post Epsilon", "cat-three", "2025-01-02T00:00:00.000Z"),
  post("Post Zeta", "cat-three", "2025-01-01T00:00:00.000Z"),
];

const requests: string[] = [];

function gridResponse(url: URL) {
  const page = Number(url.searchParams.get("page") || 1);
  const perPage = Number(url.searchParams.get("perPage") || 9);
  const category = url.searchParams.get("category") || "";
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const filterCategories = (url.searchParams.get("filterCategories") || "")
    .split(",")
    .filter(Boolean);

  let items = ITEMS.filter((item) => {
    if (category && item.category?.id !== category) return false;
    if (q && !item.title.toLowerCase().includes(q)) return false;
    return true;
  });

  const order = url.searchParams.get("order");
  const sort = url.searchParams.get("sort") || "desc";
  if (order === "title") {
    items = [...items].sort(
      (a, b) => a.title.localeCompare(b.title) * (sort === "asc" ? 1 : -1),
    );
  } else if (sort === "asc") {
    items = [...items].reverse();
  }

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

const baseProps: BlogPostGridBlock["props"] = {
  heading: "Latest Posts",
  layout: "grid",
  columns: 3,
  columnsDesktop: 3,
  columnsTablet: 2,
  columnsMobile: 1,
  postsPerPage: 4,
  categoryId: "",
  showCategoryFilter: true,
  filterCategories: [],
  showExcerpt: true,
  excerptLength: 150,
  showFeaturedImage: true,
  showAuthor: true,
  showDate: true,
  showCategory: true,
  showPagination: true,
  showSearch: true,
  searchPlaceholder: "Search posts...",
  orderBy: "date",
  sortOrder: "desc",
  cardAnimation: "fadeUp",
  hoverEffect: "lift",
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
  return [...container.querySelectorAll(".bpg-title")].map((el) => el.textContent ?? "");
}

function findButton(label: string): HTMLButtonElement | null {
  return (
    [...container.querySelectorAll("button")].find(
      (btn) => (btn.textContent ?? "").trim() === label,
    ) ?? null
  );
}

function lastGridRequest(): URL {
  const entry = requests.filter((r) => r.includes("/api/blog-grid")).at(-1)!;
  return new URL(entry, "http://localhost");
}

let container: HTMLDivElement;
let root: Root;

describe("BlogPostGridFrontend", () => {
  beforeEach(async () => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    (globalThis as Record<string, unknown>).IntersectionObserver = MockIntersectionObserver;
    requests.length = 0;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      requests.push(url.toString());
      if (url.pathname === "/api/blog-grid") {
        return { ok: true, status: 200, json: async () => gridResponse(url) };
      }
      return { ok: false, status: 404, json: async () => ({ error: "not found" }) };
    }) as unknown as typeof fetch;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<BlogPostGridFrontend props={baseProps} />);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("loads a page of posts and renders the card grid", async () => {
    await settle();
    expect(container.querySelectorAll("[data-bpg-card]").length).toBe(4);
    expect(titles()).toEqual([
      "Blog Test Post Alpha",
      "Blog Test Post Beta",
      "Blog Test Post Gamma",
      "Blog Test Post Delta",
    ]);
    expect(container.querySelector("h2")?.textContent).toBe("Latest Posts");
    expect(container.textContent).toContain("6 posts");
    expect(container.querySelectorAll(".bpg-pill").length).toBe(4);
    expect(container.querySelector(".bpg-category")?.textContent).toBe("Blog Test Cat One");
    expect(container.querySelector(".bpg-excerpt")?.textContent).toContain("Excerpt for");
    expect(container.textContent).toContain("Blog Test Author");
    expect(container.querySelectorAll(".pg-cart-btn").length).toBe(0);

    const card = container.querySelector("[data-bpg-card]");
    expect(card?.className).toContain("bpg-anim-fadeUp");
    expect(card?.className).toContain("bpg-hover-lift");

    const request = lastGridRequest();
    expect(request.searchParams.get("perPage")).toBe("4");
    expect(request.searchParams.get("order")).toBe("date");
    expect(request.searchParams.get("sort")).toBe("desc");
    expect(request.searchParams.get("category")).toBe("");
    expect(container.querySelector(".bpg-skeleton")).toBeNull();
  });

  it("paginates with the Next button", async () => {
    await settle();
    const next = findButton("Next →");
    expect(next).toBeTruthy();
    expect(next!.disabled).toBe(false);
    click(next);
    await settle();
    expect(lastGridRequest().searchParams.get("page")).toBe("2");
    expect(titles()).toEqual(["Blog Test Post Epsilon", "Blog Test Post Zeta"]);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("2");
    expect(findButton("← Prev")).toBeTruthy();
  });

  it("filters by category from the pill bar", async () => {
    await settle();
    click(findButton("Blog Test Cat Two"));
    await settle();
    expect(lastGridRequest().searchParams.get("category")).toBe("cat-two");
    expect(container.querySelectorAll("[data-bpg-card]").length).toBe(2);
    expect(titles().every((title) => title.includes("Gamma") || title.includes("Delta"))).toBe(true);
    expect(container.textContent).toContain("2 posts");
    expect(findButton("Blog Test Cat Two")?.className).toContain("is-active");
    expect(findButton("All")?.className).not.toContain("is-active");
  });

  it("searches after the debounce and shows an empty state", async () => {
    await settle();
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute("placeholder")).toBe("Search posts...");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "zzzz-no-match");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle(700);
    expect(lastGridRequest().searchParams.get("q")).toBe("zzzz-no-match");
    expect(container.textContent).toContain("No posts match your filters.");
    expect(container.textContent).toContain("0 posts");
    expect(container.querySelectorAll("[data-bpg-card]").length).toBe(0);
  });

  it("changes sort order from the toolbar", async () => {
    await settle();
    const select = container.querySelector('select[aria-label="Sort posts"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
    act(() => {
      setter.call(select, "Oldest first");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settle();
    const request = lastGridRequest();
    expect(request.searchParams.get("order")).toBe("date");
    expect(request.searchParams.get("sort")).toBe("asc");
    expect(titles()[0]).toBe("Blog Test Post Zeta");
  });
});
