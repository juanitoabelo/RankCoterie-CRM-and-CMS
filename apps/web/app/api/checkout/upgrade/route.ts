import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { prisma, TENANT_ID } from "@/modules/shared";
import { readStripeConfig, readListingPaymentConfig } from "@/lib/billing/checkout";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tierId, priceId } = await request.json();

    if (!tierId || !priceId) {
      return NextResponse.json({ error: "Missing tierId or priceId" }, { status: 400 });
    }

    // Get user's claimed listings
    const userListings = await prisma.listing.findMany({
      where: { claimedById: user.id },
      select: { id: true, slug: true, title: true, tier: true, subscription: { select: { stripeCustomerId: true } } },
    });

    if (userListings.length === 0) {
      return NextResponse.json({ error: "No claimed listings found" }, { status: 400 });
    }

    // For simplicity, upgrade the first claimed listing
    // In production, you'd let user select which listing
    const listing = userListings[0];

    // Get Stripe config: prefer listing payment settings, fall back to gateway config, then env.
    const gateway = await prisma.paymentGateway.findFirst({
      where: { type: "STRIPE", isEnabled: true },
    });
    const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } }).catch(() => null);
    const listingCfg = readListingPaymentConfig(tenant?.theme ?? {});

    let stripeSecretKey: string | null = null;
    if (listingCfg?.secretKey) {
      stripeSecretKey = listingCfg.secretKey;
    } else if (gateway) {
      const gwCfg = readStripeConfig(gateway.config);
      stripeSecretKey = gwCfg?.secretKey ?? null;
    } else {
      stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? null;
    }

    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Get or create Stripe customer
    let customerId = listing.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: (await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }))?.email || undefined,
        metadata: { listingId: listing.id, userId: user.id },
      });
      customerId = customer.id;
      await prisma.listingSubscription.upsert({
        where: { listingId: listing.id },
        create: { listingId: listing.id, tier: listing.tier, status: "LIVE", stripeCustomerId: customerId },
        update: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        listingId: listing.id,
        tierId,
        userId: user.id,
      },
      success_url: `${siteUrl}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/upgrade?canceled=true`,
      subscription_data: {
        metadata: {
          listingId: listing.id,
          tierId,
          userId: user.id,
        },
      },
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Upgrade checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}