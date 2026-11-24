"use server";

import { randomUUID } from "node:crypto";
import { prisma, TENANT_ID } from "@/modules/shared";
import { readExistingCartSession } from "@/lib/cart-session";
import {
  orderAccessTokenMatchesOrder,
  verifyOrderAccessToken,
} from "@/lib/checkout/order-access";
import {
  toDownloadGrantView,
  toOrderLookupView,
  withReissuedDownloadToken,
  type DownloadGrantView,
  type OrderLookupView,
} from "@/lib/checkout/customer-access";

export type OrderAccessResult =
  | {
      ok: true;
      order: OrderLookupView;
      downloads: DownloadGrantView[];
    }
  | { ok: false; error: string };

async function authorizedOrder(orderId: string, access: string | null) {
  const payload = await verifyOrderAccessToken(access, { orderId, tenantId: TENANT_ID });
  if (!payload) return null;
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: TENANT_ID },
    include: { items: true },
  });
  if (!order) return null;
  const sessionId = await readExistingCartSession().catch(() => null);
  if (!orderAccessTokenMatchesOrder(payload, order, sessionId)) return null;
  return order;
}

export async function lookupOrderWithAccess(
  orderId: string,
  access: string,
): Promise<OrderAccessResult> {
  const id = orderId.trim();
  if (!id) return { ok: false, error: "Enter your order access code." };
  const order = await authorizedOrder(id, access);
  if (!order) return { ok: false, error: "This order link is invalid or has expired." };

  const grants = order.paymentStatus === "PAID"
    ? await prisma.digitalDownloadGrant.findMany({
        where: { tenantId: TENANT_ID, orderId: id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return {
    ok: true,
    order: toOrderLookupView(order),
    downloads: grants.map((grant) => toDownloadGrantView(grant)),
  };
}

export async function reissueDownloadForOrder(
  orderId: string,
  access: string,
  grantId: string,
): Promise<{ ok: true; grant: DownloadGrantView } | { ok: false; error: string }> {
  const order = await authorizedOrder(orderId, access);
  if (!order) return { ok: false, error: "This order link is invalid or has expired." };
  const grant = await prisma.digitalDownloadGrant.findFirst({
    where: { id: grantId, tenantId: TENANT_ID, orderId: order.id },
  });
  if (!grant) return { ok: false, error: "Download not found." };

  const reissued = withReissuedDownloadToken(grant, randomUUID());
  const updated = await prisma.digitalDownloadGrant.update({
    where: { id: grant.id },
    data: { token: reissued.token, downloadsUsed: reissued.downloadsUsed },
  });
  return { ok: true, grant: toDownloadGrantView(updated) };
}
