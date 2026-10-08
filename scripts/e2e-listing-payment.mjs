import { chromium } from "playwright";

const BASE_URL = process.env.SITE_URL ?? "http://localhost:3000";
const runId = Date.now().toString(36);
const email = `stripe-test-${runId}@example.com`;

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

async function fillIfExists(selector, value) {
  const loc = page.locator(selector).first();
  if (await loc.count().catch(() => 0)) {
    await loc.fill(value).catch(() => {});
  }
}

try {
  console.log("Opening apply page...");
  await page.goto(`${BASE_URL}/apply`, { waitUntil: "domcontentloaded", timeout: 120000 });

  await page.locator('input[name="tier"][value="STANDARD"]').evaluate((el) => { el.checked = true; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.locator('input[name="title"]').fill(`E2E Payment Test ${runId}`);
  await page.locator('input[name="companyName"]').fill(`E2E Company ${runId}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="phone"]').fill("5555555555");
  await page.locator('input[name="website"]').fill("https://example.com");
  await page.locator('input[name="city"]').fill("Austin");
  await page.locator('input[name="state"]').fill("TX");

  console.log("Submitting apply form...");
  await page.getByRole("button", { name: /Continue to payment/i }).click({ noWaitAfter: true });
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 120000 });
  console.log("Reached Stripe Checkout:", page.url());

  // Debug: log inputs in each frame.
  for (const frame of page.frames()) {
    const htmlInputs = await frame.locator('input').evaluateAll((els) => els.map((el) => ({ name: el.name, id: el.id, type: el.type, placeholder: el.placeholder, autocomplete: el.autocomplete }))).catch(() => []);
    if (htmlInputs.length) console.log("Frame inputs:", JSON.stringify(htmlInputs));
  }

  const emailCandidates = ['input[type="email"]', 'input[name="email"]', '#email', 'input[autocomplete="email"]'];
for (const selector of emailCandidates) {
    const loc = page.locator(selector).first();
    const count = await loc.count().catch(() => 0);
    if (count) {
      await loc.fill(email).catch(() => {});
      console.log(`Filled email with selector ${selector} | value now:`, await loc.inputValue().catch(() => null));
      break;
    }
  }

  // Stripe may embed card inputs in iframes.
  const frames = page.frames();
  let filled = false;
  for (const frame of frames) {
    const cardNumber = frame.locator('input[name="cardnumber"], input[id="cardNumber"], input[autocomplete="cc-number"]').first();
    if (await cardNumber.count().catch(() => 0)) {
      console.log("Filling card details...");
      await cardNumber.fill("4242424242424242");
      const expiry = frame.locator('input[name="exp-date"], input[id="cardExpiry"], input[autocomplete="cc-exp"], input[name="cardExpiry"]').first();
      await expiry.fill("12/26");
      const cvc = frame.locator('input[name="cvc"], input[id="cardCvc"], input[autocomplete="cc-csc"], input[name="cardCvc"]').first();
      await cvc.fill("123");
      const billingName = frame.locator('input[name="billingName"], input[id="billingName"], input[autocomplete="cc-name"]').first();
      if (await billingName.count().catch(() => 0)) await billingName.fill("Test Card");
      const postal = frame.locator('input[name="postal"], input[id="billingPostalCode"], input[autocomplete="postal-code"]').first();
      if (await postal.count().catch(() => 0)) await postal.fill("12345");
      filled = true;
      break;
    }
  }
  if (!filled) {
    throw new Error("Could not find Stripe card inputs.");
  }

  await page.waitForTimeout(1000);
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.count().catch(() => 0)) {
    await emailInput.fill(email).catch(() => {});
  }

  // Try common checkout buttons.
  const candidates = [/Subscribe/i, /Pay/i, /Complete order/i, /Place order/i];
  for (const nameRe of candidates) {
    const btn = page.getByRole("button", { name: nameRe }).first();
    if (await btn.count().catch(() => 0)) {
      console.log("Clicking checkout button:", nameRe);
      await btn.click({ timeout: 10000 }).catch(() => {});
      break;
    }
  }

  await page.waitForTimeout(3000);

  try {
    await page.waitForURL(/checkout\/success/, { timeout: 120000 });
    console.log("SUCCESS: redirected to", page.url());
  } catch {
    console.log("Current URL after checkout:", page.url());
    const visibleError = await page.locator('[role="alert"], .sr-root, .ErrorMessage, [class*="Error"]').first().textContent().catch(() => null);
    if (visibleError) console.log("Visible error:", visibleError);
    throw new Error("Checkout did not redirect to success.");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
