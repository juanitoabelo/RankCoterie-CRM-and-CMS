const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  reporter: ['list'],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});