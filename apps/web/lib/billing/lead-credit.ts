/**
 * Lead-credit ledger + outbound lead.created delivery fan-out.
 *
 * Shared by the public lead-capture API (`/api/leads`) and the legacy
 * inbound webhook (`/api/webhooks/lead`) so both consume credits the same way.
 */
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";

const DEFAULT_MONTHLY_LIMIT = 10;

export interface LeadCreditResult {
  counted: boolean;
  overLimit: boolean;
}

/** Record one consumed lead against the listing's monthly credit bucket. */
export async function consumeLeadCredit(listingId: string): Promise<LeadCreditResult> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const credit = await prisma.leadCredit.findUnique({
    where: { tenantId_listingId: { tenantId: TENANT_ID, listingId } },
  });

  if (!credit) {
    await prisma.leadCredit.create({
      data: {
        tenantId: TENANT_ID,
        listingId,
        usedThisMonth: 1,
        monthlyLimit: DEFAULT_MONTHLY_LIMIT,
      },
    });
    return { counted: true, overLimit: false };
  }

  const staleMonth = credit.monthStart < monthStart;
  const used = staleMonth ? 0 : credit.usedThisMonth;
  const overLimit = used >= credit.monthlyLimit;

  await prisma.leadCredit.update({
    where: { id: credit.id },
    data: {
      ...(staleMonth ? { monthStart, usedThisMonth: 1 } : { usedThisMonth: { increment: 1 } }),
      ...(overLimit ? { overageCount: { increment: 1 } } : {}),
    },
  });
  return { counted: true, overLimit };
}

/** Fan out a lead.created WebhookDelivery row for every subscribed endpoint. */
export async function enqueueLeadCreatedDeliveries(payload: Record<string, unknown>): Promise<number> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { tenantId: TENANT_ID, isActive: true, events: { has: "lead.created" } },
  });
  for (const endpoint of endpoints) {
    await prisma.webhookDelivery.create({
      data: {
        tenantId: TENANT_ID,
        endpointId: endpoint.id,
        event: "lead.created",
        payload: payload as Prisma.InputJsonValue,
        attempt: 1,
        status: "PENDING",
      },
    });
  }
  return endpoints.length;
}
