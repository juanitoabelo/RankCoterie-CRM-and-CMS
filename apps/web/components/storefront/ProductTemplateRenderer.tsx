"use client";

import BlockRenderer from "@/components/admin/page-builder/BlockRenderer";
import type { Block } from "@/lib/page-builder/types";
import type {
  ContainerSettings,
  ProductTemplateProductData,
} from "@/lib/product-template/types";
import { resolveProductBinding } from "@/lib/product-template/bindings";
import { isValidUrl } from "@/lib/page-builder/validate";
import { sanitizeHtml } from "@/lib/style-guide";
import ProductPdpProvider from "./ProductPdpProvider";
import { useProductTemplateContext } from "./ProductTemplateContext";

type BindingResolver = (
  product: ProductTemplateProductData,
  binding: string,
) => string | null;

function resolveBlockBindings(
  block: Block,
  product: ProductTemplateProductData,
  resolveBinding: BindingResolver = resolveProductBinding,
): Block {
  const props = { ...block.props } as Record<string, unknown>;
  const bindings = props.bindings;
  if (bindings && typeof bindings === "object" && !Array.isArray(bindings)) {
    for (const [target, binding] of Object.entries(bindings)) {
      if (typeof binding !== "string" || !target) continue;
      let value = resolveBinding(product, binding);
      if (value === null) continue;
      if (["content", "body", "html"].includes(target)) value = sanitizeHtml(value);
      if (["url", "buttonUrl", "linkUrl", "src", "bgImage"].includes(target) && !isValidUrl(value)) continue;
      props[target] = value;
    }
    delete props.bindings;
  }

  if (Array.isArray(props.rows)) {
    props.rows = props.rows.map((row) =>
      row && typeof row === "object"
        ? resolveBlockBindings(row as Block, product, resolveBinding)
        : row,
    );
  }
  if (Array.isArray(props.columns)) {
    props.columns = props.columns.map((column) => {
      if (!column || typeof column !== "object") return column;
      const columnData = column as { blocks?: unknown[] };
      return {
        ...column,
        ...(Array.isArray(columnData.blocks)
          ? { blocks: columnData.blocks.map((child) =>
              child && typeof child === "object"
                ? resolveBlockBindings(child as Block, product, resolveBinding)
                : child,
            ) }
          : {}),
      };
    });
  }

  return { ...block, props } as Block;
}

function BoundBlocks({ blocks }: { blocks: Block[] }) {
  const context = useProductTemplateContext();
  const renderedBlocks = context
    ? blocks.map((block) => resolveBlockBindings(block, context.product, context.resolveBinding))
    : blocks;
  return <BlockRenderer blocks={renderedBlocks} />;
}

export default function ProductTemplateRenderer({
  blocks,
  product,
  gateways,
  containerSettings,
  interactive = true,
}: {
  blocks: Block[];
  product: ProductTemplateProductData;
  gateways: Array<{ id: string; name: string; type: string }>;
  containerSettings?: ContainerSettings;
  interactive?: boolean;
}) {
  const settings: Partial<ContainerSettings> = containerSettings ?? {};
  const maxWidth = settings.width === "full" ? undefined : settings.maxWidth ?? 1200;

  return (
    <ProductPdpProvider product={product} gateways={gateways} interactive={interactive}>
      <div
        className="mx-auto w-full"
        style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined }}
      >
        <BoundBlocks blocks={blocks} />
      </div>
    </ProductPdpProvider>
  );
}
