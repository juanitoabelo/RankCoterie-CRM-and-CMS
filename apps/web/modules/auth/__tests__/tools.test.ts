import { describe, it, expect } from "vitest";
import {
  ADMIN_TOOL_GROUPS,
  ALL_ADMIN_TOOLS,
  SECTION_LABELS,
  toolForPath,
} from "../tools";

describe("admin tool registry", () => {
  it("uses unique tool keys", () => {
    const keys = ALL_ADMIN_TOOLS.map((tool) => tool.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("labels every section used by a tool", () => {
    for (const tool of ALL_ADMIN_TOOLS) {
      expect(SECTION_LABELS[tool.section], tool.section).toBeTruthy();
    }
  });

  it("keeps the tools-permission entry under System Tools", () => {
    const systemTools = ADMIN_TOOL_GROUPS.find((group) => group.title === "System Tools");
    expect(systemTools?.items.some((item) => item.href === "/admin/tools-permission")).toBe(true);
  });
});

describe("toolForPath", () => {
  it("resolves exact links", () => {
    expect(toolForPath("/admin/products/categories")?.key).toBe("products.categories");
    expect(toolForPath("/admin/products/categories/")?.key).toBe("products.categories");
  });

  it("resolves nested dynamic routes to the most specific parent link", () => {
    expect(toolForPath("/admin/products/abc123")?.key).toBe("products.list");
    expect(toolForPath("/admin/listings/bulk")?.key).toBe("listings.bulk");
    expect(toolForPath("/admin/listings/abc123/edit")?.key).toBe("listings.list");
  });

  it("ignores query strings in nav hrefs", () => {
    expect(toolForPath("/admin/listings")?.key).toBe("listings.list");
  });

  it("returns null for ungated paths", () => {
    expect(toolForPath("/admin")).toBeNull();
    expect(toolForPath("/admin/login")).toBeNull();
    expect(toolForPath("/admin/my-listing")).toBeNull();
  });

  it("resolves extra path aliases", () => {
    expect(toolForPath("/admin/custom-post-types/abc")?.key).toBe("general.customFields");
  });

  it("resolves the Tools Permission page itself", () => {
    expect(toolForPath("/admin/tools-permission")?.key).toBe("toolsPermission.list");
  });
});
