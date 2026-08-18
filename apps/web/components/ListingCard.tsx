import type { CatalogListing } from "@/lib/directory/catalog";
import { renderLocalizedContent, type RegionContext } from "@/lib/localization/render";

/**
 * Directory listing card. Pass the page's RegionContext so listing copy (which also
 * carries {{region}} tokens) renders correctly — matching the legacy behaviour.
 */
export default function ListingCard({
  listing,
  regionCtx,
}: {
  listing: CatalogListing;
  regionCtx: RegionContext;
}) {
  const isPremium = listing.tier === "PREMIUM";
  const location = [listing.city, listing.state].filter(Boolean).join(", ");
  const summary = listing.summary ? renderLocalizedContent(listing.summary, regionCtx) : null;

  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-900">{listing.title}</h3>
        {isPremium && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Featured
          </span>
        )}
      </div>

      {location && <p className="mt-0.5 text-sm text-zinc-500">{location}</p>}

      {summary && (
        <p
          className="mt-3 text-sm text-zinc-600"
          dangerouslySetInnerHTML={{ __html: summary }}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        {listing.phone && <span className="text-zinc-600">{listing.phone}</span>}
        {listing.website && (
          <a
            href={listing.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
          >
            Visit website
          </a>
        )}
      </div>
    </article>
  );
}