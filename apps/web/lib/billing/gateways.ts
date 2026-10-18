/**
 * Purpose-aware payment gateway resolution.
 *
 * Each PaymentGateway row declares what it is FOR (`purpose`), so Client billing
 * (invoice/payment-link charges), E-commerce (storefront orders) and Listing
 * plans can run on separate Stripe/PayPal accounts — or deliberately share one.
 *
 * Resolvers are strict on purpose: client-billing operations never silently fall
 * back to the e-commerce account (that would move money through the wrong
 * merchant account). The admin gets a clear "configure a gateway" error instead.
 */
import type { PaymentGateway } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";

export type GatewayPurpose = "GENERAL" | "CLIENT_BILLING" | "ECOMMERCE" | "LISTING";

export const GATEWAY_PURPOSES: GatewayPurpose[] = ["GENERAL", "CLIENT_BILLING", "ECOMMERCE", "LISTING"];

export const GATEWAY_PURPOSE_LABELS: Record<GatewayPurpose, string> = {
  GENERAL: "General (any use)",
  CLIENT_BILLING: "Client billing (invoice payments)",
  ECOMMERCE: "E-commerce (storefront orders)",
  LISTING: "Listing plans (paid listings)",
};

export function isGatewayPurpose(value: string): value is GatewayPurpose {
  return (GATEWAY_PURPOSES as string[]).includes(value);
}

/** Enabled gateway designated for a purpose, priority order (same pick as checkout). */
export async function getGatewayForPurpose(purpose: GatewayPurpose): Promise<PaymentGateway | null> {
  return prisma.paymentGateway.findFirst({
    where: { tenantId: TENANT_ID, purpose, isEnabled: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}
