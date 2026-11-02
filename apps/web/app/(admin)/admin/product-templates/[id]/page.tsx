import { notFound } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import {
  getProductTemplate,
  getProductTemplateAssignments,
  parseProductTemplateData,
} from "@/modules/product-template/queries";
import ProductTemplateBuilder from "@/components/admin/product-template-builder/ProductTemplateBuilder";
import {
  listProductTemplateRevisionsAction,
  restoreProductTemplateRevisionAction,
  saveProductTemplateAssignmentsAction,
  saveProductTemplateAction,
} from "../actions";
import type { ProductTemplateProductData } from "@/lib/product-template/types";
import { getEnabledPaymentGateways } from "@/modules/ecommerce/queries";

export const revalidate = 0;

export default async function EditProductTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getProductTemplate(id);
  if (!template) notFound();

  const [assignments, productRows, gatewayRows, availableProducts] = await Promise.all([
    getProductTemplateAssignments(id),
    prisma.product.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        shortDescription: true,
        description: true,
        regularPrice: true,
        salePrice: true,
        salePriceStart: true,
        salePriceEnd: true,
        stockStatus: true,
        averageRating: true,
        reviewCount: true,
        weight: true,
        length: true,
        width: true,
        height: true,
        images: {
          orderBy: [{ isMain: "desc" }, { position: "asc" }],
          select: { id: true, assetId: true, alt: true },
        },
        customFields: {
          where: { isPublic: true },
          orderBy: { position: "asc" },
          select: { key: true, label: true, value: true, group: true },
        },
        attributes: {
          where: { isVisible: true, attribute: { isVisible: true } },
          orderBy: { position: "asc" },
          select: {
            id: true,
            attributeId: true,
            customValue: true,
            attribute: { select: { name: true } },
            term: { select: { name: true } },
          },
        },
      },
    }),
    getEnabledPaymentGateways(),
    prisma.product.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);
  const now = new Date();
  const previewProducts: ProductTemplateProductData[] = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    description: product.description,
    regularPrice: product.regularPrice,
    salePrice:
      product.salePrice !== null &&
      (!product.salePriceStart || product.salePriceStart <= now) &&
      (!product.salePriceEnd || product.salePriceEnd >= now)
        ? product.salePrice
        : null,
    stockStatus: product.stockStatus,
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    images: product.images,
    customFields: product.customFields,
    attributes: product.attributes.flatMap((attribute) => {
      const value = attribute.term?.name ?? attribute.customValue;
      return value ? [{
        id: attribute.id,
        attributeId: attribute.attributeId,
        name: attribute.attribute.name,
        value,
      }] : [];
    }),
  }));
  const { blocks, containerSettings } = parseProductTemplateData(template.data);

  const save = async (templateId: string, data: string, options?: { createRevision?: boolean }) => {
    "use server";
    return saveProductTemplateAction(templateId, data, options);
  };
  const loadRevisions = async (templateId: string) => {
    "use server";
    return listProductTemplateRevisionsAction(templateId);
  };
  const restore = async (templateId: string, revisionId: string) => {
    "use server";
    return restoreProductTemplateRevisionAction(templateId, revisionId);
  };
  const saveAssignments = async (templateId: string, formData: FormData) => {
    "use server";
    return saveProductTemplateAssignmentsAction(templateId, formData);
  };

  return (
    <div className="px-6 py-5">
      <p className="text-sm text-zinc-500">
        Admin / Products / <a href="/admin/product-templates" className="text-zinc-700 hover:underline">Product Templates</a> / {template.name}
      </p>
      <ProductTemplateBuilder
        templateId={template.id}
        templateName={template.name}
        initialBlocks={blocks}
        initialContainerSettings={containerSettings}
        isDefault={template.isDefault}
        initialAssignments={assignments}
        previewProducts={previewProducts}
        previewGateways={gatewayRows.map((gateway) => ({
          id: gateway.id,
          name: gateway.name,
          type: gateway.type,
        }))}
        availableProducts={availableProducts}
        onSave={save}
        onListRevisions={loadRevisions}
        onRestoreRevision={restore}
        onSaveAssignments={saveAssignments}
      />
    </div>
  );
}
