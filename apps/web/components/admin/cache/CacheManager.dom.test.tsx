// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { clearAllCaches } from "@/app/(admin)/admin/cache/actions";
import CacheManager from "@/app/(admin)/admin/cache/components/CacheManager";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/(admin)/admin/cache/actions", () => ({ clearAllCaches: vi.fn() }));

let container: HTMLDivElement;
let root: Root;

describe("CacheManager", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    vi.mocked(clearAllCaches).mockResolvedValue({ ok: true as const });
    refresh.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("clears caches and confirms success", async () => {
    await act(async () => {
      root.render(<CacheManager />);
    });

    const button = Array.from(container.querySelectorAll("button")).find(
      (node) => node.textContent?.includes("Clear cache"),
    );
    expect(button).toBeTruthy();

    await act(async () => {
      button?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(clearAllCaches).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("All site caches were cleared.");
  });
});
