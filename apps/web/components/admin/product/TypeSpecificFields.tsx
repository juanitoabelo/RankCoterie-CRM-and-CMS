"use client";

import type { ProductFormInput } from "@/modules/ecommerce/types";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export default function TypeSpecificFields({
  product,
  shippingClasses,
  vendors,
}: {
  product: ProductFormInput;
  shippingClasses: { id: string; name: string; slug: string }[];
  vendors: { id: string; name: string; email: string }[];
}) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Vendor, shipping class &amp; commission
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="shippingClassId">
            Shipping class
          </label>
          <select
            id="shippingClassId"
            name="shippingClassId"
            defaultValue={product.shippingClassId ?? ""}
            className={inputCls}
          >
            <option value="">— None —</option>
            {shippingClasses.map((shippingClass) => (
              <option key={shippingClass.id} value={shippingClass.id}>
                {shippingClass.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="vendorId">
            Vendor
          </label>
          <select id="vendorId" name="vendorId" defaultValue={product.vendorId ?? ""} className={inputCls}>
            <option value="">— None —</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name} ({vendor.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="commissionRate">
            Commission rate
          </label>
          <input
            id="commissionRate"
            type="number"
            name="commissionRate"
            defaultValue={product.commissionRate ?? ""}
            step="0.01"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="commissionType">
            Commission type
          </label>
          <input
            id="commissionType"
            type="text"
            name="commissionType"
            defaultValue={product.commissionType ?? ""}
            className={inputCls}
            placeholder="percentage / fixed"
          />
        </div>
      </div>
    </details>
  );
}
