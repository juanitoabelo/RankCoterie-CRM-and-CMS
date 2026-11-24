import { describe, expect, it } from "vitest";
import {
  verifyPaypalCaptureAmount,
  verifySquarePaymentAmount,
  verifyStripeCheckoutAmount,
} from "./webhook-amounts";

const order = { total: 42.75, currency: "USD" };

describe("verifyStripeCheckoutAmount", () => {
  it("accepts an exact minor-unit amount and currency", () => {
    expect(
      verifyStripeCheckoutAmount(
        { amount_total: 4275, currency: "usd", payment_status: "paid" },
        order,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects a mismatched amount, currency, or unpaid session", () => {
    expect(
      verifyStripeCheckoutAmount({ amount_total: 4200, currency: "usd" }, order),
    ).toMatchObject({ ok: false, reason: "amount_mismatch" });
    expect(
      verifyStripeCheckoutAmount({ amount_total: 4275, currency: "EUR" }, order),
    ).toMatchObject({ ok: false, reason: "currency_mismatch" });
    expect(
      verifyStripeCheckoutAmount({ amount_total: 4275, currency: "USD", payment_status: "unpaid" }, order),
    ).toMatchObject({ ok: false, reason: "payment_not_complete" });
    expect(verifyStripeCheckoutAmount({}, order)).toMatchObject({ ok: false, reason: "missing_amount" });
  });
});

describe("verifyPaypalCaptureAmount", () => {
  it("accepts a capture whose value and currency match the order", () => {
    expect(
      verifyPaypalCaptureAmount({ amount: { value: "42.75", currency_code: "USD" } }, order),
    ).toEqual({ ok: true });
    expect(
      verifyPaypalCaptureAmount(
        { purchase_units: [{ amount: { value: 42.75, currency_code: "usd" } }] },
        order,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects wrong amounts, currencies and missing values", () => {
    expect(
      verifyPaypalCaptureAmount({ amount: { value: "41.75", currency_code: "USD" } }, order),
    ).toMatchObject({ ok: false, reason: "amount_mismatch" });
    expect(
      verifyPaypalCaptureAmount({ amount: { value: "42.75", currency_code: "EUR" } }, order),
    ).toMatchObject({ ok: false, reason: "currency_mismatch" });
    expect(verifyPaypalCaptureAmount({}, order)).toMatchObject({ ok: false, reason: "missing_amount" });
  });
});

describe("verifySquarePaymentAmount", () => {
  it("accepts matching minor-unit amounts and currency", () => {
    expect(
      verifySquarePaymentAmount({ amount_money: { amount: 4275, currency: "USD" } }, order),
    ).toEqual({ ok: true });
    expect(verifySquarePaymentAmount({ total_money: { amount: 4275, currency: "usd" } }, order)).toEqual({
      ok: true,
    });
  });

  it("rejects mismatches and absent money", () => {
    expect(
      verifySquarePaymentAmount({ amount_money: { amount: 4200, currency: "USD" } }, order),
    ).toMatchObject({ ok: false, reason: "amount_mismatch" });
    expect(
      verifySquarePaymentAmount({ amount_money: { amount: 4275, currency: "CAD" } }, order),
    ).toMatchObject({ ok: false, reason: "currency_mismatch" });
    expect(verifySquarePaymentAmount(null, order)).toMatchObject({ ok: false, reason: "missing_amount" });
  });
});
