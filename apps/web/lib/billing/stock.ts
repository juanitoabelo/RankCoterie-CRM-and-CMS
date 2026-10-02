/**
 * Stock reservation for checkout.
 *
 * Decrements are conditional (compare-and-set) so concurrent checkouts
 * cannot oversell; restores are idempotent via an order meta flag.
 */
import { prisma, TENANT_ID } from "@/modules/shared";
import type { Prisma } from "@prisma/client";

type StockItem = { productId: string; quantity: number };

async function restoreItems(items: StockItem[]): Promise<void> {
  for (const item of items) {
    await prisma.product
      .updateMany({
        where: { id: item.productId, tenantId: TENANT_ID, manageStock: true },
        data: { stockQuantity: { increment: item.quantity } },
      })
      .catch(() => {});
  }
}

/**
 * Atomically reserve stock for each managed line. On any failure, lines
 * already decremented are rolled back and a customer-facing error returns.
 */
export async function reserveStock(
  items: StockItem[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const reserved: StockItem[] = [];

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, tenantId: TENANT_ID },
      select: { id: true, name: true, manageStock: true, stockQuantity: true, backorders: true },
    });
    if (!product) {
      await restoreItems(reserved);
      return { ok: false, error: "One or more products in your order are no longer available." };
    }
    if (!product.manageStock || product.stockQuantity === null) continue;
    // Backorders allowed ("yes"/"notify") — deliberately oversell.
    if (product.backorders === "yes" || product.backorders === "notify") continue;

    const result = await prisma.product.updateMany({
      where: {
        id: product.id,
        tenantId: TENANT_ID,
        manageStock: true,
        stockQuantity: { gte: item.quantity },
      },
      data: { stockQuantity: { decrement: item.quantity } },
    });
    if (result.count === 0) {
      await restoreItems(reserved);
      const current = await prisma.product.findFirst({
        where: { id: product.id },
        select: { name: true, stockQuantity: true },
      });
      return {
        ok: false,
        error: `Only ${current?.stockQuantity ?? 0} of “${current?.name ?? "an item"}” left in stock.`,
      };
    }
    reserved.push(item);
  }

  return { ok: true };
}

/**
 * Give an order's stock back (idempotent — guarded by meta.stockRestored).
 * Used when an order is cancelled, payment is abandoned, or checkout rolls back.
 */
export async function restoreStockForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findFirst({ where: { id: orderId } });
  if (!order) return;

  const meta = (order.meta ?? {}) as Record<string, unknown>;
  if (meta.stockRestored === true) return;

  // Claim the restore first so concurrent calls cannot double-increment.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, NOT: { meta: { path: ["stockRestored"], equals: true } } },
    data: { meta: { ...meta, stockRestored: true } as Prisma.InputJsonValue },
  });
  if (claimed.count === 0) return;

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true },
  });
  for (const item of items) {
    await prisma.product
      .updateMany({
        where: { id: item.productId, tenantId: TENANT_ID, manageStock: true },
        data: { stockQuantity: { increment: item.quantity } },
      })
      .catch(() => {});
  }
}
