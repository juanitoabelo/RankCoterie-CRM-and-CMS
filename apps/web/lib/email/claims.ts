/**
 * Claim flow emails — ownership verification (to claimant) and admin
 * notification. Content comes from the editable templates (Admin → Client
 * Email Settings) with the built-in defaults as fallback.
 */
import { sendEmail } from "./send";
import { loadEmailTemplate, renderTemplate } from "./templates";

export async function sendClaimVerificationEmail(input: {
  to: string;
  name: string;
  slug: string;
  verifyUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { subject, html, text } = renderTemplate(await loadEmailTemplate("claimVerify"), {
    "{claimant_name}": input.name || "there",
    "{business_slug}": input.slug,
    "{verify_link}": input.verifyUrl,
  });
  return sendEmail({ to: input.to, subject, html, text });
}

export async function sendClaimAdminNotification(input: {
  to: string;
  name: string;
  email: string;
  role: string;
  slug: string;
  emailMatches: boolean;
  adminLink: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { subject, html, text } = renderTemplate(await loadEmailTemplate("claimAdmin"), {
    "{business_slug}": input.slug,
    "{claimant_name}": input.name || "—",
    "{claimant_email}": input.email,
    "{claimant_role}": input.role || "—",
    "{email_matches}": input.emailMatches ? "Yes" : "No",
    "{admin_link}": input.adminLink,
  });
  return sendEmail({ to: input.to, subject, html, text });
}
