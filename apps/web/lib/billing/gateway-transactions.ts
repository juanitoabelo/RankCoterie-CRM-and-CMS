import type { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { logStructured } from "@/lib/observability";
import { prisma, TENANT_ID } from "@/modules/shared";

export interface GatewayTransactionInput {
  orderId: string;
  gatewayId: string | null;
  amount: number;
  currency: string;
  status: "PAID" | "FAILED" | "PENDING";
  gatewayTransactionId: string | null;
  gatewayResponse?: Record<string, unknown>;
  eventId?: string | null;
}

export async function recordGatewayTransaction(input: GatewayTransactionInput): Promise<boolean> {
  const context = {
    orderId: input.orderId,
    eventId: input.eventId ?? null,
    gatewayTransactionId: input.gatewayTransactionId,
  };
  if (!input.gatewayId) {
    logStructured({
      level: "error",
      message: "gateway_transaction_persist_failed",
      context: { ...context, error: "missing gateway id" },
    });
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: input.orderId,
      reason: "Gateway transaction not persisted: no payment gateway on order",
      meta: context,
    }).catch(() => {});
    return false;
  }

  const data = {
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    status: input.status,
    gatewayTransactionId: input.gatewayTransactionId,
    gatewayResponse: (input.gatewayResponse ?? {}) as Prisma.InputJsonValue,
    metadata: { ...(input.eventId ? { eventId: input.eventId } : {}) } as Prisma.InputJsonValue,
  };

  try {
    const existing = input.gatewayTransactionId
      ? await prisma.paymentTransaction.findFirst({
          where: {
            tenantId: TENANT_ID,
            orderId: input.orderId,
            gatewayTransactionId: input.gatewayTransactionId,
          },
        })
      : null;
    if (existing) {
      await prisma.paymentTransaction.update({ where: { id: existing.id }, data });
    } else {
      await prisma.paymentTransaction.create({
        data: {
          ...data,
          tenantId: TENANT_ID,
          gatewayId: input.gatewayId,
          orderId: input.orderId,
        },
      });
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStructured({
      level: "error",
      message: "gateway_transaction_persist_failed",
      context: { ...context, error: message },
    });
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: input.orderId,
      reason: `Gateway transaction not persisted: ${message}`,
      meta: context,
    }).catch(() => {});
    return false;
  }
}
