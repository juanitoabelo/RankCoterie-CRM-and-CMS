import { beforeEach, describe, expect, it, vi } from "vitest";

const productFindFirst = vi.fn();

vi.mock("@/lib/directory/prismaCatalog", () => ({
  prisma: {
    product: { findFirst: (...args: unknown[]) => productFindFirst(...args) },
  },
}));

vi.mock("@/lib/tenant", () => ({ TENANT_ID: "tenant-test" }));

import { getPublicProductBySlug } from "../queries";

beforeEach(() => {
  vi.clearAllMocks();
  productFindFirst.mockResolvedValue(null);
});

describe("getPublicProductBySlug", () => {
  it("only includes published public linked products from the current tenant", async () => {
    await getPublicProductBySlug("hidden-product");

    const query = productFindFirst.mock.calls[0][0] as {
      include: {
        outgoingLinks: {
          where: {
            tenantId: string;
            linkedProduct: {
              tenantId: string;
              status: string;
              visibility: string;
            };
          };
        };
      };
    };
    expect(query.include.outgoingLinks.where).toEqual({
      tenantId: "tenant-test",
      linkedProduct: {
        tenantId: "tenant-test",
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    });
  });

  it("excludes hidden attributes from public product data", async () => {
    await getPublicProductBySlug("hidden-attributes");

    const query = productFindFirst.mock.calls[0][0] as {
      include: { attributes: { where: Record<string, unknown> } };
    };
    expect(query.include.attributes.where).toEqual({
      isVisible: true,
      attribute: { isVisible: true },
    });
  });
});
