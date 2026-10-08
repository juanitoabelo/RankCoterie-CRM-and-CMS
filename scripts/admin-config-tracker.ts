#!/usr/bin/env node
/**
 * Admin Configuration Progress Tracker
 * Interactive checklist for admin configuration tasks
 */

interface Task {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  verification?: string;
}

const tasks: Task[] = [
  // Payment Gateways
  { id: "stripe-keys", title: "Stripe API Keys", description: "Add publishable + secret keys to Admin → Payment Gateways", required: true, completed: false, verification: "npm run verify:stripe" },
  { id: "stripe-webhook", title: "Stripe Webhook", description: "Configure webhook endpoint + signing secret", required: true, completed: false, verification: "npm run verify:stripe" },
  { id: "paypal-keys", title: "PayPal REST App Credentials", description: "Add Client ID + Secret to Admin → Payment Gateways", required: true, completed: false, verification: "npm run verify:paypal" },
  { id: "paypal-webhook", title: "PayPal Webhook", description: "Configure webhook URL + Webhook ID", required: true, completed: false, verification: "npm run verify:paypal" },
  { id: "square-keys", title: "Square App Credentials", description: "Add Application ID + Access Token + Location ID", required: true, completed: false, verification: "npm run verify:square" },
  { id: "square-webhook", title: "Square Webhook", description: "Configure webhook URL + Signature Key", required: true, completed: false, verification: "npm run verify:square" },

  // Server Environment
  { id: "site-url", title: "SITE_URL", description: "Set public origin in deployed host .env", required: true, completed: false },
  { id: "resend-key", title: "RESEND_API_KEY", description: "Set Resend API key for email sending", required: true, completed: false },
  { id: "email-from", title: "EMAIL_FROM", description: "Set sender email address (must be verified in Resend)", required: true, completed: false },

  // Inngest
  { id: "inngest-deploy", title: "Inngest Endpoint Registered", description: "Deploy app → verify /api/inngest registers in Inngest dashboard", required: true, completed: false },
  { id: "inngest-abandoned", title: "Abandoned Order Sweep", description: "Trigger orders/abandoned.run → verify PENDING orders cancelled", required: true, completed: false },

  // Storefront Config
  { id: "tax-settings", title: "Tax Settings", description: "Admin → Tax → set default rate/currency", required: true, completed: false },
  { id: "shipping-settings", title: "Shipping Settings", description: "Admin → Shipping → add method + rate", required: true, completed: false },
  { id: "store-settings", title: "Store Front Settings", description: "Admin → Store Settings → currency, low-stock threshold, store name", required: true, completed: false },

  // Gateway Verification
  { id: "stripe-test", title: "Stripe Test Order", description: "Place test order → verify PAID status + paid email sent", required: true, completed: false },
  { id: "paypal-test", title: "PayPal Test Order", description: "Place test order → verify PAID status + paid email sent", required: true, completed: false },
  { id: "square-test", title: "Square Test Order", description: "Place test order → verify PAID status + paid email sent", required: true, completed: false },
  { id: "bad-signature", title: "Bad Signature Test", description: "Replay webhook with bad signature → expect 401/400", required: true, completed: false },
];

function displayTasks() {
  console.log("\n📋 Admin Configuration Progress Tracker\n");
  console.log("=".repeat(70));

  let completed = 0;
  let requiredTotal = 0;

  for (const task of tasks) {
    if (task.required) requiredTotal++;
    if (task.completed) completed++;

    const status = task.completed ? "✅" : "⬜";
    const req = task.required ? "🔴" : "⚪";
    console.log(`  ${status} ${req} ${task.id.padEnd(25)} ${task.title}`);
  }

  console.log(`\nProgress: ${completed}/${requiredTotal} required tasks complete`);
  console.log(`${Math.round((completed / requiredTotal) * 100)}% complete\n`);
}

function loadProgress() {
  // In a real implementation, load from file
}

function saveProgress() {
  // In a real implementation, save to file
}

async function main() {
  displayTasks();

  console.log("\nCommands:");
  console.log("  mark <task-id>   - Mark task as complete");
  console.log("  unmark <task-id> - Mark task as incomplete");
  console.log("  verify <task-id> - Run verification for task");
  console.log("  list             - Show all tasks");
  console.log("  summary          - Show summary");
  console.log("  exit             - Exit\n");

  // For now, just display - in real use, this would be interactive
  console.log("\nTo mark tasks complete, edit this script or use:");
  console.log("  npm run config:mark stripe-keys");
}

main();