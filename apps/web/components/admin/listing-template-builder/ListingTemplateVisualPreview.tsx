"use client";

import { useMemo, useState } from "react";
import type { Block } from "@/lib/page-builder/types";
import type { ContainerSettings } from "@/lib/listing-templates/tree-types";
import type { ListingRowLike, RegionRow } from "@/components/site/listing/listing-view-model";
import ListingTemplateTreeRenderer from "@/components/site/listing/ListingTemplateTreeRenderer";
import { createSampleListingRow, SAMPLE_REGION_ROWS } from "./sample";

export type ListingPreviewOption = {
  listing: ListingRowLike;
  regionRows: RegionRow[];
};

export default function ListingTemplateVisualPreview({
  blocks,
  containerSettings,
  viewport,
  listings = [],
}: {
  blocks: Block[];
  containerSettings: ContainerSettings;
  viewport: "desktop" | "tablet" | "mobile";
  listings?: ListingPreviewOption[];
}) {
  const [selectedId, setSelectedId] = useState<string>(listings[0]?.listing.id ?? "sample");

  const selected = useMemo(
    () => listings.find((option) => option.listing.id === selectedId),
    [listings, selectedId],
  );

  const listing: ListingRowLike = selected?.listing ?? createSampleListingRow();
  const regionRows: RegionRow[] = selected?.regionRows ?? SAMPLE_REGION_ROWS;

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
      <div className="mb-5 flex items-center justify-end gap-2 border-b border-zinc-100 pb-3">
        <label htmlFor="listing-template-preview-listing" className="text-xs font-medium text-zinc-600">
          Preview with listing
        </label>
        <select
          id="listing-template-preview-listing"
          value={selected ? selected.listing.id : "sample"}
          onChange={(event) => setSelectedId(event.target.value)}
          className="max-w-64 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs"
        >
          <option value="sample">Sample listing</option>
          {listings.map((option) => (
            <option key={option.listing.id} value={option.listing.id}>
              {option.listing.title}
            </option>
          ))}
        </select>
      </div>
      <ListingTemplateTreeRenderer
        blocks={blocks}
        containerSettings={containerSettings}
        listing={listing}
        regionRows={regionRows}
      />
    </div>
  );
}
