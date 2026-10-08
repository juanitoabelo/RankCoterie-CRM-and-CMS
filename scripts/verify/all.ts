#!/usr/bin/env node
/**
 * Master Verification Script
 * Runs all configuration verifications
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runVerification(script: string, name: string): Promise<boolean> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Running ${name} verification...`);
  console.log(`${"=".repeat(50)}\n`);

  try {
    execSync(`npx tsx scripts/verify/${script}.ts`, {
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log(`\n✅ ${name} verification PASSED`);
    return true;
  } catch (e) {
    console.error(`\n❌ ${name} verification FAILED`);
    return false;
  }
}

async function verifyEmailConfig() {
  console.log("\n📧 Verifying email configuration...\n");

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!resendKey) {
    console.warn("⚠️  RESEND_API_KEY not set — emails will only be logged");
    return false;
  }
  console.log("✅ RESEND_API_KEY is set");

  if (!emailFrom) {
    console.warn("⚠️  EMAIL_FROM not set");
    return false;
  }
  console.log(`✅ EMAIL_FROM: ${emailFrom}`);

  // Test sending a verification email
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: emailFrom, // send to self for verification
        subject: "Canopy Verification Test",
        text: "This is a test email to verify Resend configuration.",
      }),
    });

    if (response.ok) {
      console.log("✅ Resend API working — test email sent");
      return true;
    } else {
      const err = await response.json();
      console.error("❌ Resend API error:", err);
      return false;
    }
  } catch (e) {
    console.error("❌ Resend test failed:", e);
    return false;
  }
}

async function verifyInngest() {
  console.log("\n⚙️  Verifying Inngest configuration...\n");

  try {
    const response = await fetch(`${process.env.SITE_URL}/api/inngest`, {
      method: "GET",
    });

    if (response.ok) {
      console.log("✅ Inngest endpoint accessible");
      return true;
    } else {
      console.warn(`⚠️  Inngest endpoint returned ${response.status}`);
      return false;
    }
  } catch (e) {
    console.error("❌ Inngest endpoint unreachable:", e);
    return false;
  }
}

async function verifyDatabase() {
  console.log("\n🗄️  Verifying database connectivity...\n");

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");

    // Check key tables have data
    const [gateways, company] = await Promise.all([
      prisma.paymentGateway.count(),
      prisma.company.findUnique({ where: { tenantId: "default" } }),
    ]);

    console.log(`✅ Payment gateways configured: ${gateways}`);
    if (company) {
      console.log(`✅ Company config found: ${company.name}`);
    } else {
      console.warn("⚠️  No company config found");
    }

    return true;
  } catch (e) {
    console.error("❌ Database verification failed:", e);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting full configuration verification\n");

  const results = {
    database: await verifyDatabase(),
    email: await verifyEmailConfig(),
    inngest: await verifyInngest(),
    stripe: await runVerification("stripe", "Stripe"),
    paypal: await runVerification("paypal", "PayPal"),
    square: await runVerification("square", "Square"),
  };

  console.log("\n" + "=".repeat(50));
  console.log("VERIFICATION SUMMARY");
  console.log("=".repeat(50));

  for (const [name, passed] of Object.entries(results)) {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${name.padEnd(12)} ${status}`);
  }

  const allPassed = Object.values(results).every((v) => v);
  console.log(`\n${allPassed ? "🎉 ALL CHECKS PASSED" : "⚠️  SOME CHECKS FAILED"}`);

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});