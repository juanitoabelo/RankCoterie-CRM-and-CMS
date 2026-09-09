/**
 * Users Module — Tests
 */
import { describe, it, expect } from "vitest";
import { ROLE_LABELS, ALL_ROLES } from "../types";
import { Role } from "@prisma/client";

describe("ROLE_LABELS", () => {
  it("has labels for all roles", () => {
    expect(ROLE_LABELS.SUPER_ADMIN).toBe("Super Admin");
    expect(ROLE_LABELS.ADMIN).toBe("Admin");
    expect(ROLE_LABELS.EDITOR).toBe("Editor");
    expect(ROLE_LABELS.MARKETING).toBe("Marketing");
    expect(ROLE_LABELS.REVIEWER).toBe("Reviewer");
    expect(ROLE_LABELS.SALES_REP).toBe("Sales Rep");
    expect(ROLE_LABELS.GRACE_COACH).toBe("Grace Coach");
  });
});

describe("ALL_ROLES", () => {
  it("contains all Role enum values", () => {
    expect(ALL_ROLES).toContain(Role.SUPER_ADMIN);
    expect(ALL_ROLES).toContain(Role.ADMIN);
    expect(ALL_ROLES).toContain(Role.EDITOR);
    expect(ALL_ROLES).toContain(Role.MARKETING);
    expect(ALL_ROLES).toContain(Role.REVIEWER);
    expect(ALL_ROLES).toContain(Role.SALES_REP);
    expect(ALL_ROLES).toContain(Role.GRACE_COACH);
  });

  it("has 7 roles", () => {
    expect(ALL_ROLES).toHaveLength(7);
  });
});
