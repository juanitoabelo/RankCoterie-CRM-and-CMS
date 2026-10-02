"use server";

import { prisma, TENANT_ID } from "@/modules/shared";

export type OrderLookupResult =
  | {
      ok: true;
      order: {
        orderNumber: string;
        status: string;
        paymentStatus: string;
        fulfillmentStatus: string;
        total: number;
        currency: string;
        createdAt: string;
        paidAt: string | null;
        items: { name: string; quantity: number; price: number }[];
        tracking: { carrier?: string; trackingNumber?: string; trackingUrl?: string } | null;
      };
    }
  | { ok: false; error: string };

export type OrderSummary = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  itemCount: number;
};

export type OrderHistoryResult =
  | { ok: true; orders: OrderSummary[] }
  | { ok: false; error: string };

/**
 * All orders for an email address (guest billing email or account email).
 * This is the storefront "order history" — no account required.
 */
export async function lookupOrdersByEmail(email: string): Promise<OrderHistoryResult> {
  const mail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        tenantId: TENANT_ID,
        OR: [
          { guestEmail: { equals: mail, mode: "insensitive" } },
          { billingEmail: { equals: mail, mode: "insensitive" } },
          { user: { email: { equals: mail, mode: "insensitive" } } },
          { customer: { email: { equals: mail, mode: "insensitive" } } },
        ],
      },
      include: { items: { select: { quantity: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      ok: true,
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

const GENERIC_ERROR = "We couldn't find an order matching those details.";

/**
 * Look up a guest or account order by order number + email.
 * Both are required so order details are never exposed by number alone.
 */
export async function lookupOrder(
  orderNumber: string,
  email: string,
): Promise<OrderLookupResult> {
  const num = orderNumber.trim();
  const mail = email.trim().toLowerCase();
  if (!num || !mail) return { ok: false, error: GENERIC_ERROR };

  try {
    const order = await prisma.order.findFirst({
      where: { tenantId: TENANT_ID, orderNumber: num },
      include: { items: true, customer: true, user: true },
    });
    if (!order) return { ok: false, error: GENERIC_ERROR };

    const emails = [
      order.guestEmail,
      order.billingEmail,
      order.customer?.email,
      order.user?.email,
    ]
      .filter((e): e is string => typeof e === "string" && e.length > 0)
      .map((e) => e.toLowerCase());
    if (!emails.includes(mail)) return { ok: false, error: GENERIC_ERROR };

    const fulfillment = ((order.meta ?? {}) as Record<string, unknown>).fulfillment as
      | { carrier?: string; trackingNumber?: string; trackingUrl?: string }
      | undefined;

    return {
      ok: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        tracking:
          fulfillment && fulfillment.trackingNumber
            ? {
                carrier: fulfillment.carrier,
                trackingNumber: fulfillment.trackingNumber,
                trackingUrl: fulfillment.trackingUrl,
              }
            : null,
      },
    };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}
