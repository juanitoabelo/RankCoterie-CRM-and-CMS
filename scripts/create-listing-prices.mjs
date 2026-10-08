import { PrismaClient } from "@prisma/client";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY not set");
  process.exit(1);
}

async function api(path, params = {}) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

async function getOrCreateProduct(name, description) {
  // Create all; Stripe product names can repeat, okay for a test environment.
  return api("/products", { name, description });
}

const standardProduct = await getOrCreateProduct(
  "Canopy Directory Listing - Standard",
  "$50 monthly subscription for a paid listing"
);
const premiumProduct = await getOrCreateProduct(
  "Canopy Directory Listing - Premium",
  "$100 monthly subscription for a featured listing"
);
const setupProduct = await getOrCreateProduct(
  "Canopy Directory Setup Fee",
  "One-time setup fee for a directory listing"
);

const standardPrice = await api(`/prices`, {
  product: standardProduct.id,
  currency: "usd",
  unit_amount: "5000",
  "recurring[interval]": "month",
});
const premiumPrice = await api("/prices", {
  product: premiumProduct.id,
  currency: "usd",
  unit_amount: "10000",
  "recurring[interval]": "month",
});
const setupPrice = await api("/prices", {
  product: setupProduct.id,
  currency: "usd",
  unit_amount: "100",
});

const p = new PrismaClient();
try {
  const tenant = await p.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");
  const theme = (tenant.theme ?? {});
  const listingPayment = {
    ...((theme.listingPayment) ?? {}),
    standardPriceId: standardPrice.id,
    premiumPriceId: premiumPrice.id,
    setupFeeId: setupPrice.id,
  };
  await p.tenant.update({
    where: { id: tenant.id },
    data: { theme: { ...theme, listingPayment } },
  });
  console.log("Created Stripe prices:");
  console.log(JSON.stringify({
    standardPriceId: standardPrice.id,
    premiumPriceId: premiumPrice.id,
    setupFeeId: setupPrice.id,
  }, null, 2));
} finally {
  await p.$disconnect();
}
