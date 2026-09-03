import { type Block } from "./types";

/** Strip HTML tags from a string (used when converting between block types). */
export function stripHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Loose URL check: http(s), mailto/tel, relative paths and anchors are allowed. */
export function isValidUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("/") || v.startsWith("#") || v.startsWith("mailto:") || v.startsWith("tel:")) {
    return true;
  }
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Validate a block against its required fields. Returns human-readable issues. */
export function validateBlock(block: Block): string[] {
  const errors: string[] = [];

  switch (block.type) {
    case "hero":
      if (!block.props.heading.trim()) errors.push("Heading is required.");
      break;
    case "text":
      if (!stripHtml(block.props.content)) errors.push("Text content is empty.");
      break;
    case "image":
      if (!block.props.src.trim()) errors.push("No image selected.");
      else if (!block.props.alt.trim()) errors.push("Add alt text (SEO).");
      break;
    case "cta":
      if (!block.props.heading.trim()) errors.push("Heading is required.");
      if (block.props.buttonText.trim() && !isValidUrl(block.props.buttonUrl)) {
        errors.push("Button URL is missing or invalid.");
      }
      break;
    case "features":
      if (!block.props.heading.trim()) errors.push("Heading is required.");
      if (block.props.items.length === 0) errors.push("Add at least one feature item.");
      block.props.items.forEach((item, i) => {
        if (!item.title.trim()) errors.push(`Feature item ${i + 1} is missing a title.`);
      });
      break;
    case "button":
      if (!block.props.text.trim()) errors.push("Button text is required.");
      if (!block.props.url.trim()) errors.push("Button URL is required.");
      else if (!isValidUrl(block.props.url)) errors.push("Button URL is invalid.");
      break;
    case "embed":
      if (!block.props.html.trim()) errors.push("Embed code is empty.");
      break;
    case "faq":
      if (!block.props.heading.trim()) errors.push("Heading is required.");
      block.props.items.forEach((item, i) => {
        if (!item.question.trim()) errors.push(`FAQ item ${i + 1} is missing a question.`);
        if (!stripHtml(item.answer)) errors.push(`FAQ item ${i + 1} is missing an answer.`);
      });
      break;
    case "testimonial":
      if (!stripHtml(block.props.quote)) errors.push("Quote is required.");
      break;
    case "heading":
      if (!stripHtml(block.props.text)) errors.push("Heading text is required.");
      break;
    case "list": {
      const filled = block.props.items.filter((item) => stripHtml(item).trim());
      if (filled.length === 0) errors.push("Add at least one list item.");
      break;
    }
    case "slider": {
      const withSrc = block.props.slides.filter((s) => s.src.trim());
      if (withSrc.length === 0) errors.push("Add at least one slide with an image.");
      const perView = block.props.itemsPerView ?? 1;
      if (!(perView >= 1 && perView <= 8)) {
        errors.push("Slides per view must be between 1 and 8.");
      }
      block.props.slides.forEach((s, i) => {
        if (s.src.trim() && !s.alt.trim()) errors.push(`Slide ${i + 1} is missing alt text (SEO).`);
        if (s.url.trim() && !isValidUrl(s.url)) errors.push(`Slide ${i + 1} link is invalid.`);
        if (s.buttonText.trim() && !isValidUrl(s.buttonUrl)) {
          errors.push(`Slide ${i + 1} button URL is invalid.`);
        }
      });
      break;
    }
    case "contentGrid":
      if (block.props.heading.trim() && block.props.source !== "articles" && block.props.source !== "feeds") {
        errors.push("Choose a content source.");
      }
      if (!(block.props.perPage >= 1 && block.props.perPage <= 48)) {
        errors.push("Items per page must be between 1 and 48.");
      }
      break;
    case "divider":
    case "spacer":
    case "row":
      break;
  }

  return errors;
}