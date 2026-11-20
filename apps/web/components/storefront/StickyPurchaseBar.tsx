"use client";

import { formatMoney } from "@/modules/ecommerce/currency";
import { useProductTemplateContext } from "./ProductTemplateContext";

export default function StickyPurchaseBar() {
  const context = useProductTemplateContext();
  if (!context || !context.interactive) return null;
  if (context.product.type === "GROUPED" || context.product.type === "BUNDLE") return null;

  return (
    <div className="pdp-sticky-bar">
      <div className="pdp-sticky-inner">
        <div>
          <p className="pdp-sticky-name">{context.product.name}</p>
          <p className="pdp-sticky-price">{formatMoney(context.price)}</p>
        </div>
        <a href="#product-purchase" className="pdp-primary-button">
          {context.product.type === "EXTERNAL" ? "Details" : "Purchase"}
        </a>
      </div>
    </div>
  );
}
