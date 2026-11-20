"use client";

import ProductGallery from "./ProductGallery";
import { useProductTemplateContext } from "./ProductTemplateContext";

export default function ProductGalleryPanel() {
  const context = useProductTemplateContext();
  if (!context) return null;
  return (
    <ProductGallery
      images={context.product.images}
      productName={context.product.name}
      activeAssetId={context.selectedVariant?.imageAssetId}
    />
  );
}
