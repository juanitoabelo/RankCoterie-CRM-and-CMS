import { test, expect, APIRequestContext } from "@playwright/test";
import { prisma } from "@/modules/shared";
import Stripe from "stripe";

const WEBHOOK_SECRET = "whsec_YwJsEcGPvmdaUOCL5Bri5hjBKTnEEG46";

async function createPendingListing() {
  return prisma.listing.create({
    data: {
      tenantId: "tenant-masternet",
      title: `Webhook Test ${Date.now()}`,
      slug: `webhook-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tier: "STANDARD",
      status: "PENDING_REVIEW",
      email: `webhook-${Date.now()}@example.com`,
      categories: { create: [{ categoryId: "sample-cat-01" }] },
      regions: { create: [{ regionId: "CA" }, { regionId: "TX" }, { regionId: "FL" }] },
    },
  });
}

async function sendWebhookEvent(
  request: APIRequestContext,
  event: Record<string, unknown>,
) {
  const payload = JSON.stringify(event);
  const stripe = new Stripe("sk_test_placeholder");
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });

  return request.post("/api/webhooks/stripe", {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
  });
}

test.describe("Stripe webhook", () => {
  test("checkout.session.completed activates a PENDING_REVIEW listing", async ({ request }) => {
    const listing = await createPendingListing();

    const event = {
      id: `evt_${Date.now()}`,
      object: "event",
      api_version: "2025-04-30.basilacium",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          object: "checkout.session",
          metadata: {
            listingId: listing.id,
            tier: "STANDARD",
          },
          client_reference_id: listing.id,
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: "checkout.session.completed",
    };

    const response = await sendWebhookEvent(request, event);
    expect(response.ok()).toBeTruthy();

    const updated = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(updated?.status).toBe("LIVE");
  });

  test("customer.subscription.deleted expires a LIVE listing", async ({ request }) => {
    const listing = await createPendingListing();
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: "LIVE" },
    });

    const event = {
      id: `evt_${Date.now()}`,
      object: "event",
      api_version: "2025-04-30.basilacium",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `sub_${Date.now()}`,
          object: "subscription",
          status: "canceled",
          metadata: { listingId: listing.id },
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: "customer.subscription.deleted",
    };

    const response = await sendWebhookEvent(request, event);
    expect(response.ok()).toBeTruthy();

    const updated = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(updated?.status).toBe("EXPIRED");
  });
});
