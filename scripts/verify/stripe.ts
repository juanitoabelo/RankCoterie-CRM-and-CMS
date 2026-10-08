#!/usr/bin/env node
/**
 * Stripe Configuration Verification
 * Run after configuring Stripe in Admin → Payment Gateways
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyStripe() {
  console.log("🔍 Verifying Stripe configuration...\n");

  // 1. Check gateway config exists
  const gateway = await prisma.paymentGateway.findFirst({
    where: { type: "STRIPE", isEnabled: true },
  });

  if (!gateway) {
    console.error("❌ No enabled Stripe gateway found");
    process.exit(1);
  }

  console.log(`✅ Stripe gateway found: ${gateway.name}`);
  console.log(`   ID: ${gateway.id}`);
  console.log(`   Test Mode: ${(gateway.config as any)?.testMode ?? "not set"}`);

  const config = gateway.config as any;
  if (!config?.secretKey) {
    console.warn("⚠️  Secret key not in gateway config (check env fallback)");
  } else {
    console.log("✅ Secret key present in gateway config");
  }

  if (!config?.webhookSecret) {
    console.warn("⚠️  Webhook secret not in gateway config (check env fallback)");
  } else {
    console.log("✅ Webhook secret present in gateway config");
  }

  // 2. Test webhook signature verification
  console.log("\n🔐 Testing webhook signature verification...");
  try {
    const response = await fetch(`${process.env.SITE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": "invalid_signature",
      },
      body: JSON.stringify({ id: "test", type: "checkout.session.completed" }),
    });

    if (response.status === 400) {
      console.log("✅ Webhook rejects invalid signature (400)");
    } else {
      console.warn(`⚠️  Webhook returned ${response.status} for invalid signature`);
    }
  } catch (e) {
    console.error("❌ Webhook endpoint unreachable:", e);
  }

  console.log("\n✅ Stripe verification complete");
  await prisma.$disconnect();
}

verifyStripe().catch((e) => {
  console.error("❌ Verification failed:", e);
  process.exit(1);
});