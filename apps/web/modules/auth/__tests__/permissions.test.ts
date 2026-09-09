/**
 * Auth Module — Tests
 */
import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import { isSuperAdmin, canAccessSection } from "../permissions";
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
