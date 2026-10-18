/**
 * Company listing activation from invoices (Path A — admin-generated payment links).
 *
 * When an invoice linked to a company landing page (Invoice.listingId) is
 * marked APPROVED — via the Stripe payment-link webhook or an admin override —
 * the page flips LIVE and gets its ListingSubscription row, unlocking the tier.
 * The tier is whatever the admin configured on the page; the invoice settles it.
 *
 * Idempotent: an already-LIVE page is left untouched (returns true).
 */
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";

export async function activateListingFromInvoice(
  invoice: { id: string; listingId: string | null },
  source: string,
): Promise<boolean> {
  if (!invoice.listingId) return false;

  const listing = await prisma.listing.findUnique({
    where: { id: invoice.listingId },
    select: { id: true, tier: true, status: true, isLandingPage: true, title: true },
  });
  if (!listing || !listing.isLandingPage) return false;
  if (listing.status === "LIVE") return true; // idempotent

  const approvedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listing.id }, data: { status: "LIVE" } });
    const data = {
      listingId: listing.id,
      tier: listing.tier,
      status: "LIVE" as const,
      approvedAt,
    };
    await tx.listingSubscription.upsert({
      where: { listingId: listing.id },
      create: data,
      update: { tier: data.tier, status: data.status, approvedAt },
    });
  });

  await logAudit({
    action: "LISTING_APPROVE",
    entity: "CompanyListing",
    entityId: listing.id,
    reason: `Invoice ${invoice.id} paid — company page set LIVE`,
    meta: { invoiceId: invoice.id, tier: listing.tier, source },
  });
  return true;
}
