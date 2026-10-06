"use client";

import { useMemo, useState } from "react";
import type { Block } from "@/lib/page-builder/types";
import type { ContainerSettings } from "@/lib/geo-category-template/types";
import type { GeoPreviewData } from "@/lib/geo-category-template/geo-bindings";
import type { GeoStateLink, GeoTemplateListing } from "./GeoCategoryTemplateRenderer";
import GeoCategoryTemplateRenderer from "./GeoCategoryTemplateRenderer";

const SAMPLE_CATEGORY: GeoPreviewData = {
  id: "sample-category",
  category: {
    title: "Wilderness Therapy Programs",
    slug: "wilderness-therapy",
    description:
      "<p>This is sample category content, shown here so you can preview the single-page template as visitors will see it. Use the Structure Display to select blocks and edit their settings — changes appear here in the visual preview.</p>",
    stateInit: "<p>Sample state intro for the bound content block.</p>",
    metaDesc: "A sample meta description for previewing your template.",
    seoTitle: "Sample SEO title",
    focusKeyphrase: "wilderness therapy",
  },
  categoryUrl: "/g/wilderness-therapy/",
  heroImage: "",
  heroImageAlt: "Sample alt text",
  statesCount: 6,
  listingsCount: 3,
};

const SAMPLE_STATES: GeoStateLink[] = [
  { slug: "Texas-TX", state: "TX", stateFull: "Texas", url: "/g/wilderness-therapy/Texas-TX/" },
  { slug: "California-CA", state: "CA", stateFull: "California", url: "/g/wilderness-therapy/California-CA/" },
  { slug: "Utah-UT", state: "UT", stateFull: "Utah", url: "/g/wilderness-therapy/Utah-UT/" },
  { slug: "North-Carolina-NC", state: "NC", stateFull: "North Carolina", url: "/g/wilderness-therapy/North-Carolina-NC/" },
  { slug: "Florida-FL", state: "FL", stateFull: "Florida", url: "/g/wilderness-therapy/Florida-FL/" },
  { slug: "Oregon-OR", state: "OR", stateFull: "Oregon", url: "/g/wilderness-therapy/Oregon-OR/" },
];

const SAMPLE_LISTINGS: GeoTemplateListing[] = [
  { id: "l1", title: "Sample Program One", slug: "sample-program-one", href: "#", city: "Boise", state: "ID", summary: "A sample listing summary shown in the visual preview of the listings block." },
  { id: "l2", title: "Sample Program Two", slug: "sample-program-two", href: "#", city: "Austin", state: "TX", summary: "A second sample listing with its own summary text." },
  { id: "l3", title: "Sample Program Three", slug: "sample-program-three", href: "#", city: "Portland", state: "OR", summary: "A third sample listing to fill out the grid." },
];

const SAMPLE_FAQ = [
  { q: "What is wilderness therapy?", a: "<p>Sample answer for the FAQ block in the visual preview.</p>" },
  { q: "How long do programs last?", a: "<p>Sample answer for the second FAQ item.</p>" },
];

/** Shared sample context — also powers live previews in Structure Display. */
export const GEO_PREVIEW_SAMPLE = {
  geo: SAMPLE_CATEGORY,
  states: SAMPLE_STATES,
  faq: SAMPLE_FAQ,
  listings: SAMPLE_LISTINGS,
};

export default function GeoCategoryTemplateVisualPreview({
  blocks,
  containerSettings,
  viewport,
  categories = [],
}: {
  blocks: Block[];
  containerSettings: ContainerSettings;
  viewport: "desktop" | "tablet" | "mobile";
  categories?: GeoPreviewData[];
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? "sample");
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const geo = selectedCategory ?? SAMPLE_CATEGORY;

  return (
    <div
      className={`min-h-[600px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ${
        viewport === "mobile"
          ? "mx-auto w-full max-w-[390px]"
          : viewport === "tablet"
            ? "mx-auto w-full max-w-[768px]"
            : "w-full"
      }`}
    >
      {categories.length > 0 && (
        <div className="mb-5 flex items-center justify-end gap-2 border-b border-zinc-100 pb-3">
          <label htmlFor="geo-template-preview-category" className="text-xs font-medium text-zinc-600">
            Preview with category
          </label>
          <select
            id="geo-template-preview-category"
            value={selectedCategory ? selectedCategory.id : "sample"}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="max-w-64 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs"
          >
            <option value="sample">Sample category</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.category?.title ?? option.id}
              </option>
            ))}
          </select>
        </div>
      )}
      <GeoCategoryTemplateRenderer
        blocks={blocks}
        containerSettings={containerSettings}
        geo={geo}
        states={SAMPLE_STATES}
        faq={SAMPLE_FAQ}
        listings={SAMPLE_LISTINGS}
        viewport={viewport}
      />
    </div>
  );
}
