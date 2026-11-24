import { prisma, TENANT_ID } from "@/modules/shared";
import type { Prisma } from "@prisma/client";

type StockItem = { productId: string; quantity: number; variantId?: string | null; meta?: unknown };

async function restoreItems(items: StockItem[]): Promise<void> {
  for (const item of items) {
    const meta = item.meta;
    const isSignupFee =
      meta && typeof meta === "object" && !Array.isArray(meta)
        ? (meta as Record<string, unknown>).isSignupFee === true
        : false;
    if (isSignupFee) continue;
    const rawChildren =
      meta && typeof meta === "object" && !Array.isArray(meta)
        ? (meta as Record<string, unknown>).bundleChildren
        : null;
    if (Array.isArray(rawChildren)) {
      for (const raw of rawChildren) {
        if (!raw || typeof raw !== "object") continue;
        const child = raw as Record<string, unknown>;
        const productId = typeof child.productId === "string" ? child.productId : "";
        const childQuantity = Math.max(1, Math.floor(Number(child.quantity ?? 1)));
        if (!productId || !Number.isFinite(childQuantity)) continue;
        await restoreItems([{ productId, quantity: childQuantity * item.quantity }]);
      }
    }
    if (item.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: item.variantId, productId: item.productId },
        select: { id: true, manageStock: true },
      });
      if (variant?.manageStock) {
        await prisma.productVariant
          .update({
            where: { id: variant.id },
            data: { stockQuantity: { increment: item.quantity } },
          })
          .catch(() => {});
        continue;
      }
    }
    await prisma.product
      .updateMany({
        where: { id: item.productId, tenantId: TENANT_ID, manageStock: true },
        data: { stockQuantity: { increment: item.quantity } },
      })
      .catch(() => {});
  }
}

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

    let variant: { id: string; manageStock: boolean; stockQuantity: number | null; backorders: string } | null = null;
    if (item.variantId) {
      variant = await prisma.productVariant.findFirst({
        where: { id: item.variantId, productId: product.id },
        select: { id: true, manageStock: true, stockQuantity: true, backorders: true },
      });
    }

    const source = variant?.manageStock ? variant : product;
    if (!source.manageStock || source.stockQuantity === null) continue;
    if (source.backorders === "yes" || source.backorders === "notify") continue;

    if (variant?.manageStock) {
      const result = await prisma.productVariant.updateMany({
        where: {
          id: variant.id,
          manageStock: true,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        await restoreItems(reserved);
        const current = await prisma.productVariant.findUnique({
          where: { id: variant.id },
          select: { name: true, stockQuantity: true },
        });
        return {
          ok: false,
          error: `Only ${current?.stockQuantity ?? 0} of “${current?.name ?? product.name}” left in stock.`,
        };
      }
    } else {
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
    }
    reserved.push(item);
  }

  return { ok: true };
}

export async function restoreStockForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    select: { id: true, meta: true, updatedAt: true },
  });
  if (!order) return;

  const meta = (order.meta ?? {}) as Record<string, unknown>;
  if (meta.stockRestored === true) return;

  const claimed = await prisma.order.updateMany({
    where: { id: orderId, updatedAt: order.updatedAt },
    data: { meta: { ...meta, stockRestored: true } as Prisma.InputJsonValue },
  });
  if (claimed.count === 0) return;

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true, meta: true },
  });
  await restoreItems(items);
}
