import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

function renderNode(node: React.ReactNode): string {
  return renderToStaticMarkup(createElement(Fragment, null, node));
}
import {
  elementSelector,
  elementStylesNode,
  ELEMENT_DEVICES,
  renderElementStyles,
  type ElementStyles,
  type StyleElementSchema,
} from "./element-style";
import { getGeoBlockStyleSchema, GEO_BLOCK_STYLE_SCHEMAS } from "@/lib/geo-category-template/style-schema";
import { getListingBlockStyleSchema, LISTING_BLOCK_STYLE_SCHEMAS } from "@/lib/listing-templates/style-schema";
import { getBlogBlockStyleSchema, BLOG_BLOCK_STYLE_SCHEMAS } from "@/lib/blog-template/style-schema";
import { getStandardBlockStyleSchema, STANDARD_BLOCK_STYLE_SCHEMAS, SHARED_BLOCK_STYLE_SCHEMAS } from "./standard-style-schemas";
import { getBlockStyleSchema } from "./style-schema";

describe("elementSelector", () => {
  it("targets the scope class itself for the container element", () => {
    expect(elementSelector("b1", "container")).toBe(".pb-b1");
  });

  it("targets tagged descendants for every other element", () => {
    expect(elementSelector("b1", "heading")).toBe('.pb-b1 [data-lp-el="heading"]');
  });

  it("sanitizes ids that contain characters invalid in a class/selector", () => {
    expect(elementSelector("a b/c", "container")).toBe(".pb-abc");
    expect(elementSelector("a b/c", "x y")).toBe('.pb-abc [data-lp-el="xy"]');
  });
});

describe("renderElementStyles", () => {
  it("returns an empty string when nothing is configured", () => {
    expect(renderElementStyles("b1", undefined)).toBe("");
    expect(renderElementStyles("b1", {})).toBe("");
    expect(renderElementStyles("b1", { heading: {} })).toBe("");
  });

  it("emits a mobile base rule and min-width media queries for larger devices", () => {
    const styles: ElementStyles = {
      heading: {
        mobile: { color: "#111111" },
        md: { color: "#222222" },
      },
    };
    const css = renderElementStyles("b1", styles);
    expect(css).toContain('.pb-b1 [data-lp-el="heading"], .pb-b1 [data-lp-el="heading"] * { color: #111111 !important }');
    expect(css).toContain('@media (min-width: 768px) { .pb-b1 [data-lp-el="heading"], .pb-b1 [data-lp-el="heading"] * { color: #222222 !important } }');
    // mobile base must come before the responsive override
    expect(css.indexOf("#111111")).toBeLessThan(css.indexOf("#222222"));
  });

  it("cascades typography to descendants so inner utility styles can be overridden", () => {
    const css = renderElementStyles("b1", { item: { mobile: { color: "#111111", fontWeight: "700" } } });
    expect(css).toContain('.pb-b1 [data-lp-el="item"], .pb-b1 [data-lp-el="item"] *');
  });

  it("keeps box/background/border properties on the tagged node only", () => {
    const css = renderElementStyles("b1", { item: { mobile: { paddingTop: 12, backgroundColor: "#000000" } } });
    expect(css).toContain('.pb-b1 [data-lp-el="item"] {');
    expect(css).not.toContain('.pb-b1 [data-lp-el="item"] *');
  });

  it("splits box and typography rules for the same element", () => {
    const css = renderElementStyles("b1", { item: { mobile: { color: "#111111", paddingTop: 12 } } });
    expect(css).toContain('.pb-b1 [data-lp-el="item"] { padding-top: 12px !important }');
    expect(css).toContain('.pb-b1 [data-lp-el="item"], .pb-b1 [data-lp-el="item"] * { color: #111111 !important }');
  });

  it("emits min-width media queries for every device with a minWidth > 0", () => {
    const styles: ElementStyles = { title: { lg: { fontSize: 40 } } };
    const css = renderElementStyles("b1", styles);
    const lg = ELEMENT_DEVICES.find((d) => d.key === "lg")!;
    expect(css).toContain(`@media (min-width: ${lg.minWidth}px)`);
  });

  it("folds fontSizeUnit into the fontSize and defaults to px", () => {
    expect(renderElementStyles("b1", { title: { mobile: { fontSize: 24 } } })).toContain(
      "font-size: 24px !important",
    );
    expect(
      renderElementStyles("b1", { title: { mobile: { fontSize: 2, fontSizeUnit: "rem" } } }),
    ).toContain("font-size: 2rem !important");
  });

  it("wraps bare background images in url() but leaves gradients/url()/var() alone", () => {
    expect(
      renderElementStyles("b1", { container: { mobile: { backgroundImage: "https://x/y.jpg" } } }),
    ).toContain("background-image: url(https://x/y.jpg) !important");
    expect(
      renderElementStyles("b1", { container: { mobile: { backgroundImage: "linear-gradient(#000,#fff)" } } }),
    ).toContain("background-image: linear-gradient(#000,#fff) !important");
  });

  it("treats numeric unitless properties as unitless and length properties as px", () => {
    const css = renderElementStyles("b1", {
      item: { mobile: { lineHeight: 1.5, paddingTop: 12, gap: 8 } },
    });
    expect(css).toContain("line-height: 1.5 !important");
    expect(css).toContain("padding-top: 12px !important");
    expect(css).toContain("gap: 8px !important");
  });
});

