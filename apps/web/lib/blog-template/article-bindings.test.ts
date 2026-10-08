import { describe, expect, it } from "vitest";
import { createBlock } from "@/lib/page-builder/types";
import {
  articleBindingFieldsForTarget,
  resolveArticleBindingValue,
  resolveArticleBlockBindings,
  type ArticleBindingData,
} from "./article-bindings";

const ARTICLE: ArticleBindingData = {
  title: "Dynamic title",
  slug: "dynamic-title",
  body: "<p>Dynamic body</p>",
  featuredImage: "/api/assets/featured-asset",
  featuredImageAlt: "Sunrise over the valley",
  category: { title: "News", slug: "news" },
  customFields: { subtitle: "Custom subtitle" },
};

describe("article template bindings", () => {
  it("resolves safe article paths, including nested and custom fields", () => {
    expect(resolveArticleBindingValue(ARTICLE, "category.title")).toBe("News");
    expect(resolveArticleBindingValue(ARTICLE, "featuredImage")).toBe("/api/assets/featured-asset");
    expect(resolveArticleBindingValue(ARTICLE, "customFields.subtitle")).toBe("Custom subtitle");
    expect(resolveArticleBindingValue(ARTICLE, "customFields.missing")).toBeNull();
    expect(resolveArticleBindingValue(ARTICLE, "__proto__.polluted")).toBeNull();
  });

  it("filters article fields to the value type accepted by a target", () => {
    expect(articleBindingFieldsForTarget("image").map((field) => field.key)).toContain("featuredImage");
    expect(articleBindingFieldsForTarget("text").map((field) => field.key)).not.toContain("featuredImage");
    expect(articleBindingFieldsForTarget("richText").map((field) => field.key)).toContain("body");
    expect(articleBindingFieldsForTarget("text", [{ key: "subtitle", label: "Subtitle", valueType: "text" }]))
      .toContainEqual({ key: "customFields.subtitle", label: "Subtitle", valueType: "text" });
  });

  it("overrides bound block properties and leaves unbound static values unchanged", () => {
    const block = createBlock("image");
    const configured = {
      ...block,
      props: {
        ...block.props,
        src: "/static/image.jpg",
        alt: "Static alt",
        bindings: { src: "featuredImage", alt: "featuredImageAlt" },
      },
    } as typeof block;

    const result = resolveArticleBlockBindings(configured, ARTICLE);
    expect(result.props.src).toBe("/api/assets/featured-asset");
    expect(result.props.alt).toBe("Sunrise over the valley");
    expect(result.props.caption).toBe("");
  });

  it("keeps static fallback content when an article field is empty", () => {
    const block = createBlock("text");
    const configured = {
      ...block,
      props: { ...block.props, content: "<p>Static fallback</p>", bindings: { content: "body" } },
    } as typeof block;

    const result = resolveArticleBlockBindings(configured, { body: "" });
    expect(result.props.content).toBe("<p>Static fallback</p>");
  });

  it("sanitizes rich HTML and rejects unsafe bound URLs", () => {
    const textBlock = createBlock("text");
    const configuredText = {
      ...textBlock,
      props: { ...textBlock.props, content: "fallback", bindings: { content: "body" } },
    } as typeof textBlock;
    const sanitizedText = resolveArticleBlockBindings(configuredText, {
      body: '<p>Safe</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    });
    expect(sanitizedText.props.content).not.toContain("<script>");
    expect(sanitizedText.props.content).not.toContain("javascript:");

    const button = createBlock("button");
    const configuredButton = {
      ...button,
      props: { ...button.props, url: "/fallback", bindings: { url: "metaDesc" } },
    } as typeof button;
    const safeButton = resolveArticleBlockBindings(configuredButton, { metaDesc: "javascript:alert(1)" });
    expect(safeButton.props.url).toBe("/fallback");
  });
});
