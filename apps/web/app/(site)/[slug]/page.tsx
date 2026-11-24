import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import BlockRenderer from "@/components/admin/page-builder/BlockRenderer";
import ProductPurchase from "@/components/storefront/ProductPurchase";
import ProductGalleryPanel from "@/components/storefront/ProductGalleryPanel";
import ProductDetailsTabs from "@/components/storefront/ProductDetailsTabs";
import ProductTemplateRenderer from "@/components/storefront/ProductTemplateRenderer";
import ProductPdpProvider from "@/components/storefront/ProductPdpProvider";
import ProductBreadcrumbs from "@/components/storefront/ProductBreadcrumbs";
import ProductBadges from "@/components/storefront/ProductBadges";
import ProductVariantSelector from "@/components/storefront/ProductVariantSelector";
import ProductTypePanel from "@/components/storefront/ProductTypePanel";
import ProductReviews from "@/components/storefront/ProductReviews";
import ProductRelations from "@/components/storefront/ProductRelations";
import StickyPurchaseBar from "@/components/storefront/StickyPurchaseBar";
import {
  getEnabledEcommerceGateways,
  getPublicProductBySlug,
} from "@/modules/ecommerce/queries";
import {
  buildProductJsonLd,
  buildProductMetadata,
  formatProductPrice,
  getSpecifications,
  toTemplateProductData,
} from "@/modules/ecommerce/product-display";
import { parseProductTemplateData, resolveProductTemplate } from "@/modules/product-template/queries";
import type { ProductTemplateProductData } from "@/lib/product-template/types";
import { sanitizeHtml } from "@/lib/style-guide";
import { getSinglePostSeo, loadSinglePost, SinglePost } from "@/app/(site)/components/SinglePost";
import { CustomPostTypeArchiveContent, getCustomPostTypeArchive } from "@/app/(site)/components/CustomPostTypeArchive";
import type { Block } from "@/lib/page-builder/types";
import type { Metadata } from "next";

export const revalidate = 0;

function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { region } = await searchParams;
  const product = await getPublicProductBySlug(slug);
  if (product) return buildProductMetadata(product, siteUrl());

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
    ? (JSON.parse(page.metaKeywords) as string[])
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

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { slug } = await params;
  const { region } = await searchParams;
  const product = await getPublicProductBySlug(slug);

  if (product) {
    const [gateways, productTemplate] = await Promise.all([
      getEnabledEcommerceGateways(),
      resolveProductTemplate("single", {
        pageId: product.id,
        pathname: `/${product.slug}`,
      }),
    ]);
    const templateData = productTemplate
      ? parseProductTemplateData(productTemplate.data)
      : null;
    const productData: ProductTemplateProductData = toTemplateProductData(product, siteUrl());
    const pdpGateways = gateways.map((gateway) => ({
      id: gateway.id,
      name: gateway.name,
      type: gateway.type,
    }));
    const jsonLd = buildProductJsonLd(product, siteUrl());
    const attributes = productData.attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      value: attribute.value,
    }));

    return (
      <>
        {productTemplate && templateData ? (
          <ProductTemplateRenderer
            blocks={templateData.blocks}
            containerSettings={templateData.containerSettings}
            product={productData}
            gateways={pdpGateways}
          />
        ) : (
          <ProductPdpProvider product={productData} gateways={pdpGateways}>
            <div className="pdp-shell">
              <ProductBreadcrumbs />
              <div className="pdp-hero">
                <ProductGalleryPanel />
                <div className="pdp-info">
                  <ProductBadges />
                  <h1 className="pdp-title">{product.name}</h1>
                  <div className="pdp-price-row">
                    <span className="pdp-price">{formatProductPrice(productData.effectivePrice?.price ?? product.price)}</span>
                    {productData.effectivePrice?.onSale && (
                      <span className="pdp-compare-price">
                        {formatProductPrice(productData.effectivePrice.regularPrice)}
                      </span>
                    )}
                  </div>
                  <p className="pdp-short-description">{product.shortDescription}</p>
                  <ProductVariantSelector />
                  <ProductTypePanel />
                  <div id="product-purchase">
                    <ProductPurchase />
                  </div>
                </div>
              </div>
              <ProductDetailsTabs
                descriptionHtml={sanitizeHtml(product.description ?? "")}
                attributes={attributes}
                customFields={product.customFields}
                specifications={getSpecifications(product)}
              />
              <ProductReviews />
              <ProductRelations />
              <StickyPurchaseBar />
            </div>
          </ProductPdpProvider>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
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

  const post = await loadSinglePost(slug, region);
  if (post) return <SinglePost {...post} />;

  notFound();
}