describe("elementStylesNode", () => {
  it("returns null when there is nothing to emit", () => {
    expect(elementStylesNode("b1", undefined)).toBeNull();
    expect(elementStylesNode("b1", { heading: {} })).toBeNull();
  });

  it("renders a hoisted style node carrying the scoped rule", () => {
    const markup = renderNode(elementStylesNode("b1", { heading: { mobile: { color: "#ff0000" } } }));
    expect(markup).toContain("precedence");
    expect(markup).toContain('.pb-b1 [data-lp-el="heading"], .pb-b1 [data-lp-el="heading"] * { color: #ff0000 !important }');
  });

  // Regression: React dedupes hoisted styles by `href` and never updates a
  // stylesheet it has already seen. A stable href froze the first value set on
  // an element, so later edits silently did not apply. The href must change
  // whenever the CSS changes.
  it("content-addresses the href so edited styles get a fresh stylesheet", () => {
    const first = renderNode(elementStylesNode("b1", { heading: { mobile: { color: "#ff0000" } } }));
    const second = renderNode(elementStylesNode("b1", { heading: { mobile: { color: "#00ff00" } } }));
    const href = (markup: string) => markup.match(/href="([^"]+)"/)?.[1];
    expect(href(first)).toBeTruthy();
    expect(href(first)).not.toBe(href(second));
  });

  it("reuses the href for identical css so dedup still works", () => {
    const a = renderNode(elementStylesNode("b1", { heading: { mobile: { color: "#ff0000" } } }));
    const b = renderNode(elementStylesNode("b1", { heading: { mobile: { color: "#ff0000" } } }));
    expect(a).toBe(b);
  });
});

