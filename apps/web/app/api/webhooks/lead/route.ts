import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import crypto from "crypto";
import { consumeLeadCredit, enqueueLeadCreatedDeliveries } from "@/lib/billing/lead-credit";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-webhook-signature");
    const body = await request.text();
    const data = JSON.parse(body);

    // Verify webhook signature if secret is configured
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { tenantId: TENANT_ID, isActive: true, events: { has: "lead.created" } },
    });

    if (endpoint?.secretKey && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", endpoint.secretKey)
        .update(body)
        .digest("hex");
      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Count the lead against the listing's monthly credits (shared ledger logic).
    const listingId = data.listingId;
    if (typeof listingId === "string" && listingId) {
      await consumeLeadCredit(listingId);
    }

    // Queue delivery records for all subscribed endpoints.
    await enqueueLeadCreatedDeliveries(data);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Lead webhook error:", error);
    return NextResponse.json({ error: "Failed to process lead webhook" }, { status: 500 });
  }
}
