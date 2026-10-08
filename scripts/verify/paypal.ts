#!/usr/bin/env node
/**
 * PayPal Configuration Verification
 * Run after configuring PayPal in Admin → Payment Gateways
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyPayPal() {
  console.log("🔍 Verifying PayPal configuration...\n");

  const gateway = await prisma.paymentGateway.findFirst({
    where: { type: "PAYPAL", isEnabled: true },
  });

  if (!gateway) {
    console.error("❌ No enabled PayPal gateway found");
    process.exit(1);
  }

  console.log(`✅ PayPal gateway found: ${gateway.name}`);
  const config = gateway.config as any;

  if (!config?.clientId) console.warn("⚠️  Client ID missing");
  else console.log("✅ Client ID present");

  if (!config?.secret) console.warn("⚠️  Secret missing");
  else console.log("✅ Secret present");

  if (!config?.webhookId) console.warn("⚠️  Webhook ID missing");
  else console.log("✅ Webhook ID present");

  // Test webhook signature verification
  console.log("\n🔐 Testing webhook signature verification...");
  try {
    const response = await fetch(`${process.env.SITE_URL}/api/webhooks/paypal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} }),
    });

    if (response.status === 400) {
      console.log("✅ Webhook rejects invalid signature (400)");
    } else {
      console.warn(`⚠️  Webhook returned ${response.status} for invalid signature`);
    }
  } catch (e) {
    console.error("❌ Webhook endpoint unreachable:", e);
  }

  console.log("\n✅ PayPal verification complete");
  await prisma.$disconnect();
}

verifyPayPal().catch((e) => {
  console.error("❌ Verification failed:", e);
  process.exit(1);
});