// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import StorefrontUtilities from "./StorefrontUtilities";
import { CART_UPDATED_EVENT } from "@/lib/cart-event";
import { WISHLIST_STORAGE_KEY } from "@/lib/wishlist/sync";

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("StorefrontUtilities", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/cart") {
        return { ok: true, json: async () => ({ ok: true, itemCount: 3 }) } as Response;
      }
      if (url.pathname === "/api/wishlist") {
        return { ok: true, json: async () => ({ items: [{ id: "a" }, { id: "b" }] }) } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("shows live cart and wishlist counts with independent visibility toggles", async () => {
    await act(async () => {
      root.render(
        <StorefrontUtilities
          showCart
          showWishlist
          showOrders={false}
          showSearch={false}
          showBadges
        />,
      );
    });
    await flush();

    expect(container.querySelector('[aria-label="Cart, 3 items"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Wishlist, 2 items"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Track order"]')).toBeNull();
    expect(container.querySelector('[aria-label="Search"]')).toBeNull();
    expect(container.querySelectorAll('[data-lp-el="badge"]')).toHaveLength(2);
  });

  it("updates the cart badge from cart events", async () => {
    await act(async () => {
      root.render(<StorefrontUtilities showWishlist={false} showOrders={false} />);
    });
    await flush();
    expect(container.querySelector('[aria-label="Cart, 3 items"]')).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: 7 }));
    });
    expect(container.querySelector('[aria-label="Cart, 7 items"]')).toBeTruthy();
  });

  it("falls back to local wishlist ids when signed-out wishlist API is unavailable", async () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(["p1", "p2", "p3"]));
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/cart") {
        return { ok: true, json: async () => ({ ok: true, itemCount: 0 }) } as Response;
      }
      return { ok: false, status: 401, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    await act(async () => {
      root.render(
        <StorefrontUtilities
          showCart={false}
          showWishlist
          showOrders={false}
          showZeroCount
        />,
      );
    });
    await flush();

    expect(container.querySelector('[aria-label="Wishlist, 3 items"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-lp-el="item"]')).toHaveLength(1);
  });

  it("can render cart only with labels", async () => {
    await act(async () => {
      root.render(
        <StorefrontUtilities
          showCart
          showWishlist={false}
          showOrders={false}
          showLabels
          cartLabel="Basket"
        />,
      );
    });
    await flush();

    expect(container.querySelector('[aria-label="Basket, 3 items"]')).toBeTruthy();
    expect(container.textContent).toContain("Basket");
    expect(container.querySelectorAll('[data-lp-el="item"]')).toHaveLength(1);
  });
});
