/**
 * Region-page template view — resolves the GeoCategory single-page template
 * for a state/city page and assembles every live value the renderer needs
 * (region bindings, state index, region FAQ, region listings).
 *
 * Used by /g/[category]/[region]/ and its /page/N/ variant so both render
 * exactly like the template built in the admin builder. Returns null when no
 * template (or an empty block tree) exists — callers fall back to their
 * legacy layout.
 */

import type { Block } from "@/lib/page-builder/types";
import type {
  CatalogCategory,
  CatalogCategoryImage,
  CatalogRegion,
  CatalogRepo,
  CategoryRegionContent,
} from "./catalog";
import { filterIndexableRegions } from "./indexGate";
import { getListingPage } from "./listingQuery";
import { renderLocalizedContent, type RegionContext } from "@/lib/localization/render";
import { geoRegionUrl } from "@/lib/seo/geoCategorySeo";
import {
  parseGeoCategoryTemplateData,
  resolveGeoCategoryTemplate,
} from "@/modules/geo-category-template";
import type { ContainerSettings } from "@/lib/geo-category-template/types";
import type { GeoBindingData } from "@/lib/geo-category-template/geo-bindings";
import type {
  GeoFaqItem,
  GeoStateLink,
  GeoTemplateListing,
} from "@/components/admin/geo-category-template-builder/GeoCategoryTemplateRenderer";

export type RegionFaqItem = GeoFaqItem;

/**
 * FAQ match rule shared by both region routes — same (state, areaPart)
 * resolution as resolveContent, token-rendered per region. The FAQPage
 * JSON-LD on the base region page mirrors exactly this list.
 */
export function resolveRegionFaqs(
  contents: CategoryRegionContent[],
  reg: Pick<CatalogRegion, "city" | "state" | "areaPart">,
  ctx: RegionContext,
): RegionFaqItem[] {
  const stateContents = contents.filter((c) => c.state === reg.state);
  const matchedFaqRow =
    reg.city === null
      ? stateContents.find((c) => c.areaPart === "ALL")
      : stateContents.find((c) => c.areaPart === reg.areaPart);
  return (matchedFaqRow?.faq ?? [])
    .map((f) => ({
      q: renderLocalizedContent(f.q, ctx),
      a: renderLocalizedContent(f.a, ctx),
    }))
    .filter((f) => f.q.trim() && f.a.trim());
}

export interface RegionTemplateView {
  blocks: Block[];
  containerSettings: ContainerSettings;
  geo: GeoBindingData;
  states: GeoStateLink[];
  faq: GeoFaqItem[];
  listings: GeoTemplateListing[];
}

export async function resolveRegionTemplateView({
  repo,
  cat,
  reg,
  ctx,
  introHtml,
  descHtml,
  faqs,
  heroImage,
}: {
  repo: CatalogRepo;
  cat: CatalogCategory;
  reg: CatalogRegion;
  ctx: RegionContext;
  /** Region-resolved parent intro (tokens rendered for this region). */
  introHtml: string;
  /** Region-resolved description — merged into the hero's description. */
  descHtml: string;
  faqs: RegionFaqItem[];
  /** STATE/CITY position image for this region (hero fallback + bindings). */
  heroImage: CatalogCategoryImage | null;
}): Promise<RegionTemplateView | null> {
  const template = await resolveGeoCategoryTemplate(cat.id);
  if (!template) return null;
  const { blocks, containerSettings } = parseGeoCategoryTemplateData(template.data);
  if (blocks.length === 0) return null;

  const exclusions = await repo.getExclusions();
  const [allRegions, listingPage] = await Promise.all([
    repo.getRegions(),
    getListingPage(repo, { categoryId: cat.id, regionId: reg.id }, { exclusions }),
  ]);

  // Same index-gated state index as the parent page — feeds geoRegionNav
  // and the sidebar's "Programs by state" widget on region pages.
  const states = await filterIndexableRegions(
    repo,
    cat.id,
    allRegions.filter((r) => r.city === null),
  );
  const stateLinks: GeoStateLink[] = states.map((s) => ({
    slug: s.slug,
    state: s.state,
    stateFull: s.stateFull,
    url: `/g/${cat.slug}/${s.slug}/`,
  }));

  const listings: GeoTemplateListing[] = listingPage.visible.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    href: `/listing/${l.slug}/`,
    summary: renderLocalizedContent(l.summary, ctx),
    city: l.city,
    state: l.state,
    image: l.avatarImage ? `/api/assets/${l.avatarImage}` : null,
    tier: l.tier,
  }));

  const heroUrl = heroImage ? `/api/assets/${heroImage.imageAssetId}` : null;
  const geo: GeoBindingData = {
    category: {
      title: cat.title,
      slug: cat.slug,
      // Hero description carries the region's resolved intro + description
      // (the legacy region layout showed both right under the breadcrumb).
      description: [introHtml, descHtml].filter(Boolean).join(""),
      stateInit: renderLocalizedContent(cat.stateInit, ctx),
      cityInit: renderLocalizedContent(cat.cityInit, ctx),
      metaDesc: cat.metaDesc,
      seoTitle: cat.seoTitle,
      focusKeyphrase: cat.focusKeyphrase,
    },
    region: {
      slug: reg.slug,
      state: reg.state,
      stateFull: reg.stateFull,
      city: reg.city,
      displayName: reg.city ? `${reg.city}, ${reg.state}` : reg.stateFull,
      url: geoRegionUrl(cat.slug, reg.slug),
    },
    categoryUrl: geoRegionUrl(cat.slug, reg.slug),
    heroImage: heroUrl,
    heroImageAlt: heroImage?.alt || heroImage?.title || null,
    heroImageCaption: heroImage?.caption || null,
    stateImage: heroUrl && reg.city === null ? heroUrl : null,
    cityImage: heroUrl && reg.city !== null ? heroUrl : null,
    statesCount: states.length,
    listingsCount: listingPage.total,
  };

  return {
    blocks: blocks as unknown as Block[],
    containerSettings,
    geo,
    states: stateLinks,
    faq: faqs,
    listings,
  };
}