/* ── Schema ↔ renderer tag coverage ────────────────────────────────────────────
 * Every element declared in a block's Style schema must be tagged somewhere in
 * the renderers, otherwise the Style tab would show controls that do nothing.
 * The listing/geo renderers are components, but the tag check is a plain source
 * scan so it stays cheap and future-proof.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "../..");

function readSource(relative: string): string {
  return readFileSync(resolve(webRoot, relative), "utf8");
}

function taggedKeys(source: string): Set<string> {
  const keys = new Set<string>();
  for (const match of source.matchAll(/data-lp-el="([a-zA-Z0-9_-]+)"/g)) keys.add(match[1]);
  return keys;
}

function elementKeys(schema: { elements: StyleElementSchema[] }): string[] {
  return schema.elements.map((e) => e.key).filter((k) => k !== "container");
}

describe("listing block style schemas match renderer tags", () => {
  const tagged = taggedKeys(
    readSource("components/site/listing/ListingTemplateTreeRenderer.tsx") +
      readSource("components/site/listing/ListingTemplateRenderer.tsx") +
      readSource("components/site/listing/parts.tsx"),
  );

  for (const [blockType, schema] of Object.entries(LISTING_BLOCK_STYLE_SCHEMAS)) {
    it(`${blockType} tags every styleable element`, () => {
      const missing = elementKeys(schema).filter((key) => !tagged.has(key));
      expect(missing, `untagged elements for ${blockType}: ${missing.join(", ")}`).toEqual([]);
    });
  }

  it("resolves schemas through getListingBlockStyleSchema", () => {
    expect(getListingBlockStyleSchema("listingHero")).toBe(LISTING_BLOCK_STYLE_SCHEMAS.listingHero);
    expect(getListingBlockStyleSchema("nope")).toBeUndefined();
  });
});

describe("geo block style schemas match renderer tags", () => {
  const tagged = taggedKeys(
    readSource("components/admin/geo-category-template-builder/GeoCategoryTemplateRenderer.tsx"),
  );

  for (const [blockType, schema] of Object.entries(GEO_BLOCK_STYLE_SCHEMAS)) {
    it(`${blockType} tags every styleable element`, () => {
      const missing = elementKeys(schema).filter((key) => !tagged.has(key));
      expect(missing, `untagged elements for ${blockType}: ${missing.join(", ")}`).toEqual([]);
    });
  }

  it("resolves schemas through getGeoBlockStyleSchema", () => {
    expect(getGeoBlockStyleSchema("geoHero")).toBe(GEO_BLOCK_STYLE_SCHEMAS.geoHero);
    expect(getGeoBlockStyleSchema("nope")).toBeUndefined();
  });
});

/* ── Blog / standard renderer coverage ─────────────────────────────────────────
 * The blog template renderer is a single file that hosts both the blog-specific
 * blocks (blogSidebar, articleContent, …) and the standard blocks (hero, cta, …)
 * reused across builders. A whole-file tag scan would let one block's tags
 * satisfy another block's schema, so we scope the check to each renderer
 * function body.
 */

function rendererBody(source: string, fnName: string): string {
  const start = source.indexOf(`function ${fnName}(`);
  if (start === -1) return "";
  const rest = source.slice(start + 1);
  const nextFn = rest.search(/\nfunction [A-Za-z]/);
  return nextFn === -1 ? rest : rest.slice(0, nextFn);
}

