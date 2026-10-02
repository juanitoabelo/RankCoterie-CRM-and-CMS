import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import BlockRenderer from "@/components/admin/page-builder/BlockRenderer";
import ProductPurchase from "@/components/storefront/ProductPurchase";
import { getEnabledPaymentGateways } from "@/modules/ecommerce/queries";
import { sanitizeHtml } from "@/lib/style-guide";
import type { Block } from "@/lib/page-builder/types";
import type { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      visibility: true,
      status: true,
      shortDescription: true,
      metaDesc: true,
      seoTitle: true,
      images: { where: { isMain: true }, take: 1, select: { assetId: true } },
    },
  });

  if (product) {
    const published = product.visibility === "PUBLIC" && product.status === "PUBLISHED";
    const title = product.seoTitle || product.name;
    const description = product.metaDesc || product.shortDescription || undefined;
    return {
      title,
      description,
      robots: { index: published, follow: published },
      openGraph: product.images[0]
        ? { title, description, images: [{ url: `/api/assets/${product.images[0].assetId}` }] }
        : description
          ? { title, description }
          : undefined,
    };
  }

  const page = await prisma.page.findFirst({
    where: { slug, status: "LIVE" },
    select: {
      title: true,
      name: true,
      seoTitle: true,
      metaDesc: true,
      metaKeywords: true,
      ogImage: true,
      canonicalUrl: true,
      robotsIndex: true,
      robotsFollow: true,
    },
  });

  if (!page) return { title: "Page not found" };

  const title = page.seoTitle || page.title || page.name;
  const metaKeywords = page.metaKeywords
    ? JSON.parse(page.metaKeywords) as string[]
    : [];

  return {
    title,
    description: page.metaDesc ?? undefined,
    keywords: metaKeywords.length > 0 ? metaKeywords : undefined,
    robots: {
      index: page.robotsIndex,
      follow: page.robotsFollow,
    },
    alternates: page.canonicalUrl ? { canonical: page.canonicalUrl } : undefined,
    openGraph: page.ogImage
      ? {
          title,
          description: page.metaDesc ?? undefined,
          images: [{ url: page.ogImage }],
        }
      : undefined,
  };
}

function priceLabel(product: {
  regularPrice: number;
  salePrice: number | null;
  salePriceStart: Date | null;
  salePriceEnd: Date | null;
}): { price: string; compareAt: string | null } {
  const now = new Date();
  const saleActive =
    product.salePrice !== null &&
    (!product.salePriceStart || product.salePriceStart <= now) &&
    (!product.salePriceEnd || product.salePriceEnd >= now);
  if (saleActive && product.salePrice !== null) {
    return {
      price: `$${product.salePrice.toFixed(2)}`,
      compareAt: `$${product.regularPrice.toFixed(2)}`,
    };
  }
  return { price: `$${product.regularPrice.toFixed(2)}`, compareAt: null };
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: [{ isMain: "desc" }, { position: "asc" }] },
    },
  });

  if (product) {
    const gateways = await getEnabledPaymentGateways();
    const { price, compareAt } = priceLabel(product);
    const mainImage = product.images[0];
    const stockLabel =
      product.stockStatus === "IN_STOCK"
        ? "In stock"
        : product.stockStatus === "LOW_STOCK"
          ? "Low stock"
          : product.stockStatus === "ON_BACKORDER"
            ? "On backorder"
            : "Out of stock";
    // Scarcity cue: show the exact remaining count when it's running low.
    // Products that accept backorders are never scarce.
    const backorderOk = product.backorders === "yes" || product.backorders === "notify";
    const lowThreshold = product.lowStockAmount ?? 5;
    const lowStockCount =
      product.manageStock &&
      !backorderOk &&
      product.stockQuantity !== null &&
      product.stockStatus !== "OUT_OF_STOCK" &&
      product.stockQuantity > 0 &&
      product.stockQuantity <= lowThreshold
        ? product.stockQuantity
        : null;

    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <nav className="mb-6 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900 hover:underline">
            Home
          </Link>
          {" / "}
          <span className="text-zinc-700">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            {mainImage ? (
              <img
                src={`/api/assets/${mainImage.assetId}`}
                alt={mainImage.alt ?? product.name}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 object-cover"
              />
            ) : (
              <div className="flex h-80 w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400">
                No image
              </div>
            )}
            {product.images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {product.images.slice(1, 6).map((img) => (
                  <img
                    key={img.id}
                    src={`/api/assets/${img.assetId}`}
                    alt={img.alt ?? ""}
                    className="h-20 w-full rounded-lg border border-zinc-200 object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            {product.featured && (
              <span className="mb-3 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase text-amber-700">
                Featured
              </span>
            )}
            <h1 className="text-3xl font-bold text-zinc-900">{product.name}</h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-zinc-900">{price}</span>
              {compareAt && (
                <span className="text-lg text-zinc-400 line-through">{compareAt}</span>
              )}
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              {lowStockCount ? (
                <span className="font-medium text-amber-600">
                  Only {lowStockCount} left in stock
                </span>
              ) : (
                <>
                  {stockLabel}
                  {product.manageStock &&
                    product.stockQuantity !== null &&
                    ` — ${product.stockQuantity} available`}
                </>
              )}
              {" · SKU: "}
              {product.sku || "—"}
            </p>

            {product.shortDescription && (
              <p className="mt-4 text-zinc-600">{product.shortDescription}</p>
            )}

            <div className="mt-6">
              <ProductPurchase
                productId={product.id}
                gateways={gateways.map((gw) => ({ id: gw.id, name: gw.name, type: gw.type }))}
              />
            </div>
          </div>
        </div>

        {product.description && (
          <section className="mt-12 border-t border-zinc-200 pt-8">
            <h2 className="text-lg font-semibold text-zinc-900">Description</h2>
            <div
              className="prose prose-zinc mt-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
            />
          </section>
        )}
      </div>
    );
  }

  // Fall back to finding a page by slug
  const page = await prisma.page.findFirst({
    where: {
      slug,
      status: "LIVE",
    },
  });

  if (!page) notFound();

  const blocks: Block[] = page.data ? JSON.parse(page.data) : [];

  return (
    <div>
      <BlockRenderer blocks={blocks} />
      {page.jsonSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: page.jsonSchema }}
        />
      )}
    </div>
  );
}
