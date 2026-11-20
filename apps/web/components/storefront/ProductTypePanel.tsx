"use client";

import Link from "next/link";
import { formatMoney } from "@/modules/ecommerce/currency";
import { useProductTemplateContext } from "./ProductTemplateContext";

function formatPeriod(value: string | null | undefined): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function groupSectionsForType(type: string | undefined) {
  if (type === "BUNDLE") {
    return [{ types: ["BUNDLE_CHILD"], title: "Included in this bundle" }];
  }
  if (type === "GROUPED") {
    return [{ types: ["GROUPED_CHILD"], title: "Products in this group" }];
  }
  return [
    { types: ["BUNDLE_CHILD"], title: "Included in this bundle" },
    { types: ["GROUPED_CHILD"], title: "Products in this group" },
  ];
}

export default function ProductTypePanel() {
  const context = useProductTemplateContext();
  if (!context) return null;
  const product = context.product;

  if (product.type === "SUBSCRIPTION") {
    return (
      <aside className="pdp-type-panel" aria-label="Subscription details">
        <h3>Subscription</h3>
        <p>
          {product.subscriptionInterval && product.subscriptionPeriod
            ? `Plan cycle: every ${product.subscriptionInterval} ${formatPeriod(product.subscriptionPeriod)}${product.subscriptionInterval > 1 ? "s" : ""}. Renewals are handled manually.`
            : "Subscription details are recorded at checkout. Renewals are handled manually."}
        </p>
        {product.subscriptionSignUpFee ? (
          <p>Initial sign-up fee (first order only): {formatMoney(product.subscriptionSignUpFee)}</p>
        ) : null}
        {product.subscriptionLength ? (
          <p>Plan length: {product.subscriptionLength} billing cycles.</p>
        ) : null}
        <ProductGroupLinks />
      </aside>
    );
  }

  if (product.type === "SERVICE") {
    return (
      <aside className="pdp-type-panel" aria-label="Booking details">
        <h3>Booking details</h3>
        {product.serviceDuration ? <p>Duration: {product.serviceDuration} minutes.</p> : null}
        {product.serviceLocation ? <p>Location: {product.serviceLocation}</p> : null}
      </aside>
    );
  }

  if (product.type === "EXTERNAL") {
    return (
      <aside className="pdp-type-panel" aria-label="External product">
        <h3>External product</h3>
        <p>This item is sold and fulfilled by a separate provider.</p>
      </aside>
    );
  }

  if (product.type === "BUNDLE" || product.type === "GROUPED") {
    return (
      <aside className="pdp-type-panel" aria-label={product.type === "BUNDLE" ? "Bundle details" : "Grouped product details"}>
        <ProductGroupLinks />
      </aside>
    );
  }

  if (product.downloadable || product.virtual) {
    return (
      <aside className="pdp-type-panel" aria-label="Digital delivery details">
        <h3>Digital delivery</h3>
        <p>No physical shipping is required. Access details are delivered after purchase.</p>
      </aside>
    );
  }

  if (product.purchaseNote) {
    return (
      <aside className="pdp-type-panel" aria-label="Purchase note">
        <p>{product.purchaseNote}</p>
      </aside>
    );
  }

  return <ProductGroupLinks />;
}

export function ProductGroupLinks() {
  const context = useProductTemplateContext();
  const links = context?.product.links ?? [];
  if (!context) return null;

  const sections = groupSectionsForType(context.product.type)
    .map((section) => ({
      title: section.title,
      items: links.filter((link) => section.types.includes(String(link.type))),
    }))
    .filter((section) => section.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="pdp-group-links">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="pdp-section-title">{section.title}</h3>
          <ul>
            {section.items.map((link) => (
              <li key={link.id}>
                <Link href={`/${link.product.slug}`}>
                  <span>{link.product.name}</span>
                  <span>{formatMoney(link.product.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
