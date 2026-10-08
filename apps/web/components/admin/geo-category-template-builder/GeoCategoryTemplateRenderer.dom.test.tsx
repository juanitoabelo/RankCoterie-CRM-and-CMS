// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type { Block } from "@/lib/page-builder/types";
import { createGeoCategoryTemplateBlock } from "@/lib/geo-category-template/types";
import type { GeoBindingData } from "@/lib/geo-category-template/geo-bindings";
import GeoCategoryTemplateRenderer, {
  type GeoCityLink,
  type GeoStateLink,
  type GeoTemplateListing,
} from "./GeoCategoryTemplateRenderer";

const { navState, mockPush } = vi.hoisted(() => ({
  navState: { params: new URLSearchParams("") },
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => navState.params,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: unknown;
    children?: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const GEO: GeoBindingData = {
  category: { title: "Wilderness Therapy Programs", slug: "wilderness-therapy" },
  region: { slug: "Texas-TX", state: "TX", stateFull: "Texas", displayName: "Texas" },
  categoryUrl: "/g/wilderness-therapy/Texas-TX/",
  listingsCount: 3,
};

const CITIES: GeoCityLink[] = [
  { slug: "Austin-TX", name: "Austin", url: "/g/wilderness-therapy/Austin-TX/" },
  { slug: "Dallas-TX", name: "Dallas", url: "/g/wilderness-therapy/Dallas-TX/" },
];

const LISTINGS: GeoTemplateListing[] = [
  { id: "l1", title: "Program One", slug: "program-one", href: "#", city: "Austin", state: "TX", summary: "One." },
  { id: "l2", title: "Program Two", slug: "program-two", href: "#", city: "Dallas", state: "TX", summary: "Two." },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function cleanup() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

function render(props: Partial<React.ComponentProps<typeof GeoCategoryTemplateRenderer>>) {
  cleanup();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<GeoCategoryTemplateRenderer blocks={(props.blocks ?? []) as Block[]} {...props} />);
  });
  return container;
}

afterEach(() => {
  cleanup();
  navState.params = new URLSearchParams("");
});

function block(type: string, props: Record<string, unknown> = {}) {
  const created = createGeoCategoryTemplateBlock(type as never);
  return { ...created, props: { ...created.props, ...props } } as unknown as Block;
}

describe("GeoRegionChipsRenderer", () => {
  it("renders the auto heading and city links from context", () => {
    const el = render({
      blocks: [block("geoRegionChips")],
      geo: GEO,
      cities: CITIES,
    });
    expect(el.textContent).toContain("Cities in Texas");
    const links = Array.from(el.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/g/wilderness-therapy/Austin-TX/",
      "/g/wilderness-therapy/Dallas-TX/",
    ]);
    expect(links.map((a) => a.textContent)).toEqual(["Austin", "Dallas"]);
  });

  it("honors a custom heading and the showHeading toggle", () => {
    const custom = render({
      blocks: [block("geoRegionChips", { heading: "Where to go" })],
      geo: GEO,
      cities: CITIES,
    });
    expect(custom.textContent).toContain("Where to go");

    const hidden = render({
      blocks: [block("geoRegionChips", { showHeading: false })],
      geo: GEO,
      cities: CITIES,
    });
    expect(hidden.textContent).not.toContain("Cities in Texas");
    expect(hidden.querySelectorAll("a")).toHaveLength(2);
  });

  it("renders nothing without city links", () => {
    const el = render({ blocks: [block("geoRegionChips")], geo: GEO, cities: [] });
    expect(el.querySelector("a")).toBeNull();
    expect(el.textContent).not.toContain("Cities in");
  });
});

describe("GeoFilterBarRenderer", () => {
  it("renders the filter bar on region pages with the current search params", () => {
    navState.params = new URLSearchParams("sort=rating&tier=PREMIUM");
    const el = render({ blocks: [block("geoFilterBar")], geo: GEO });
    const selects = Array.from(el.querySelectorAll("select"));
    expect(selects).toHaveLength(3);
    expect(selects[0].value).toBe("rating");
    expect(selects[1].value).toBe("PREMIUM");
    expect(el.textContent).toContain("Sort:");
  });

  it("renders nothing on category pages (no bound region)", () => {
    const el = render({
      blocks: [block("geoFilterBar")],
      geo: { category: GEO.category, categoryUrl: "/g/wilderness-therapy/" },
    });
    expect(el.querySelector("select")).toBeNull();
  });
});

describe("GeoListingsRenderer", () => {
  it("shows the total count next to the heading when enabled", () => {
    const el = render({
      blocks: [block("geoListings", { showCount: true })],
      geo: GEO,
      listings: LISTINGS,
    });
    expect(el.textContent).toContain("Featured programs");
    expect(el.textContent).toContain("(3)");
  });

  it("falls back to a Listings heading when only the count is enabled", () => {
    const el = render({
      blocks: [block("geoListings", { showCount: true, heading: "" })],
      geo: GEO,
      listings: LISTINGS,
    });
    expect(el.textContent).toContain("Listings");
    expect(el.textContent).toContain("(3)");
  });

  it("keeps the heading-only mode when the count is disabled", () => {
    const el = render({
      blocks: [block("geoListings", { heading: "Featured programs" })],
      geo: GEO,
      listings: LISTINGS,
    });
    expect(el.textContent).toContain("Featured programs");
    expect(el.textContent).not.toContain("(3)");
  });

  it("shows the empty message instead of hiding when configured", () => {
    const withMessage = render({
      blocks: [block("geoListings", { emptyMessage: "No listings yet." })],
      geo: GEO,
      listings: [],
    });
    expect(withMessage.textContent).toContain("No listings yet.");

    const withoutMessage = render({
      blocks: [block("geoListings")],
      geo: GEO,
      listings: [],
    });
    expect(withoutMessage.textContent).not.toContain("No listings yet.");
    expect(withoutMessage.querySelector("h2")).toBeNull();
  });
});

describe("GeoRegionNavRenderer", () => {
  const states: GeoStateLink[] = [
    { slug: "Texas-TX", state: "TX", stateFull: "Texas", url: "/g/wilderness-therapy/Texas-TX/" },
  ];

  it("renders state links when states are present", () => {
    const el = render({ blocks: [block("geoRegionNav")], states });
    expect(el.querySelector("a")?.getAttribute("href")).toBe("/g/wilderness-therapy/Texas-TX/");
  });

  it("shows the empty message instead of hiding when configured", () => {
    const withMessage = render({
      blocks: [block("geoRegionNav", { emptyMessage: "No state links yet." })],
      states: [],
    });
    expect(withMessage.textContent).toContain("No state links yet.");

    const withoutMessage = render({ blocks: [block("geoRegionNav")], states: [] });
    expect(withoutMessage.textContent).not.toContain("No state links yet.");
    expect(withoutMessage.querySelector("h2")).toBeNull();
  });
});