// Blocks whose markup lives in a shared component (not inline in the renderer).
const DELEGATED_BLOCK_COMPONENTS: Array<{ blockType: string; file: string }> = [
  { blockType: "slider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "contentGrid", file: "components/admin/page-builder/ContentGridFrontend.tsx" },
  { blockType: "blogArticleSlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "productSlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "listingSlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "companySlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "geoCategorySlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "sectionSlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "topicSubTopicSlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "imageSlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
  { blockType: "videoSlider", file: "components/admin/page-builder/SliderCarousel.tsx" },
];
// Content-slider blocks are validated by the delegated check (shared carousel), not here.
const CONTENT_SLIDER_TYPES = new Set([
  "blogArticleSlider",
  "productSlider",
  "listingSlider",
  "companySlider",
  "geoCategorySlider",
  "sectionSlider",
  "topicSubTopicSlider",
  "imageSlider",
  "videoSlider",
]);

const BLOG_BLOCK_RENDERERS: Record<string, string> = {
  blogPostGrid: "BlogPostGridRenderer",
  blogSidebar: "BlogSidebarRenderer",
  articleContent: "ArticleContentRenderer",
  articleHero: "ArticleHeroRenderer",
  hero: "HeroRenderer",
  text: "TextRenderer",
  image: "ImageRenderer",
  button: "ButtonRenderer",
  heading: "HeadingRenderer",
  list: "ListRenderer",
  iconList: "IconListRenderer",
  spacer: "SpacerRenderer",
  divider: "DividerRenderer",
  video: "VideoRenderer",
  embed: "EmbedRenderer",
  slider: "SliderRenderer",
  googleMap: "GoogleMapRenderer",
  cta: "CtaRenderer",
  features: "FeaturesRenderer",
  faq: "FaqRenderer",
  testimonial: "TestimonialRenderer",
  contentGrid: "ContentGridRenderer",
  productGrid: "ProductGridRenderer",
};

describe("blog/standard block style schemas match renderer tags", () => {
  const source = readSource("components/admin/blog-template-builder/BlogTemplateRenderer.tsx");

  const combined: Record<string, { elements: StyleElementSchema[] }> = {
    ...STANDARD_BLOCK_STYLE_SCHEMAS,
    ...BLOG_BLOCK_STYLE_SCHEMAS,
  };

  for (const [blockType, schema] of Object.entries(combined)) {
    if (CONTENT_SLIDER_TYPES.has(blockType)) continue;
    const fn = BLOG_BLOCK_RENDERERS[blockType];
    it(`${blockType} tags every styleable element in ${fn}`, () => {
      expect(fn, `no renderer mapping for ${blockType}`).toBeTruthy();
      const body = rendererBody(source, fn);
      expect(body, `renderer ${fn} not found`).not.toBe("");
      const tagged = taggedKeys(body);
      const missing = elementKeys(schema).filter((key) => !tagged.has(key));
      expect(missing, `untagged elements for ${blockType}: ${missing.join(", ")}`).toEqual([]);
    });
  }

  it("resolves schemas through getBlogBlockStyleSchema", () => {
    expect(getBlogBlockStyleSchema("blogSidebar")).toBe(BLOG_BLOCK_STYLE_SCHEMAS.blogSidebar);
    expect(getBlogBlockStyleSchema("nope")).toBeUndefined();
  });

  it("resolves schemas through getStandardBlockStyleSchema", () => {
    expect(getStandardBlockStyleSchema("hero")).toBe(STANDARD_BLOCK_STYLE_SCHEMAS.hero);
    expect(getStandardBlockStyleSchema("nope")).toBeUndefined();
  });
});

const PAGE_LAYOUT_BLOCK_RENDERERS: Record<string, string> = {
  heading: "HeadingRenderer",
  text: "TextRenderer",
  image: "ImageRenderer",
  button: "ButtonRenderer",
  spacer: "SpacerRenderer",
  divider: "DividerRenderer",
  embed: "EmbedRenderer",
  testimonial: "TestimonialRenderer",
  hero: "HeroRenderer",
  cta: "CtaRenderer",
  features: "FeaturesRenderer",
  faq: "FaqRenderer",
  list: "ListRenderer",
  contentGrid: "ContentGridRenderer",
  slider: "SliderRenderer",
};

describe("page-layout standard block schemas match renderer tags", () => {
  const source = readSource("components/admin/page-layout-builder/PageLayoutRenderer.tsx");

  for (const [blockType, fn] of Object.entries(PAGE_LAYOUT_BLOCK_RENDERERS)) {
    it(`${blockType} tags every styleable element in ${fn}`, () => {
      const schema = STANDARD_BLOCK_STYLE_SCHEMAS[blockType];
      expect(schema, `no schema for ${blockType}`).toBeTruthy();
      const body = rendererBody(source, fn);
      expect(body, `renderer ${fn} not found`).not.toBe("");
      const tagged = taggedKeys(body);
      const missing = elementKeys(schema).filter((key) => !tagged.has(key));
      expect(missing, `untagged elements for ${blockType}: ${missing.join(", ")}`).toEqual([]);
    });
  }
});

const HEADER_FOOTER_BLOCK_RENDERERS: Record<string, string> = {
  heading: "HeadingRenderer",
  text: "TextRenderer",
  image: "ImageRenderer",
  button: "ButtonRenderer",
  spacer: "SpacerRenderer",
  divider: "DividerRenderer",
  embed: "EmbedRenderer",
  testimonial: "TestimonialRenderer",
  iconList: "IconListRenderer",
  googleMap: "GoogleMapRenderer",
  video: "VideoRenderer",
};

describe("header/footer standard block schemas match renderer tags", () => {
  const source = readSource("components/admin/header-footer-builder/HeaderFooterRenderer.tsx");

  for (const [blockType, fn] of Object.entries(HEADER_FOOTER_BLOCK_RENDERERS)) {
    it(`${blockType} tags every styleable element in ${fn}`, () => {
      const schema = STANDARD_BLOCK_STYLE_SCHEMAS[blockType];
      expect(schema, `no schema for ${blockType}`).toBeTruthy();
      const body = rendererBody(source, fn);
      expect(body, `renderer ${fn} not found`).not.toBe("");
      const tagged = taggedKeys(body);
      const missing = elementKeys(schema).filter((key) => !tagged.has(key));
      expect(missing, `untagged elements for ${blockType}: ${missing.join(", ")}`).toEqual([]);
    });
  }
});

const BLOCK_RENDERER_BLOCKS: Record<string, string> = {
  hero: "HeroBlock",
  text: "TextBlock",
  image: "ImageBlock",
  cta: "CtaBlock",
  features: "FeaturesBlock",
  button: "ButtonBlock",
  embed: "EmbedBlock",
  faq: "FaqBlock",
  testimonial: "TestimonialBlock",
  spacer: "SpacerBlock",
  divider: "DividerBlock",
  heading: "HeadingBlock",
  list: "ListBlock",
  iconList: "IconListBlock",
  googleMap: "GoogleMapBlock",
  video: "VideoBlock",
};

describe("generic page-builder block schemas match renderer tags", () => {
  const source = readSource("components/admin/page-builder/BlockRenderer.tsx");

  for (const [blockType, fn] of Object.entries(BLOCK_RENDERER_BLOCKS)) {
    it(`${blockType} tags every styleable element in ${fn}`, () => {
      const schema = STANDARD_BLOCK_STYLE_SCHEMAS[blockType];
      expect(schema, `no schema for ${blockType}`).toBeTruthy();
      const body = rendererBody(source, fn);
      expect(body, `renderer ${fn} not found`).not.toBe("");
      const tagged = taggedKeys(body);
      const missing = elementKeys(schema).filter((key) => !tagged.has(key));
      expect(missing, `untagged elements for ${blockType}: ${missing.join(", ")}`).toEqual([]);
    });
  }
});

describe("delegated page-builder block components tag their styleable elements", () => {
  for (const { blockType, file } of DELEGATED_BLOCK_COMPONENTS) {
    it(`${blockType} tags every styleable element in ${file}`, () => {
      const schema = STANDARD_BLOCK_STYLE_SCHEMAS[blockType];
      expect(schema, `no schema for ${blockType}`).toBeTruthy();
      const tagged = taggedKeys(readSource(file));
      const missing = elementKeys(schema).filter((key) => !tagged.has(key));
      expect(missing, `untagged elements for ${blockType}: ${missing.join(", ")}`).toEqual([]);
    });
  }
});

describe("shared content block schemas match renderer tags", () => {
  const tagged = taggedKeys(readSource("components/admin/page-builder/shared-blocks/renderers.tsx"));

  for (const [blockType, schema] of Object.entries(SHARED_BLOCK_STYLE_SCHEMAS)) {
    it(`${blockType} tags every styleable element`, () => {
      const missing = elementKeys(schema).filter((key) => !tagged.has(key));
      expect(missing, `untagged elements for ${blockType}: ${missing.join(", ")}`).toEqual([]);
    });
  }

  it("resolves shared schemas through getStandardBlockStyleSchema", () => {
    expect(getStandardBlockStyleSchema("pricing")).toBe(SHARED_BLOCK_STYLE_SCHEMAS.pricing);
    expect(getStandardBlockStyleSchema("shapeDivider")).toBe(SHARED_BLOCK_STYLE_SCHEMAS.shapeDivider);
  });
});

describe("getBlockStyleSchema resolver", () => {
  it("resolves shared content blocks by type", () => {
    expect(getBlockStyleSchema("pricing")).toBe(SHARED_BLOCK_STYLE_SCHEMAS.pricing);
    expect(getBlockStyleSchema("announcement")).toBe(SHARED_BLOCK_STYLE_SCHEMAS.announcement);
  });

  it("resolves listing, geo, blog and standard schemas by type", () => {
    expect(getBlockStyleSchema("listingHero")).toBe(LISTING_BLOCK_STYLE_SCHEMAS.listingHero);
    expect(getBlockStyleSchema("geoHero")).toBe(GEO_BLOCK_STYLE_SCHEMAS.geoHero);
    expect(getBlockStyleSchema("blogSidebar")).toBe(BLOG_BLOCK_STYLE_SCHEMAS.blogSidebar);
    expect(getBlockStyleSchema("hero")).toBe(STANDARD_BLOCK_STYLE_SCHEMAS.hero);
  });

  it("prefers the blog schema for the shared blogPostGrid type", () => {
    expect(getBlockStyleSchema("blogPostGrid")).toBe(BLOG_BLOCK_STYLE_SCHEMAS.blogPostGrid);
  });

  it("returns undefined for block types without a schema", () => {
    expect(getBlockStyleSchema("row")).toBeUndefined();
    expect(getBlockStyleSchema("listingApplyForm")).toBeUndefined();
  });
});
