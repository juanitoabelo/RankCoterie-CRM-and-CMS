/**
 * Server-side template access — loaders that read Tenant.theme.emailTemplates.
 * The registry (types, defaults, placeholders, render helpers) lives in
 * ./template-registry (pure / client-safe).
 */
import { prisma, TENANT_ID } from "@/modules/shared";
import {
  EMAIL_TEMPLATES,
  normalizeTemplate,
  type EmailTemplate,
  type TemplateKey,
} from "./template-registry";

export * from "./template-registry";

async function readEmailTemplatesTheme(): Promise<Record<string, unknown>> {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as Record<string, unknown>;
  return (theme.emailTemplates ?? {}) as Record<string, unknown>;
}

/** Load one stored template (defaults when unset/broken). */
export async function loadEmailTemplate(key: TemplateKey): Promise<EmailTemplate> {
  const defaults = EMAIL_TEMPLATES[key].defaultTemplate;
  try {
    const templates = await readEmailTemplatesTheme();
    return normalizeTemplate(templates[key], defaults);
  } catch {
    return { ...defaults };
  }
}

export async function loadInvoiceEmailTemplate(): Promise<EmailTemplate> {
  return loadEmailTemplate("invoicePayment");
}
