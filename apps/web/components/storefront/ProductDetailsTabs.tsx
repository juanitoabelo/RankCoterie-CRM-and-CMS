"use client";

import { useState } from "react";

export interface ProductDetailAttribute {
  id: string;
  name: string;
  value: string;
}

export interface ProductDetailCustomField {
  id: string;
  label: string;
  value: string;
  group: string | null;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export default function ProductDetailsTabs({
  descriptionHtml,
  attributes,
  customFields,
  specifications,
}: {
  descriptionHtml: string;
  attributes: ProductDetailAttribute[];
  customFields: ProductDetailCustomField[];
  specifications: ProductSpecification[];
}) {
  const hasAdditionalInfo =
    attributes.length > 0 || customFields.length > 0 || specifications.length > 0;
  const tabs = [
    { id: "description", label: "Description" },
    ...(hasAdditionalInfo ? [{ id: "additional-information", label: "Additional information" }] : []),
  ];
  const [activeTab, setActiveTab] = useState("description");

  return (
    <section className="mt-12 border-t border-zinc-200 pt-8">
      <div className="border-b border-zinc-200">
        <div className="-mb-px flex gap-6 overflow-x-auto" role="tablist" aria-label="Product details">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`product-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`product-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                const currentIndex = tabs.findIndex((item) => item.id === activeTab);
                const nextIndex =
                  event.key === "ArrowRight"
                    ? (currentIndex + 1) % tabs.length
                    : event.key === "ArrowLeft"
                      ? (currentIndex - 1 + tabs.length) % tabs.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : currentIndex;

                if (nextIndex !== currentIndex) {
                  event.preventDefault();
                  const nextTab = tabs[nextIndex];
                  setActiveTab(nextTab.id);
                  document.getElementById(`product-tab-${nextTab.id}`)?.focus();
                }
              }}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        id="product-panel-description"
        role="tabpanel"
        aria-labelledby="product-tab-description"
        hidden={activeTab !== "description"}
        className="pt-6"
      >
        {descriptionHtml ? (
          <div
            className="prose prose-zinc max-w-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="text-sm text-zinc-500">No description is available for this product.</p>
        )}
      </div>

      {hasAdditionalInfo && (
        <div
          id="product-panel-additional-information"
          role="tabpanel"
          aria-labelledby="product-tab-additional-information"
          hidden={activeTab !== "additional-information"}
          className="pt-6"
        >
          {specifications.length > 0 && (
            <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
              {specifications.map((specification) => (
                <div
                  key={specification.label}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:gap-6"
                >
                  <dt className="text-sm font-medium text-zinc-700">{specification.label}</dt>
                  <dd className="text-sm text-zinc-600">{specification.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {attributes.length > 0 && (
            <div className={specifications.length > 0 ? "mt-8" : ""}>
              <h2 className="mb-3 text-base font-semibold text-zinc-900">Product attributes</h2>
              <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {attributes.map((attribute) => (
                  <div
                    key={attribute.id}
                    className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:gap-6"
                  >
                    <dt className="text-sm font-medium text-zinc-700">{attribute.name}</dt>
                    <dd className="text-sm text-zinc-600">{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {customFields.length > 0 && (
            <div className={specifications.length > 0 || attributes.length > 0 ? "mt-8" : ""}>
              <h2 className="mb-3 text-base font-semibold text-zinc-900">More details</h2>
              <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:gap-6"
                  >
                    <dt className="text-sm font-medium text-zinc-700">
                      {field.group ? `${field.group}: ${field.label}` : field.label}
                    </dt>
                    <dd className="whitespace-pre-wrap text-sm text-zinc-600">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
