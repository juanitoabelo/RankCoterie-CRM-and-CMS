"use client";

import Link from "next/link";
import { useProductTemplateContext } from "./ProductTemplateContext";

export default function ProductBreadcrumbs() {
  const context = useProductTemplateContext();
  if (!context) return null;
  const category = context.product.categories?.find((item) => item.isPrimary) ?? context.product.categories?.[0];

  return (
    <nav className="pdp-breadcrumbs" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <span aria-hidden="true">/</span>
      {category ? (
        <>
          <Link href={`/shop?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>
          <span aria-hidden="true">/</span>
        </>
      ) : null}
      <span aria-current="page">{context.product.name}</span>
    </nav>
  );
}
