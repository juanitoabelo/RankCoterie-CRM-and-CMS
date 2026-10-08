import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import crypto from "crypto";

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

    // Check lead credits for the listing
    const listingId = data.listingId;
    if (listingId) {
      const credit = await prisma.leadCredit.findUnique({
        where: { tenantId_listingId: { tenantId: TENANT_ID, listingId } },
      });

      if (credit) {
        // Check monthly limit
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Reset monthly counter if new month
        if (credit.monthStart < monthStart) {
          await prisma.leadCredit.update({
            where: { id: credit.id },
            data: { usedThisMonth: 0, monthStart },
          });
        }

        // Check if over limit
        if (credit.usedThisMonth >= credit.monthlyLimit) {
          credit.overageCount += 1;
          await prisma.leadCredit.update({
            where: { id: credit.id },
            data: { overageCount: credit.overageCount },
          });
        }

        // Increment counters
        await prisma.leadCredit.update({
          where: { id: credit.id },
          data: {
            usedThisMonth: { increment: 1 },
            leadCount: { increment: 1 },
          },
        });
      } else {
        // Create credit record if doesn't exist
        await prisma.leadCredit.create({
          data: {
            tenantId: TENANT_ID,
            listingId,
            balance: 0,
            usedThisMonth: 1,
            monthlyLimit: 10, // default
          },
        });
      }
    }

    // Create webhook delivery records for all active endpoints
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { tenantId: TENANT_ID, isActive: true, events: { has: "lead.created" } },
    });

    for (const endpoint of endpoints) {
      await prisma.webhookDelivery.create({
        data: {
          tenantId: TENANT_ID,
          endpointId: endpoint.id,
          event: "lead.created",
          payload: data,
          attempt: 1,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Lead webhook error:", error);
    return NextResponse.json({ error: "Failed to process lead webhook" }, { status: 500 });
  }
}