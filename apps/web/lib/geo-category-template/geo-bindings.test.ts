import { describe, expect, it } from "vitest";
import { createBlock } from "@/lib/page-builder/types";
import {
  geoBindingFieldsForTarget,
  geoBindingTargets,
  resolveGeoBindingValue,
  resolveGeoBlockBindings,
  type GeoBindingData,
} from "./geo-bindings";

const GEO: GeoBindingData = {
  category: {
    title: "Wilderness Therapy Programs",
    slug: "wilderness-therapy",
    description: "<p>Dynamic category description</p>",
    metaDesc: "Meta description text",
    seoTitle: "SEO title text",
  },
  categoryUrl: "/g/wilderness-therapy/",
  heroImage: "/api/assets/primary-asset",
  heroImageAlt: "Trailhead at dawn",
  heroImageCaption: "Caption for the hero",
  statesCount: 12,
  region: { state: "TX", stateFull: "Texas", displayName: "Texas", url: "/g/wilderness-therapy/texas/" },
};

describe("geo category template bindings", () => {
  it("resolves safe geo paths, including nested and computed fields", () => {
    expect(resolveGeoBindingValue(GEO, "category.title")).toBe("Wilderness Therapy Programs");
    expect(resolveGeoBindingValue(GEO, "heroImage")).toBe("/api/assets/primary-asset");
    expect(resolveGeoBindingValue(GEO, "heroImageAlt")).toBe("Trailhead at dawn");
    expect(resolveGeoBindingValue(GEO, "region.stateFull")).toBe("Texas");
    expect(resolveGeoBindingValue(GEO, "statesCount")).toBe("12");
    expect(resolveGeoBindingValue(GEO, "categoryUrl")).toBe("/g/wilderness-therapy/");
    expect(resolveGeoBindingValue({ category: { slug: " christian-schools " } }, "categoryUrl")).toBe(
      "/g/ christian-schools /",
    );
    expect(resolveGeoBindingValue(GEO, "__proto__.polluted")).toBeNull();
    expect(resolveGeoBindingValue(GEO, "category.missing")).toBeNull();
  });

  it("computes categoryUrl from the category slug when not provided directly", () => {
    expect(resolveGeoBindingValue({ category: { slug: "christian-boarding-schools" } }, "categoryUrl")).toBe(
      "/g/christian-boarding-schools/",
    );
    expect(resolveGeoBindingValue({}, "categoryUrl")).toBeNull();
  });

  it("filters geo fields to the value type accepted by a target", () => {
    expect(geoBindingFieldsForTarget("image").map((field) => field.key)).toContain("heroImage");
    expect(geoBindingFieldsForTarget("text").map((field) => field.key)).not.toContain("heroImage");
    expect(geoBindingFieldsForTarget("richText").map((field) => field.key)).toContain("category.description");
    expect(geoBindingFieldsForTarget("url").map((field) => field.key)).toContain("categoryUrl");
  });

  it("exposes binding targets for geo and standard blocks", () => {
    expect(geoBindingTargets("geoHero").map((t) => t.key)).toEqual(
      expect.arrayContaining(["heading", "subheading", "image"]),
    );
    expect(geoBindingTargets("geoListings").map((t) => t.key)).toContain("heading");
    expect(geoBindingTargets("heading").map((t) => t.key)).toContain("text");
    expect(geoBindingTargets("unknown-block")).toEqual([]);
  });

  it("overrides bound block properties and leaves unbound static values unchanged", () => {
    const block = createBlock("image");
    const configured = {
      ...block,
      props: {
        ...(block.props as Record<string, unknown>),
        src: "/static/image.jpg",
        alt: "Static alt",
        bindings: { src: "heroImage", alt: "heroImageAlt" },
      },
    } as unknown as typeof block;

    const result = resolveGeoBlockBindings(configured, GEO);
    const props = result.props as Record<string, unknown>;
    expect(props.src).toBe("/api/assets/primary-asset");
    expect(props.alt).toBe("Trailhead at dawn");
    expect(props.caption).toBe("");
  });

  it("keeps static fallback content when a geo field is empty", () => {
    const block = createBlock("text");
    const configured = {
      ...block,
      props: {
        ...(block.props as Record<string, unknown>),
        content: "<p>Static fallback</p>",
        bindings: { content: "category.description" },
      },
    } as unknown as typeof block;

    const result = resolveGeoBlockBindings(configured, { category: { description: "" } });
    expect((result.props as Record<string, unknown>).content).toBe("<p>Static fallback</p>");
  });

  it("resolves nothing when no geo data is supplied", () => {
    const block = createBlock("heading");
    const configured = {
      ...block,
      props: {
        ...(block.props as Record<string, unknown>),
        text: "Static",
        bindings: { text: "category.title" },
      },
    } as unknown as typeof block;

    expect(resolveGeoBlockBindings(configured, undefined)).toBe(configured);
  });

  it("sanitizes rich HTML and rejects unsafe bound URLs", () => {
    const textBlock = createBlock("text");
    const configuredText = {
      ...textBlock,
      props: {
        ...(textBlock.props as Record<string, unknown>),
        content: "fallback",
        bindings: { content: "category.description" },
      },
    } as unknown as typeof textBlock;
    const sanitizedText = resolveGeoBlockBindings(configuredText, {
      category: { description: '<p>Safe</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>' },
    });
    const sanitizedProps = sanitizedText.props as Record<string, unknown>;
    expect(String(sanitizedProps.content)).not.toContain("<script>");
    expect(String(sanitizedProps.content)).not.toContain("javascript:");

    const button = createBlock("button");
    const configuredButton = {
      ...button,
      props: {
        ...(button.props as Record<string, unknown>),
        url: "/fallback",
        bindings: { url: "categoryUrl" },
      },
    } as unknown as typeof button;
    const unsafe = resolveGeoBlockBindings(configuredButton, { categoryUrl: "javascript:alert(1)" });
    expect((unsafe.props as Record<string, unknown>).url).toBe("/fallback");
  });
});
