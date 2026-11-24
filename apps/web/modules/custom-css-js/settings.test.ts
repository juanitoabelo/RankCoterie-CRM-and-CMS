import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const findUnique = vi.fn();

vi.mock("@/modules/shared", () => ({
  TENANT_ID: "tenant-test",
  prisma: {
    tenant: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));

import { readPublicCustomCssJsSettings } from "./settings";
import { DEFAULT_CUSTOM_CSS_JS } from "./types";

describe("readPublicCustomCssJsSettings", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("returns defaults when the tenant is missing", async () => {
    findUnique.mockResolvedValue(null);

    await expect(readPublicCustomCssJsSettings()).resolves.toEqual(DEFAULT_CUSTOM_CSS_JS);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "tenant-test" } });
  });

  it("reads tenant custom CSS/JS without an admin session", async () => {
    findUnique.mockResolvedValue({
      theme: { customCssJs: { customCss: ".x { color: red }", customJs: "console.log(1)" } },
    });

    await expect(readPublicCustomCssJsSettings()).resolves.toEqual({
      customCss: ".x { color: red }",
      customJs: "console.log(1)",
    });
  });

  it("does not import admin auth helpers", () => {
    const source = readFileSync(new URL("./settings.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/requireSection|requireUser|redirect\(/);
  });
});
