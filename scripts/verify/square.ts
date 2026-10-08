#!/usr/bin/env node
/**
 * Square Configuration Verification
 * Run after configuring Square in Admin → Payment Gateways
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifySquare() {
  console.log("🔍 Verifying Square configuration...\n");

  const gateway = await prisma.paymentGateway.findFirst({
    where: { type: "SQUARE", isEnabled: true },
  });

  if (!gateway) {
    console.error("❌ No enabled Square gateway found");
    process.exit(1);
  }

  console.log(`✅ Square gateway found: ${gateway.name}`);
  const config = gateway.config as any;

  if (!config?.applicationId) console.warn("⚠️  Application ID missing");
  else console.log("✅ Application ID present");

  if (!config?.accessToken) console.warn("⚠️  Access Token missing");
  else console.log("✅ Access Token present");

  if (!config?.locationId) console.warn("⚠️  Location ID missing");
  else console.log("✅ Location ID present");

  if (!config?.signatureKey) console.warn("⚠️  Signature Key missing");
  else console.log("✅ Signature Key present");

  // Test webhook signature verification
  console.log("\n🔐 Testing webhook signature verification...");
  try {
    const response = await fetch(`${process.env.SITE_URL}/api/webhooks/square`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "payment.updated", data: {} }),
    });

    if (response.status === 400) {
      console.log("✅ Webhook rejects invalid signature (400)");
    } else {
      console.warn(`⚠️  Webhook returned ${response.status} for invalid signature`);
    }
  } catch (e) {
    console.error("❌ Webhook endpoint unreachable:", e);
  }

  console.log("\n✅ Square verification complete");
  await prisma.$disconnect();
}

verifySquare().catch((e) => {
  console.error("❌ Verification failed:", e);
  process.exit(1);
});