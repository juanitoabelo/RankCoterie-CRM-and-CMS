import { describe, expect, it } from "vitest";
import { createBlock, type Block } from "./types";
import { isValidUrl, stripHtml, validateBlock } from "./validate";

describe("isValidUrl", () => {
  it("accepts absolute, relative and anchor urls", () => {
    expect(isValidUrl("https://example.com/path")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
    expect(isValidUrl("/admin/pages")).toBe(true);
    expect(isValidUrl("#section")).toBe(true);
    expect(isValidUrl("mailto:hi@example.com")).toBe(true);
  });

  it("rejects junk and unsupported protocols", () => {
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("   ")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("ftp://example.com")).toBe(false);
  });
});

describe("stripHtml", () => {
  it("strips tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello</p> <b>World</b>")).toBe("Hello World");
    expect(stripHtml("<div>&nbsp;Lead&nbsp;<span> Magnet</span></div>")).toBe("Lead Magnet");
  });
});

describe("validateBlock", () => {
  it("flags missing image src and alt", () => {
    const img = createBlock("image") as Block & { props: { src: string; alt: string } };
    expect(validateBlock(img)).toContain("No image selected.");
    img.props.src = "/api/assets/abc";
    expect(validateBlock(img)).toContain("Add alt text (SEO).");
    img.props.alt = "A picture";
    expect(validateBlock(img)).toEqual([]);
  });

  it("flags invalid button url", () => {
    const btn = createBlock("button") as Block & { props: { text: string; url: string } };
    btn.props.text = "";
    expect(validateBlock(btn)).toContain("Button text is required.");
    btn.props.text = "Go";
    btn.props.url = "";
    expect(validateBlock(btn)).toContain("Button URL is required.");
    btn.props.url = "javascript:alert(1)";
    expect(validateBlock(btn)).toContain("Button URL is invalid.");
    btn.props.url = "#contact";
    expect(validateBlock(btn)).toEqual([]);
  });

  it("flags faq items missing answers", () => {
    const faq = createBlock("faq") as Block & {
      props: { items: Array<{ question: string; answer: string }> };
    };
    faq.props.items.push({ question: "", answer: "" });
    const errors = validateBlock(faq);
    expect(errors.some((e) => e.startsWith("FAQ item"))).toBe(true);
  });

  it("flags empty testimonial quote", () => {
    const t = createBlock("testimonial") as Block & { props: { quote: string } };
    t.props.quote = "";
    expect(validateBlock(t)).toContain("Quote is required.");
    t.props.quote = "Great!";
    expect(validateBlock(t)).toEqual([]);
  });

  it("ignores structural blocks", () => {
    const spacer = createBlock("spacer");
    const row = createBlock("row");
    expect(validateBlock(spacer)).toEqual([]);
    expect(validateBlock(row)).toEqual([]);
  });

  it("flags empty heading text", () => {
    const h = createBlock("heading") as Block & { props: { text: string } };
    h.props.text = "";
    expect(validateBlock(h)).toContain("Heading text is required.");
    h.props.text = "Why us";
    expect(validateBlock(h)).toEqual([]);
  });

  it("flags lists with no content", () => {
    const l = createBlock("list") as Block & { props: { items: string[] } };
    l.props.items = ["", "  "];
    expect(validateBlock(l)).toContain("Add at least one list item.");
    l.props.items = ["Real item"];
    expect(validateBlock(l)).toEqual([]);
  });

  it("flags sliders without images and missing alt text", () => {
    const s = createBlock("slider") as Block & {
      props: { slides: Array<{ src: string; alt: string; url: string }> };
    };
    s.props.slides[0].src = "";
    expect(validateBlock(s)).toContain("Add at least one slide with an image.");
    s.props.slides[0].src = "/slide.jpg";
    expect(validateBlock(s)).toContain("Slide 1 is missing alt text (SEO).");
    s.props.slides[0].alt = "A slide";
    expect(validateBlock(s)).toEqual([]);
  });

  it("flags out-of-range slides per view", () => {
    const s = createBlock("slider") as Block & { props: { slidesPerView?: number; itemsPerView: number } };
    s.props.slides[0].src = "/slide.jpg";
    s.props.slides[0].alt = "A slide";
    s.props.itemsPerView = 0;
    expect(validateBlock(s)).toContain("Slides per view must be between 1 and 8.");
    s.props.itemsPerView = 9;
    expect(validateBlock(s)).toContain("Slides per view must be between 1 and 8.");
    s.props.itemsPerView = 2;
    expect(validateBlock(s)).toEqual([]);
  });

  it("flags out-of-range content grid page size", () => {
    const g = createBlock("contentGrid") as Block & { props: { perPage: number } };
    g.props.perPage = 0;
    expect(validateBlock(g)).toContain("Items per page must be between 1 and 48.");
    g.props.perPage = 6;
    expect(validateBlock(g)).toEqual([]);
  });
});