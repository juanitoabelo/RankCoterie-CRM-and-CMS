import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSiteLayoutCache,
  readSiteLayoutCache,
  writeSiteLayoutCache,
} from "./site-layout-cache";

describe("site layout cache", () => {
  beforeEach(() => {
    clearSiteLayoutCache();
  });

  it("keeps cached layouts separate by pathname", () => {
    writeSiteLayoutCache({ title: "home" }, "/");
    writeSiteLayoutCache({ title: "blog" }, "/blog/");

    expect(readSiteLayoutCache("/")).toEqual({ title: "home" });
    expect(readSiteLayoutCache("/blog/")).toEqual({ title: "blog" });
    expect(readSiteLayoutCache("/search/")).toBeNull();
  });

  it("supports clearing one path without clearing the rest", () => {
    writeSiteLayoutCache({ title: "home" }, "/");
    writeSiteLayoutCache({ title: "blog" }, "/blog/");
    clearSiteLayoutCache("/blog/");

    expect(readSiteLayoutCache("/")).toEqual({ title: "home" });
    expect(readSiteLayoutCache("/blog/")).toBeNull();
  });

  it("clears every path when no pathname is supplied", () => {
    writeSiteLayoutCache({ title: "home" }, "/");
    writeSiteLayoutCache({ title: "blog" }, "/blog/");
    clearSiteLayoutCache();

    expect(readSiteLayoutCache("/")).toBeNull();
    expect(readSiteLayoutCache("/blog/")).toBeNull();
  });
});
