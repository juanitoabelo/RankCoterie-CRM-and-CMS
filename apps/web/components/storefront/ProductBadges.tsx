"use client";

import { useProductTemplateContext } from "./ProductTemplateContext";

export default function ProductBadges() {
  const context = useProductTemplateContext();
  if (!context || context.badges.length === 0) return null;

  return (
    <div className="pdp-badges" aria-label="Product highlights">
      {context.badges.map((badge) => (
        <span key={badge} className="pdp-badge">
          {badge}
        </span>
      ))}
    </div>
  );
}
