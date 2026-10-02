/**
 * Create Custom Single Product page — build a dedicated landing page for a single product.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

export default function CreateSingleProductPage() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  return (
    <div className="p-6">
      <p className="text-sm text-zinc-500">
        Admin /{" "}
        <Link href="/admin/products" className="text-zinc-700 hover:underline">
          Products
        </Link> /{" "}
        <span className="text-zinc-700">Create Single Product page</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Create Custom Single Product page</h1>
      <p className="mt-4 text-zinc-600">
        Build a dedicated landing page for a specific product with custom branding and layout.
      </p>

      {/* Product page builder UI */}
      <div className="bg-zinc-50 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">Product Page Builder</h2>
        <p className="text-zinc-600 mb-4">
          Design a custom product landing page that showcases your product with
          hero image, features, specifications, and a call-to-action button.
        </p>

        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Product selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-2">Select Product</label>
            <select className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="">— No product selected —</option>
              <option value="simple-1">Simple Product #1</option>
              <option value="variable-1">Variable Product #1</option>
              <option value="subscription-1">Subscription #1</option>
            </select>
          </div>

          {/* Builder mode toggle */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={isBuilderOpen}
                onChange={(e) => setIsBuilderOpen(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-400"
              />
              Enable advanced builder
            </label>
          </div>
        </div>

        {/* Builder sections preview */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Hero Section</h3>
            <p className="text-zinc-500 text-xs">Add hero image, product title, and price</p>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Features</h3>
            <p className="text-zinc-500 text-xs">List product features and benefits</p>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Specifications</h3>
            <p className="text-zinc-500 text-xs">Technical specifications table</p>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">CTA</h3>
            <p className="text-zinc-500 text-xs">Add add to cart / buy now button</p>
          </div>
        </div>

        <button
          onClick={() => setIsBuilderOpen(true)}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 w-full">
          Open Full Builder
        </button>
      </div>

      {/* Quick stats or preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-zinc-800">Page Preview</h3>
          <p className="mt-2 text-zinc-500 text-sm">Preview your custom product page design</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-800">Settings</h3>
          <p className="mt-2 text-zinc-500 text-sm">Configure page settings and SEO</p>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/products" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Products
        </Link>
        <Link href="/admin/products/categories" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Categories
        </Link>
        <Link href="/admin/products/tags" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Tags
        </Link>
        <Link href="/admin/products/attributes" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Attributes
        </Link>
      </nav>
    </div>
  );
}