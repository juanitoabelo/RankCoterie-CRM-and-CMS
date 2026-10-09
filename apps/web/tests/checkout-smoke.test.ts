import { test, expect } from '@playwright/test';
import { goto } from './navigation';

test('smoke: checkout entry renders with both tiers selectable', async ({ page }) => {
  // The apply form is the checkout entry point. No gateway or seeded data is
  // required — the tier cards are part of the form.
  await goto(page, '/apply');
  await expect(page.locator('input[name="tier"][value="STANDARD"]')).toBeVisible();
  await expect(page.locator('input[name="tier"][value="PREMIUM"]')).toBeVisible();
});