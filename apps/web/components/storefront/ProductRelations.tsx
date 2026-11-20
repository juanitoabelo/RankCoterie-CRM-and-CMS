"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/modules/ecommerce/currency";
import { assetUrl } from "@/modules/ecommerce/product-display";
import { useProductTemplateContext } from "./ProductTemplateContext";

const RELATION_GROUPS: Array<{ type: string; label: string }> = [
  { type: "RELATED", label: "You may also like" },
  { type: "CROSS_SELL", label: "Frequently bought together" },
  { type: "UP_SELL", label: "Upgrade your choice" },
  { type: "BUNDLE_CHILD", label: "Included in this bundle" },
  { type: "GROUPED_CHILD", label: "Included in this group" },
];

export default function ProductRelations() {
  const context = useProductTemplateContext();
  const links = context?.product.links ?? [];
  if (!context || links.length === 0) return null;

  const groups = RELATION_GROUPS.map((group) => ({
    ...group,
    items: links.filter((link) => String(link.type) === group.type),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="pdp-relations" aria-label="Product relationships">
      {groups.map((group) => (
        <div key={group.type}>
          <h2 className="pdp-section-title">{group.label}</h2>
          <div className="pdp-related-grid">
            {group.items.map((link) => {
              const imagePath = assetUrl(link.product.imageAssetId);
              return (
                <Link key={link.id} href={`/${link.product.slug}`} className="pdp-related-card">
                  <div className="pdp-related-image">
                    {imagePath && (
                      <Image
                        src={imagePath}
                        alt={link.product.imageAlt || link.product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 220px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="pdp-related-name">{link.product.name}</span>
                  <span className="pdp-related-price">{formatMoney(link.product.price)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
