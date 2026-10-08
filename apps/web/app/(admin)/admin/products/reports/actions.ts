"use server";

import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import { format } from "date-fns";

export async function getEcommerceReportData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    totalOrders,
    totalRevenue,
    avgOrderValue,
    paidOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    refundedOrders,
    topProducts,
    revenueByCategory,
    dailySales,
    dailyOrders,
    conversionData,
  ] = await Promise.all([
    prisma.order.count({ where: { tenantId: TENANT_ID } }),

    prisma.order.aggregate({
      where: { tenantId: TENANT_ID, paymentStatus: "PAID" },
      _sum: { total: true },
    }),

    prisma.order.aggregate({
      where: { tenantId: TENANT_ID, paymentStatus: "PAID" },
      _avg: { total: true },
    }),

    prisma.order.count({ where: { tenantId: TENANT_ID, paymentStatus: "PAID" } }),

    prisma.order.count({ where: { tenantId: TENANT_ID, paymentStatus: "PENDING" } }),

    prisma.order.count({ where: { tenantId: TENANT_ID, status: "COMPLETED" } }),

    prisma.order.count({ where: { tenantId: TENANT_ID, status: "CANCELLED" } }),

    prisma.order.count({ where: { tenantId: TENANT_ID, status: "REFUNDED" } }),

    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { tenantId: TENANT_ID, paymentStatus: "PAID" } },
      _sum: { lineTotal: true, quantity: true },
      _count: { id: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 10,
    }),

    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { tenantId: TENANT_ID, paymentStatus: "PAID" } },
      _sum: { lineTotal: true },
    }),

    prisma.$queryRaw`
      SELECT DATE("createdAt") as date, SUM(total) as revenue, COUNT(*) as orders
      FROM "Order"
      WHERE "tenantId" = ${TENANT_ID}
        AND "paymentStatus" = 'PAID'
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,

    prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as orders
      FROM "Order"
      WHERE "tenantId" = ${TENANT_ID}
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,

    prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "Order" WHERE "tenantId" = ${TENANT_ID} AND "createdAt" >= ${thirtyDaysAgo}) as total_created,
        (SELECT COUNT(*) FROM "Order" WHERE "tenantId" = ${TENANT_ID} AND "paymentStatus" = 'PAID' AND "createdAt" >= ${thirtyDaysAgo}) as paid,
        (SELECT COUNT(*) FROM "Order" WHERE "tenantId" = ${TENANT_ID} AND status = 'COMPLETED' AND "createdAt" >= ${thirtyDaysAgo}) as completed
    `,
  ]);

  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const categoryProductIds = revenueByCategory.map((r) => r.productId);
  const categoryProducts = await prisma.product.findMany({
    where: { id: { in: categoryProductIds } },
    include: { categories: { include: { category: true } } },
  });
  const productCategoryMap = new Map(
    categoryProducts.map((p) => [
      p.id,
      p.categories[0]?.category?.name ?? "Uncategorized",
    ])
  );

  const categoryRevenue = new Map<string, number>();
  for (const item of revenueByCategory) {
    const cat = productCategoryMap.get(item.productId) ?? "Uncategorized";
    const revenue = Number(item._sum.lineTotal ?? 0);
    categoryRevenue.set(cat, (categoryRevenue.get(cat) ?? 0) + revenue);
  }

  return {
    summary: {
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      avgOrderValue: Number(avgOrderValue._avg.total ?? 0),
      paidOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      refundedOrders,
      conversionRate:
        totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(1) : "0",
    },
    topProducts: topProducts.map((p) => ({
      product: productMap.get(p.productId) ?? { name: "Unknown", slug: "" },
      revenue: Number(p._sum.lineTotal ?? 0),
      quantity: p._sum.quantity ?? 0,
      orderCount: p._count.id,
    })),
    revenueByCategory: Array.from(categoryRevenue.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    dailySales: (dailySales as any[]).map((d) => ({
      date: format(new Date(d.date), "MMM d"),
      revenue: Number(d.revenue),
      orders: Number(d.orders),
    })),
    dailyOrders: (dailyOrders as any[]).map((d) => ({
      date: format(new Date(d.date), "MMM d"),
      orders: Number(d.orders),
    })),
    funnel: (conversionData as any[])[0] ?? { total_created: 0, paid: 0, completed: 0 },
  };
}