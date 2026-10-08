// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

vi.mock("@/modules/content", () => ({
  getArticlesForAdmin: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/app/(admin)/admin/articles/actions", () => ({
  createArticleForm: vi.fn(),
  deleteArticleForm: vi.fn(),
}));

import ArticlesAdminPage from "@/app/(admin)/admin/articles/page";

let container: HTMLDivElement;
let root: Root;

afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
  }
  container?.remove();
});

describe("new article form", () => {
  it("shows article title, HTML body, and meta description as the initial fields", async () => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const page = await ArticlesAdminPage();
    await act(async () => root.render(page));

    const form = container.querySelector('form[action]');
    expect(form).toBeTruthy();

    const fields = [
      { name: "title", label: "Article title" },
      { name: "body", label: "Body HTML" },
      { name: "metaDesc", label: "Meta Description" },
    ];

    for (const field of fields) {
      const label = [...container.querySelectorAll("label")].find(
        (element) => element.textContent?.trim().startsWith(field.label),
      );
      expect(label, `Expected a visible ${field.label} label`).toBeTruthy();
      expect(
        form?.querySelector(`[name="${field.name}"]`),
        `Expected a ${field.name} form control`,
      ).toBeTruthy();
      expect(label?.htmlFor).toBe(
        form?.querySelector(`[name="${field.name}"]`)?.id,
      );
    }

    expect(form?.querySelector('[name="title"]')).toHaveProperty("required", true);
    expect(form?.querySelector('[name="body"]')).toHaveProperty("required", true);
    expect(form?.querySelector('[name="metaDesc"]')).toHaveProperty("required", false);
    expect(form?.querySelector('[name="featuredImageAssetId"]')).toBeTruthy();
    expect(form?.textContent).toContain("Featured image");
    expect(form?.textContent).toContain("1200 × 630 px");
    expect(form?.querySelector('input[type="file"][accept*="image/jpeg"]')).toBeTruthy();
  });
});
