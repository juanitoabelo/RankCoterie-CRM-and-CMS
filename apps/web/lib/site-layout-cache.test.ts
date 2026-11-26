import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSiteLayoutCache,
  loadSharedSiteLayoutCache,
  loadSiteLayoutCache,
  readSharedSiteLayoutCache,
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

  it("shares one cached value across all routes", async () => {
    const load = vi.fn(async () => ({ menu: "primary" }));

    expect(await loadSharedSiteLayoutCache(load)).toEqual({ menu: "primary" });
    expect(await loadSharedSiteLayoutCache(load)).toEqual({ menu: "primary" });
    expect(readSharedSiteLayoutCache()).toEqual({ menu: "primary" });
    expect(load).toHaveBeenCalledOnce();
  });

  it("dedupes concurrent loads for the same data", async () => {
    let resolveLoad!: (value: { ok: boolean }) => void;
    const load = vi.fn(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const first = loadSharedSiteLayoutCache(load);
    const second = loadSharedSiteLayoutCache(load);
    resolveLoad({ ok: true });

    expect(await first).toEqual({ ok: true });
    expect(await second).toEqual({ ok: true });
    expect(load).toHaveBeenCalledOnce();
  });

  it("clears shared data with the rest of the application caches", async () => {
    await loadSharedSiteLayoutCache(async () => ({ menu: "primary" }));
    clearSiteLayoutCache();
    expect(readSharedSiteLayoutCache()).toBeNull();
  });

  it("dedupes pathname-specific loads", async () => {
    const load = vi.fn(async () => ({ blocks: 1 }));

    expect(await loadSiteLayoutCache("/about/", load)).toEqual({ blocks: 1 });
    expect(await loadSiteLayoutCache("/about", load)).toEqual({ blocks: 1 });
    expect(load).toHaveBeenCalledOnce();
  });
});
