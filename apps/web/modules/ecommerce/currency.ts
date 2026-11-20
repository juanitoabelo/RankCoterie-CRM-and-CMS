export const STORE_CURRENCY = "USD";

export function formatMoney(
  amount: number,
  currency: string = STORE_CURRENCY,
  locale = "en-US",
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(safeAmount);
  } catch {
    return `${currency} ${safeAmount.toFixed(2)}`;
  }
}
