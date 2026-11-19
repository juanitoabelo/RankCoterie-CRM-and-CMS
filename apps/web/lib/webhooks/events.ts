export const CRM_WEBHOOK_EVENTS = [
  "lead.created",
  "lead.updated",
  "deal.created",
  "deal.updated",
  "deal.stage_changed",
  "activity.created",
  "sequence.sent",
  "email.sent",
  "email.failed",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.unsubscribed",
] as const;

export type CrmWebhookEvent = (typeof CRM_WEBHOOK_EVENTS)[number];

export const OTHER_WEBHOOK_EVENTS = [
  "order.paid",
  "order.refunded",
  "listing.created",
  "listing.updated",
  "payment.failed",
  "subscription.cancelled",
] as const;

export const WEBHOOK_EVENT_CATALOG: { value: string; label: string }[] = [
  { value: "lead.created", label: "Lead Created" },
  { value: "lead.updated", label: "Lead Updated" },
  { value: "deal.created", label: "Deal Created" },
  { value: "deal.updated", label: "Deal Updated" },
  { value: "deal.stage_changed", label: "Deal Stage Changed" },
  { value: "activity.created", label: "Activity Created" },
  { value: "sequence.sent", label: "Sequence Email Sent" },
  { value: "email.sent", label: "Email Sent" },
  { value: "email.failed", label: "Email Failed" },
  { value: "email.opened", label: "Email Opened" },
  { value: "email.clicked", label: "Email Clicked" },
  { value: "email.bounced", label: "Email Bounced" },
  { value: "email.unsubscribed", label: "Email Unsubscribed" },
  { value: "order.paid", label: "Order Paid" },
  { value: "order.refunded", label: "Order Refunded" },
  { value: "listing.created", label: "Listing Created" },
  { value: "listing.updated", label: "Listing Updated" },
  { value: "payment.failed", label: "Payment Failed" },
  { value: "subscription.cancelled", label: "Subscription Cancelled" },
];

export const WEBHOOK_EVENT_VALUES: string[] = WEBHOOK_EVENT_CATALOG.map((event) => event.value);

export function isValidWebhookEvent(value: unknown): value is string {
  return typeof value === "string" && WEBHOOK_EVENT_VALUES.includes(value);
}
