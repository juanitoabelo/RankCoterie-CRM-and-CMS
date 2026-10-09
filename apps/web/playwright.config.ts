import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isProd = process.env.PLAYWRIGHT_TEST_PROD === "1";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: {
    timeout: 5000,
  },
  // Retry once before giving up: Next dev aborts the first request per route
  // while it on-demand compiles browser chunks, which occasionally trips a nav.
  retries: 2,
  // A smoke suite should be deterministic over fast: one worker avoids the
  // request aborts a webpack dev server triggers when many routes compile at once.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Boot the app automatically when no external base URL is given, so
  // `npm run test:e2e` works zero-setup. Locally a dev server already running
  // on the port is reused; CI always boots a fresh one. Set PLAYWRIGHT_TEST_PROD=1
  // after a `next build` to run against `next start` (no on-demand compiles).
  webServer: baseURL
    ? undefined
    : {
        command: isProd ? "npm run start" : "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: isProd ? 120_000 : 300_000,
      },
});