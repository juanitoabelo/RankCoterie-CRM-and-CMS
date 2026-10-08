"use server";

import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { readListingPaymentConfig } from "@/lib/billing/checkout";
import {
  churnRate,
  computeMrr,
  groupInvoicesByMonth,
  monthlyPriceForTier,
  newSubscriptions,
  parseTierAmount,
  renewalValue,
  summarizeSubscriptions,
  totalInvoices,
  upcomingRenewals,
  type ListingSubLike,
  type TierAmountMap,
} from "@/lib/billing/listing-revenue";
import { fetchListingInvoices } from "@/lib/billing/stripe-listing-report";
import type { ListingReportsData, RenewalRow, SubscriptionRow } from "./types";

/**
 * Listing subscription revenue report.
 *
 * Local Prisma rows give the lifecycle picture (tiers, statuses, renewals,
 * churn); Stripe supplies the actual money in/out. If Stripe is unconfigured or
 * errors, the local metrics still render and the money fields read as zero.
 */
export async function getListingReportsData(): Promise<ListingReportsData> {
  await requireSection("reports");

  const [tenant, subscriptions] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: TENANT_ID } }).catch(() => null),
    prisma.listingSubscription.findMany({
      where: { listing: { tenantId: TENANT_ID } },
      include: { listing: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cfg = readListingPaymentConfig(tenant?.theme ?? {});
  const amounts: TierAmountMap = {
    STANDARD: parseTierAmount(cfg?.standardAmount ?? 97),
    PREMIUM: parseTierAmount(cfg?.premiumAmount ?? 197),
  };

  const subLikes: ListingSubLike[] = subscriptions.map((s) => ({
    id: s.id,
    tier: s.tier,
    status: s.status,
    createdAt: s.createdAt,
    currentPeriodEnd: s.currentPeriodEnd,
    canceledAt: s.canceledAt,
    stripeSubId: s.stripeSubId,
  }));

  const lifecycle = summarizeSubscriptions(subLikes);
  const mrr = computeMrr(subLikes, amounts);
  const renewalsRaw = upcomingRenewals(subLikes, 30);
  const renewals30Value = renewalValue(amounts, renewalsRaw);
  const churn30 = churnRate(subLikes, 30);
  const new30 = newSubscriptions(subLikes, 30);

  // Live Stripe pull (money in/out) — scoped to the listing subscriptions.
  const stripeResult = await fetchListingInvoices(
    subscriptions.map((s) => s.stripeSubId).filter((id): id is string => Boolean(id)),
  );
  const totals = totalInvoices(stripeResult.invoices);
  const monthly = groupInvoicesByMonth(stripeResult.invoices, 12);

  const titleById = new Map(subscriptions.map((s) => [s.id, s.listing.title]));
  const listingById = new Map(subscriptions.map((s) => [s.id, s.listing.id]));

  const rows: SubscriptionRow[] = subscriptions.map((s) => ({
    id: s.id,
    listingId: s.listing.id,
    title: s.listing.title,
    tier: s.tier,
    status: s.status,
    stripeSubId: s.stripeSubId,
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    paymentGraceUntil: s.paymentGraceUntil?.toISOString() ?? null,
    canceledAt: s.canceledAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    mrr: monthlyPriceForTier(s.tier, amounts),
  }));

  const renewals: RenewalRow[] = renewalsRaw.map((r) => ({
    id: r.id ?? null,
    listingId: (r.id && listingById.get(r.id)) ?? "",
    title: (r.id && titleById.get(r.id)) ?? "Unknown listing",
    tier: r.tier,
    currentPeriodEnd: r.currentPeriodEnd,
    daysUntil: r.daysUntil,
    value: monthlyPriceForTier(r.tier, amounts),
  }));

  const byTier = ["STANDARD", "PREMIUM", "FREE"].map((tier) => {
    const count = lifecycle.byTier[tier] ?? 0;
    return { tier, count, mrr: tier === "FREE" ? 0 : count * monthlyPriceForTier(tier, amounts) };
  });

  const byStatus = Object.entries(lifecycle.byStatus)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return {
    generatedAt: new Date().toISOString(),
    stripeConfigured: stripeResult.configured,
    stripeError: stripeResult.error,
    currency: stripeResult.currency,
    amounts: { currency: stripeResult.currency, standard: amounts.STANDARD, premium: amounts.PREMIUM },
    summary: {
      total: lifecycle.total,
      active: lifecycle.active,
      suspended: lifecycle.suspended,
      expired: lifecycle.expired,
      inGrace: lifecycle.inGrace,
      standard: lifecycle.byTier.STANDARD ?? 0,
      premium: lifecycle.byTier.PREMIUM ?? 0,
      free: lifecycle.byTier.FREE ?? 0,
      mrr,
      arr: mrr * 12,
      arpu: lifecycle.active > 0 ? mrr / lifecycle.active : 0,
      new30,
      churn30,
      renewals30: renewalsRaw.length,
      renewals30Value,
      collected: totals.collected,
      refunded: totals.refunded,
      net: totals.net,
      paidInvoices: totals.paidInvoices,
      failedInvoices: totals.failedInvoices,
    },
    byTier,
    byStatus,
    monthly,
    subscriptions: rows,
    renewals,
  };
}
