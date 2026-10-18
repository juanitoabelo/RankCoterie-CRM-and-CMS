import { defineConfig } from "@playwright/test";

const isProd = process.env.PLAYWRIGHT_TEST_PROD === "1";
const hasExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  // Keep artifacts out of apps/web: Next dev watches the app dir, and writing
  // traces/error-context files there invalidates route caches mid-run.
  outputDir: "../.playwright-results",
  timeout: 300_000,
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
  // In prod mode never reuse an existing listener: `next build` leaves its
  // internal data-collection server bound to the port, which tears down right
  // after the build, so reusing it makes tests hit a dead server. Instead free
  // the port first, then boot `next start`.
  webServer: hasExternalServer
    ? undefined
    : {
        command: isProd ? `sh -c "node scripts/free-port-3000.mjs; npm run start"` : "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !isProd && !process.env.CI,
        timeout: isProd ? 120_000 : 300_000,
      },
});