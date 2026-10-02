/**
 * Custom Product page template — design the overall product listing page layout.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

export default function CustomProductPageTemplatePage() {
  const [layoutPreview, setLayoutPreview] = useState(false);

  return (
    <div className="p-6">
      <p className="text-sm text-zinc-500">
        Admin /{" "}
        <Link href="/admin/products" className="text-zinc-700 hover:underline">
          Products
        </Link> /{" "}
        <span className="text-zinc-700">Custom Product page template</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Custom Product page template</h1>
      <p className="mt-4 text-zinc-600">
        Design the overall layout and structure for product listing pages.
      </p>

      {/* Page template designer UI */}
      <div className="bg-zinc-50 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">Page Template Designer</h2>
        <p className="text-zinc-600 mb-4">
          Customize the overall product listing page layout including product grid,
          filters, sorting, and pagination configuration.
        </p>

        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Layout mode */}
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-2">Layout Mode</label>
            <select className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="grid">Grid Layout</option>
              <option value="list">List Layout</option>
              <option value="infinite">Infinite Scroll</option>
            </select>
          </div>

          {/* Product columns */}
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-2">Products per Row</label>
            <select className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="2">2 products</option>
              <option value="3" selected>3 products</option>
              <option value="4">4 products</option>
              <option value="5">5 products</option>
            </select>
          </div>

          {/* Sidebar configuration */}
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-2">Sidebar</label>
            <select className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="none">No Sidebar</option>
              <option value="filters">Filters Sidebar</option>
              <option value="attributes">Attributes Sidebar</option>
            </select>
          </div>
        </div>

        {/* Section configuration */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-zinc-200">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">Page Sections</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked
                className="h-4 w-4 rounded border-zinc-400"
              />
              <span>Product Filter Bar</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked
                className="h-4 w-4 rounded border-zinc-400"
              />
              <span>Product Sorting</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked
                className="h-4 w-4 rounded border-zinc-400"
              />
              <span>Pagination Controls</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setLayoutPreview(true)}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 w-full">
          Preview Template
        </button>
      </div>

      {/* Live preview section */}
      {layoutPreview && (
        <div className="mt-6 p-4 bg-white rounded-lg border border-zinc-200">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">Live Preview</h3>
          <div className="h-48 bg-zinc-100 rounded overflow-hidden flex items-center justify-center">
            <p className="text-zinc-500 text-sm">Product listing page preview</p>
          </div>
        </div>
      )}

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