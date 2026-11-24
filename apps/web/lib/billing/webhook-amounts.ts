export type AmountVerification =
  | { ok: true }
  | { ok: false; reason: "missing_amount" | "amount_mismatch" | "currency_mismatch" | "payment_not_complete" };

type OrderMoney = { total: number; currency: string };
type Money = Record<string, unknown>;

function orderCents(order: OrderMoney): number {
  return Math.round(order.total * 100);
}

function compare(cents: number | null, currency: string | null, order: OrderMoney): AmountVerification {
  if (cents === null || !currency) return { ok: false, reason: "missing_amount" };
  if (currency.trim().toUpperCase() !== order.currency.trim().toUpperCase()) {
    return { ok: false, reason: "currency_mismatch" };
  }
  if (!Number.isFinite(cents) || cents !== orderCents(order)) {
    return { ok: false, reason: "amount_mismatch" };
  }
  return { ok: true };
}

function minorAmount(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? Math.round(number) : null;
}

function majorToCents(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? Math.round(number * 100) : null;
}

function moneyObject(value: unknown): Money | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Money) : null;
}

export function verifyStripeCheckoutAmount(
  session: { amount_total?: number | null; currency?: string | null; payment_status?: string | null },
  order: OrderMoney,
): AmountVerification {
  if (session.payment_status && session.payment_status !== "paid") {
    return { ok: false, reason: "payment_not_complete" };
  }
  const currency = typeof session.currency === "string" ? session.currency : null;
  return compare(minorAmount(session.amount_total), currency, order);
}

export function verifyPaypalCaptureAmount(
  resource: Money | null | undefined,
  order: OrderMoney,
): AmountVerification {
  const amount = moneyObject(resource?.amount);
  const purchaseUnit = Array.isArray(resource?.purchase_units)
    ? moneyObject(resource.purchase_units[0])
    : null;
  const unitAmount = purchaseUnit ? moneyObject(purchaseUnit.amount) : null;
  const source = amount ?? unitAmount;
  const value = source?.value ?? source?.amount;
  const currency = typeof source?.currency_code === "string" ? source.currency_code : null;
  return compare(majorToCents(value), currency, order);
}

export function verifySquarePaymentAmount(
  source: Money | null | undefined,
  order: OrderMoney,
): AmountVerification {
  const amount = moneyObject(source?.amount_money) ?? moneyObject(source?.total_money);
  const value = amount ? minorAmount(amount.amount) : null;
  const currency = amount && typeof amount.currency === "string" ? amount.currency : null;
  return compare(value, currency, order);
}
