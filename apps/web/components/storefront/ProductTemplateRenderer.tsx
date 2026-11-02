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
import { ProductTemplateContext } from "./ProductTemplateContext";

function resolveBlockBindings(
  block: Block,
  product: ProductTemplateProductData,
): Block {
  const props = { ...block.props } as Record<string, unknown>;
  const bindings = props.bindings;
  if (bindings && typeof bindings === "object" && !Array.isArray(bindings)) {
    for (const [target, binding] of Object.entries(bindings)) {
      if (typeof binding !== "string" || !target) continue;
      let value = resolveProductBinding(product, binding);
      if (value === null) continue;
      if (["content", "body", "html"].includes(target)) value = sanitizeHtml(value);
      if (["url", "buttonUrl", "linkUrl", "src", "bgImage"].includes(target) && !isValidUrl(value)) continue;
      props[target] = value;
    }
    delete props.bindings;
  }

  if (Array.isArray(props.rows)) {
    props.rows = props.rows.map((row) =>
      row && typeof row === "object" ? resolveBlockBindings(row as Block, product) : row,
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
                ? resolveBlockBindings(child as Block, product)
                : child,
            ) }
          : {}),
      };
    });
  }

  return { ...block, props } as Block;
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
  const settings = containerSettings ?? {};
  const maxWidth = settings.width === "full" ? undefined : settings.maxWidth ?? 1200;

  return (
    <ProductTemplateContext.Provider
      value={{ product, gateways, interactive, resolveBinding: resolveProductBinding }}
    >
      <div
        className="mx-auto w-full"
        style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined }}
      >
        <BlockRenderer blocks={blocks.map((block) => resolveBlockBindings(block, product))} />
      </div>
    </ProductTemplateContext.Provider>
  );
}
