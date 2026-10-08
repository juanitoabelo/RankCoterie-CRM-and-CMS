import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";

const p = new PrismaClient();
try {
  const tenant = await p.tenant.findFirst();
  const listingPayment = tenant?.theme?.listingPayment ?? null;
  const secret = listingPayment?.webhookSecret;
  if (!secret) {
    console.error("No webhookSecret in tenant.theme.listingPayment");
    process.exit(1);
  }
  const payload = await fs.readFile("/tmp/stripe-event.json", "utf8");
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const url = process.argv[2] ?? "http://localhost:3000/api/webhooks/stripe/";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });
  console.log("Status", res.status, await res.text());
} finally {
  await p.$disconnect();
}
