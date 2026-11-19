type AlertLevel = "warning" | "error";

function payload(level: AlertLevel, context: string, message: string, meta?: Record<string, unknown>) {
  return {
    level,
    service: "canopy-crm",
    context,
    message,
    meta: meta ?? {},
    at: new Date().toISOString(),
  };
}

/**
 * Structured CRM alert. Always logs JSON; optionally POSTs to a Slack-compatible
 * webhook so production failures are visible outside the Vercel log stream.
 */
export function reportCrmIssue(
  level: AlertLevel,
  context: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const record = payload(level, context, message, meta);
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else console.warn(line);

  const webhook = process.env.CRM_ALERT_WEBHOOK_URL;
  if (!webhook) return;
  void fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `[Canopy CRM] ${context}: ${message}`,
      ...record,
    }),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  })
    .then((response) => {
      if (!response.ok) {
        console.warn(
          JSON.stringify(
            payload("warning", "crm.alert.webhook", `Webhook returned HTTP ${response.status}`),
          ),
        );
      }
    })
    .catch((sendError) => {
      console.warn(
        JSON.stringify(payload("warning", "crm.alert.webhook", String(sendError))),
      );
    });
}
