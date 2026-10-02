/**
 * Create Custom product item Card template — design the product card UI component.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

export default function CreateProductCardTemplatePage() {
  const [templatePreview, setTemplatePreview] = useState(false);

  return (
    <div className="p-6">
      <p className="text-sm text-zinc-500">
        Admin /{" "}
        <Link href="/admin/products" className="text-zinc-700 hover:underline">
          Products
        </Link> /{" "}
        <span className="text-zinc-700">Create product item Card template</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Create Custom product item Card template</h1>
      <p className="mt-4 text-zinc-600">
        Design the product card component that displays products in lists, grids, and collections.
      </p>

      {/* Card template designer UI */}
      <div className="bg-zinc-50 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">Card Template Designer</h2>
        <p className="text-zinc-600 mb-4">
          Customize how individual products appear in card format including image, title, price, and action buttons.
        </p>

        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Card view mode */}
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-2">Card View Mode</label>
            <select className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="grid">Grid View</option>
              <option value="list">List View</option>
              <option value="masonry">Masonry Layout</option>
            </select>
          </div>

          {/* Displayed fields */}
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-2">Display Fields</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked
                  className="h-4 w-4 rounded border-zinc-400"
                />
                Product Image
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked
                  className="h-4 w-4 rounded border-zinc-400"
                />
                Product Name
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked
                  className="h-4 w-4 rounded border-zinc-400"
                />
                Product Price
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked
                  className="h-4 w-4 rounded border-zinc-400"
                />
                Add to Cart Button
              </label>
            </div>
          </div>
        </div>

        {/* Template preview */}
        {templatePreview && (
          <div className="mt-6 p-4 bg-white rounded-lg border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-800 mb-3">Card Preview</h3>
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between rounded bg-zinc-100 p-3">
              <div className="h-24 w-full sm:w-32 rounded bg-zinc-200 animate-bounce" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">Product Name</p>
                <p className="text-xs text-zinc-500">SKU: ABC123</p>
              </div>
              <button
                className="rounded-lg bg-zinc-600 px-3 py-1 text-xs text-white hover:bg-zinc-700"
              >
                $49.99
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setTemplatePreview(true)}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 w-full">
          Preview Template
        </button>
      </div>

      {/* Design options */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Style Options</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="radio" name="cardRadius" value="sm" checked className="h-4 w-4 rounded border-zinc-400" />
              <span className="text-zinc-700">Small radius (4px)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="radio" name="cardRadius" value="md" className="h-4 w-4 rounded border-zinc-400" />
              <span className="text-zinc-700">Medium radius (8px)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="radio" name="cardRadius" value="lg" className="h-4 w-4 rounded border-zinc-400" />
              <span className="text-zinc-700">Large radius (12px)</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Spacing</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="radio" name="spacing" value="tight" className="h-4 w-4 rounded border-zinc-400" />
              <span className="text-zinc-700">Tight</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="radio" name="spacing" value="normal" className="h-4 w-4 rounded border-zinc-400" checked />
              <span className="text-zinc-700">Normal</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="radio" name="spacing" value="wide" className="h-4 w-4 rounded border-zinc-400" />
              <span className="text-zinc-700">Wide</span>
            </label>
          </div>
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