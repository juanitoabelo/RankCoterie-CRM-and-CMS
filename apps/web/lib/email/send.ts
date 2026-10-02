/**
 * Transactional email sending — pluggable, env-configured.
 *
 * Provider: Resend (set RESEND_API_KEY; optional EMAIL_FROM, default
 * "Canopy <onboarding@resend.dev>"). When no key is configured every send is
 * logged and skipped so checkout/order flows never fail because of email.
 */

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: EmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:disabled] to=${input.to} subject="${input.subject}" — set RESEND_API_KEY to enable sending.`);
    return { ok: false, error: "Email provider not configured." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Canopy <onboarding@resend.dev>",
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Email send failed (${res.status}): ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email send failed." };
  }
}
