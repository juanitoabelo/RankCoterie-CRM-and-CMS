/**
 * Auth Module — Tests
 */
import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import {
  isSuperAdmin,
  canAccessSection,
  canAccessSectionWithOverrides,
  canAccessTool,
} from "../permissions";
import type { AdminUser } from "../types";

function makeUser(roles: Role[]): AdminUser {
  return {
    id: "test-id",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    roles,
  };
}

describe("isSuperAdmin", () => {
  it("returns true for SUPER_ADMIN role", () => {
    expect(isSuperAdmin(makeUser([Role.SUPER_ADMIN]))).toBe(true);
  });

  it("returns false for non-SUPER_ADMIN roles", () => {
    expect(isSuperAdmin(makeUser([Role.ADMIN]))).toBe(false);
    expect(isSuperAdmin(makeUser([Role.EDITOR]))).toBe(false);
    expect(isSuperAdmin(makeUser([Role.SALES_REP]))).toBe(false);
  });

  it("returns false for empty roles", () => {
    expect(isSuperAdmin(makeUser([]))).toBe(false);
  });
});

describe("canAccessSection", () => {
  it("allows SUPER_ADMIN access to any section", () => {
    const user = makeUser([Role.SUPER_ADMIN]);
    expect(canAccessSection(user, "users")).toBe(true);
    expect(canAccessSection(user, "listings")).toBe(true);
    expect(canAccessSection(user, "reports")).toBe(true);
    expect(canAccessSection(user, "nonexistent")).toBe(true);
  });

  it("allows ADMIN access to most sections", () => {
    const user = makeUser([Role.ADMIN]);
    expect(canAccessSection(user, "listings")).toBe(true);
    expect(canAccessSection(user, "users")).toBe(false); // Only SUPER_ADMIN
    expect(canAccessSection(user, "leads")).toBe(true);
  });

  it("allows EDITOR access to content sections", () => {
    const user = makeUser([Role.EDITOR]);
    expect(canAccessSection(user, "topics")).toBe(true);
    expect(canAccessSection(user, "articles")).toBe(true);
    expect(canAccessSection(user, "pages")).toBe(true);
    expect(canAccessSection(user, "listings")).toBe(false);
  });

  it("allows SALES_REP access to sales sections", () => {
    const user = makeUser([Role.SALES_REP]);
    expect(canAccessSection(user, "leads")).toBe(true);
    expect(canAccessSection(user, "clients")).toBe(true);
    expect(canAccessSection(user, "invoices")).toBe(true);
    expect(canAccessSection(user, "listings")).toBe(false);
  });

  it("returns false for unknown section", () => {
    const user = makeUser([Role.ADMIN]);
    expect(canAccessSection(user, "unknownSection")).toBe(false);
  });

  it("checks multiple roles", () => {
    const user = makeUser([Role.ADMIN, Role.EDITOR]);
    expect(canAccessSection(user, "listings")).toBe(true); // ADMIN
    expect(canAccessSection(user, "topics")).toBe(true); // EDITOR
  });
});

describe("canAccessTool", () => {
  const orders = { key: "products.orders", section: "products" };
  const reports = { key: "products.reports", section: "products" };

  it("allows SUPER_ADMIN even when an override denies the tool", () => {
    const roles = [Role.SUPER_ADMIN];
    const overrides = { "SUPER_ADMIN::tool:products.orders": false };
    expect(canAccessTool(roles, orders, overrides)).toBe(true);
  });

  it("falls back to the built-in section default", () => {
    expect(canAccessTool([Role.ADMIN], orders)).toBe(true);
    expect(canAccessTool([Role.SALES_REP], orders)).toBe(false);
  });

  it("hides every link when the section override is false", () => {
    const overrides = { "ADMIN::section:products": false };
    expect(canAccessTool([Role.ADMIN], orders, overrides)).toBe(false);
    expect(canAccessTool([Role.ADMIN], reports, overrides)).toBe(false);
  });

  it("shows every link when the section override is true", () => {
    const overrides = { "SALES_REP::section:products": true };
    expect(canAccessTool([Role.SALES_REP], orders, overrides)).toBe(true);
    expect(canAccessTool([Role.SALES_REP], reports, overrides)).toBe(true);
  });

  it("lets a per-link override win over the section override", () => {
    const overrides = {
      "ADMIN::section:products": false,
      "ADMIN::tool:products.orders": true,
    };
    expect(canAccessTool([Role.ADMIN], orders, overrides)).toBe(true);
    expect(canAccessTool([Role.ADMIN], reports, overrides)).toBe(false);
  });

  it("allows access when any of multiple roles allows the tool", () => {
    const overrides = {
      "ADMIN::section:products": false,
      "EDITOR::tool:products.orders": true,
    };
    expect(canAccessTool([Role.ADMIN, Role.EDITOR], orders, overrides)).toBe(true);
  });
});

describe("canAccessSectionWithOverrides", () => {
  it("blocks a section hidden for the role", () => {
    expect(
      canAccessSectionWithOverrides([Role.ADMIN], "products", {
        "ADMIN::section:products": false,
      }),
    ).toBe(false);
  });

  it("grants a section enabled for the role", () => {
    expect(
      canAccessSectionWithOverrides([Role.SALES_REP], "products", {
        "SALES_REP::section:products": true,
      }),
    ).toBe(true);
  });

  it("always allows SUPER_ADMIN", () => {
    expect(
      canAccessSectionWithOverrides([Role.SUPER_ADMIN], "products", {
        "SUPER_ADMIN::section:products": false,
      }),
    ).toBe(true);
  });
});
