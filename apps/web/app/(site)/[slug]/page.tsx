import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import BlockRenderer from "@/components/admin/page-builder/BlockRenderer";
import ProductPurchase from "@/components/storefront/ProductPurchase";
import ProductGallery from "@/components/storefront/ProductGallery";
import ProductDetailsTabs from "@/components/storefront/ProductDetailsTabs";
import ProductTemplateRenderer from "@/components/storefront/ProductTemplateRenderer";
import { getEnabledPaymentGateways } from "@/modules/ecommerce/queries";
import { parseProductTemplateData, resolveProductTemplate } from "@/modules/product-template/queries";
import type { ProductTemplateProductData } from "@/lib/product-template/types";
import { sanitizeHtml } from "@/lib/style-guide";
import { getSinglePostSeo, loadSinglePost, SinglePost } from "@/app/(site)/components/SinglePost";
import { CustomPostTypeArchiveContent, getCustomPostTypeArchive } from "@/app/(site)/components/CustomPostTypeArchive";
import type { Block } from "@/lib/page-builder/types";
import type { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { region } = await searchParams;

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

  const customPostType = await getCustomPostTypeArchive(slug);
  if (customPostType) {
    if (!customPostType.isPublic || !customPostType.hasArchive) return { title: "Page not found" };
    return {
      title: customPostType.archivesLabel || customPostType.pluralLabel || customPostType.name,
      description: customPostType.description ?? undefined,
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

  if (!page) {
    const postSeo = await getSinglePostSeo(slug, region);
    return postSeo ?? { title: "Page not found" };
  }

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

type ProductJsonLdRow = {
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  metaDesc: string | null;
  regularPrice: number;
  salePrice: number | null;
  salePriceStart: Date | null;
  salePriceEnd: Date | null;
  stockStatus: string;
  images: { assetId: string }[];
};

/** Product + offer + breadcrumb structured data for the PDP. */
function productJsonLd(product: ProductJsonLdRow, siteUrl: string) {
  const url = `${siteUrl}/${product.slug}`;
  const now = new Date();
  const saleActive =
    product.salePrice !== null &&
    (!product.salePriceStart || product.salePriceStart <= now) &&
    (!product.salePriceEnd || product.salePriceEnd >= now);
  const price = saleActive && product.salePrice !== null ? product.salePrice : product.regularPrice;
  const availability =
    product.stockStatus === "OUT_OF_STOCK"
      ? "https://schema.org/OutOfStock"
      : product.stockStatus === "ON_BACKORDER"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock";
  const image = product.images[0]?.assetId
    ? `${siteUrl}/api/assets/${product.images[0].assetId}`
    : undefined;
  const description = product.shortDescription ?? product.metaDesc ?? undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    ...(description ? { description } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(image ? { image } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: price.toFixed(2),
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: product.name, item: url },
      ],
    },
  };
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { slug } = await params;
  const { region } = await searchParams;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: [{ isMain: "desc" }, { position: "asc" }] },
      attributes: {
        where: { isVisible: true, attribute: { isVisible: true } },
        orderBy: { position: "asc" },
        include: {
          attribute: { select: { name: true } },
          term: { select: { name: true } },
        },
      },
      customFields: {
        where: { isPublic: true },
        orderBy: { position: "asc" },
        select: { id: true, key: true, label: true, value: true, group: true },
      },
    },
  });

  if (product) {
    const [gateways, productTemplate] = await Promise.all([
      getEnabledPaymentGateways(),
      resolveProductTemplate("single", {
        pageId: product.id,
        pathname: `/${product.slug}`,
      }),
    ]);
    const { price, compareAt } = priceLabel(product);
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

    const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    const productAttributes = product.attributes.flatMap((attribute) => {
      const value = attribute.term?.name ?? attribute.customValue;
      return value ? [{
        id: attribute.id,
        attributeId: attribute.attributeId,
        name: attribute.attribute.name,
        value,
      }] : [];
    });
    const productData: ProductTemplateProductData = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      shortDescription: product.shortDescription,
      description: product.description,
      regularPrice: product.regularPrice,
      salePrice:
        product.salePrice !== null &&
        (!product.salePriceStart || product.salePriceStart <= new Date()) &&
        (!product.salePriceEnd || product.salePriceEnd >= new Date())
          ? product.salePrice
          : null,
      stockStatus: product.stockStatus,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      weight: product.weight,
      length: product.length,
      width: product.width,
      height: product.height,
      images: product.images.map((image) => ({
        id: image.id,
        assetId: image.assetId,
        alt: image.alt,
      })),
      customFields: product.customFields.map((field) => ({
        key: field.key,
        label: field.label,
        value: field.value,
        group: field.group,
      })),
      attributes: productAttributes,
    };
    const templateData = productTemplate
      ? parseProductTemplateData(productTemplate.data)
      : null;

    return (
      <>
      {productTemplate && templateData ? (
        <ProductTemplateRenderer
          blocks={templateData.blocks}
          containerSettings={templateData.containerSettings}
          product={productData}
          gateways={gateways.map((gw) => ({ id: gw.id, name: gw.name, type: gw.type }))}
        />
      ) : (
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
            <ProductGallery images={product.images} productName={product.name} />
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

        <ProductDetailsTabs
          descriptionHtml={sanitizeHtml(product.description ?? "")}
          attributes={productAttributes}
          customFields={product.customFields}
          specifications={[
            ...(product.sku ? [{ label: "SKU", value: product.sku }] : []),
            ...(product.weight !== null
              ? [{ label: "Weight", value: `${product.weight} kg` }]
              : []),
            ...(product.length !== null || product.width !== null || product.height !== null
              ? [{
                  label: "Dimensions",
                  value: [
                    product.length !== null ? `${product.length} cm` : null,
                    product.width !== null ? `${product.width} cm` : null,
                    product.height !== null ? `${product.height} cm` : null,
                  ].filter(Boolean).join(" × "),
                }]
              : []),
          ]}
        />

      </div>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // \u003c keeps "</script>" inside product data from breaking out.
          __html: JSON.stringify(productJsonLd(product, siteUrl)).replace(/</g, "\\u003c"),
        }}
      />
      </>
    );
  }

  const customPostType = await getCustomPostTypeArchive(slug);
  if (customPostType) {
    if (!customPostType.isPublic || !customPostType.hasArchive) notFound();
    return <CustomPostTypeArchiveContent postType={customPostType} />;
  }

  // Fall back to finding a page by slug
  const page = await prisma.page.findFirst({
    where: {
      slug,
      status: "LIVE",
    },
  });

  if (page) {
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

  // Fall back to a single post (article) by slug
  const post = await loadSinglePost(slug, region);
  if (post) return <SinglePost {...post} />;

  notFound();
}
