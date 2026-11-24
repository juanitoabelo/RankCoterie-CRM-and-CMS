type OrderItemLike = {
  id: string;
  name: string;
  quantity: number;
  lineTotal: number;
};

type OrderLike = {
  id: string;
  orderNumber: string;
  paymentStatus: string;
  status: string;
  total: number;
  currency: string;
  createdAt: Date;
  items: OrderItemLike[];
};

export type OrderLookupView = {
  orderNumber: string;
  paymentStatus: string;
  status: string;
  total: number;
  currency: string;
  placedAt: string;
  items: Array<{ id: string; name: string; quantity: number; lineTotal: number }>;
};

type DownloadGrantLike = {
  id: string;
  token: string;
  name: string;
  expiresAt: Date | null;
  downloadLimit: number | null;
  downloadsUsed: number;
};

export type DownloadGrantView = {
  id: string;
  name: string;
  remaining: number | null;
  expiresAt: string | null;
  expired: boolean;
  available: boolean;
  downloadPath: string;
};

export function toOrderLookupView(order: OrderLike): OrderLookupView {
  return {
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    status: order.status,
    total: order.total,
    currency: order.currency,
    placedAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
  };
}

export function toDownloadGrantView(grant: DownloadGrantLike, now: Date = new Date()): DownloadGrantView {
  const expired = Boolean(grant.expiresAt && grant.expiresAt.getTime() <= now.getTime());
  const remaining = grant.downloadLimit === null ? null : Math.max(0, grant.downloadLimit - grant.downloadsUsed);
  const available = !expired && remaining !== 0;
  return {
    id: grant.id,
    name: grant.name,
    remaining,
    expiresAt: grant.expiresAt?.toISOString() ?? null,
    expired,
    available,
    downloadPath: `/api/downloads/${grant.token}`,
  };
}

export function withReissuedDownloadToken<T extends DownloadGrantLike>(
  grant: T,
  token: string,
): T {
  return { ...grant, token, downloadsUsed: 0 };
}
