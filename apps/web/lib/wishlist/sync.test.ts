import { describe, expect, it } from "vitest";
import { mergeWishlistIds, parseWishlistIds } from "./sync";

describe("wishlist local/server sync", () => {
  it("parses only string ids from localStorage", () => {
    expect(parseWishlistIds('["p1","p2",3,null]')).toEqual(["p1", "p2"]);
    expect(parseWishlistIds("not json")).toEqual([]);
  });

  it("merges server ids with local-only ids without duplicates", () => {
    expect(mergeWishlistIds(["p2", "p3"], ["p1", "p2", "p4"])).toEqual([
      "p2",
      "p3",
      "p1",
      "p4",
    ]);
  });

  it("caps the merged list", () => {
    expect(mergeWishlistIds(Array.from({ length: 150 }, (_, i) => `l${i}`), [])).toHaveLength(100);
  });
});
