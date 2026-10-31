"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { Role } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/passwords";
import {
  buildCheckoutParams,
  readCompanyListingPaymentConfig,
  companyCheckoutConfig,
  readStripeConfig,
} from "@/lib/billing/checkout";
import { throttle } from "@/lib/throttle";
import { normalizeUsername, validateUsername } from "@/lib/auth/username";

export type CompanyApplyResult = { ok: false; error: string } | { ok: true };

export type CompanyApplyFormOptions = {
  configured: boolean;
  setupFeeAmount: string;
  payment: {
    standardLabel: string;
    standardAmount: string;
    premiumLabel: string;
    premiumAmount: string;
  };
};

/** Data for the public company-apply form (tiers, amounts, configured flag). */
export async function getCompanyApplyFormOptions(): Promise<CompanyApplyFormOptions> {
  const tenant = await prisma.tenant
    .findUnique({ where: { id: TENANT_ID } })
    .catch(() => null);
  const cfg = readCompanyListingPaymentConfig(tenant?.theme ?? {});
  const configured = Boolean(cfg.secretKey && (cfg.standardPriceId || cfg.premiumPriceId));
  return {
    configured,
    setupFeeAmount: cfg.setupFeeAmount ?? "",
    payment: {
      standardLabel: cfg.standardLabel ?? "Standard",
      standardAmount: cfg.standardAmount ?? "97",
      premiumLabel: cfg.premiumLabel ?? "Premium",
      premiumAmount: cfg.premiumAmount ?? "197",
    },
  };
}

export async function applyCompanyWithState(
  _prev: CompanyApplyResult | null,
  formData: FormData,
): Promise<CompanyApplyResult> {
  return applyCompany(formData);
}

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Public self-apply for a company landing page (Path B): create the account +
 * the page, then start Stripe Checkout (one-time setup fee + recurring tier).
 * Paid ⇒ webhook flips the page LIVE.
 */
export async function applyCompany(formData: FormData): Promise<CompanyApplyResult> {
  const throttled = await throttle("applyCompany", 5, 10 * 60_000);
  if (throttled) return { ok: false, error: throttled };

  const tierRaw = String(formData.get("tier") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const website = String(formData.get("website") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (tierRaw !== "STANDARD" && tierRaw !== "PREMIUM") {
    return { ok: false, error: "Choose a page tier." };
  }
  const tier = tierRaw as "STANDARD" | "PREMIUM";
  if (!title) return { ok: false, error: "Company name is required." };
  if (!email) return { ok: false, error: "Contact email is required." };
  const usernameError = validateUsername(username);
  if (usernameError) return { ok: false, error: usernameError };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = tenant?.theme ?? {};
  const cfg = readCompanyListingPaymentConfig(theme);
  if (!cfg.secretKey || (!cfg.standardPriceId && !cfg.premiumPriceId)) {
    return {
      ok: false,
      error: "Company page payments are not configured yet — please try again later.",
    };
  }

  const base = slugify(title) || "company-page";
  const slug = `${base}-${Date.now().toString(36)}`;

  try {
    // Reuse an existing account when the email is already registered; otherwise
    // create a subscriber so the owner can log in at /company/login.
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId: TENANT_ID },
      include: { roles: true },
    });
    const usernameOwner = await prisma.user.findFirst({
      where: { tenantId: TENANT_ID, username },
      select: { id: true },
    });
    if (usernameOwner && usernameOwner.id !== existingUser?.id) {
      return { ok: false, error: "That username is already taken." };
    }

    let accountId: string;
    if (existingUser) {
      accountId = existingUser.id;
      if (!existingUser.roles.some((r) => r.role === Role.SUBSCRIBER)) {
        await prisma.userRole.create({
          data: { userId: existingUser.id, role: Role.SUBSCRIBER },
        });
      }
      if (!existingUser.username) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { username },
        });
      }
    } else {
      const createdUser = await prisma.user.create({
        data: {
          tenantId: TENANT_ID,
          email,
          username,
          passwordHash: hashPassword(password),
          firstName: title,
          active: true,
          roles: { create: [{ role: Role.SUBSCRIBER }] },
        },
      });
      accountId = createdUser.id;
      await logAudit({
        action: "USER_CREATE",
        entity: "User",
        entityId: accountId,
        meta: { source: "apply-company", email },
      });
    }

    const listing = await prisma.listing.create({
      data: {
        tenantId: TENANT_ID,
        isLandingPage: true,
        title,
        slug,
        tier,
        status: "PENDING_REVIEW",
        companyName: title,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        summary: summary || null,
        claimedById: accountId,
        claimedAt: new Date(),
        authorId: accountId,
      },
    });
    await logAudit({
      action: "LISTING_CREATE",
      entity: "CompanyListing",
      entityId: listing.id,
      meta: { source: "apply-company", tier, title },
    });

    const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    const built = buildCheckoutParams(
      { listingId: listing.id, tier, listingTitle: title },
      {
        successUrl: `${siteUrl}/checkout/success?listingId=${listing.id}`,
        cancelUrl: `${siteUrl}/checkout/cancel?listingId=${listing.id}`,
      },
      companyCheckoutConfig(theme),
    );
    if (!built.ok) {
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "DRAFT" } });
      return built;
    }

    const stripeCfg = readStripeConfig({ secretKey: cfg.secretKey });
    if (!stripeCfg) {
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "DRAFT" } });
      return { ok: false, error: "Payments are not configured yet — please try again later." };
    }
    const stripe = new Stripe(stripeCfg.secretKey);
    const session = await stripe.checkout.sessions.create(
      built.params as Stripe.Checkout.SessionCreateParams,
    );
    redirect(session.url!);
    return { ok: true };
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    return { ok: false, error: e instanceof Error ? e.message : "Application failed." };
  }
}

/** Form-action wrapper (Next 16 <form action> needs (FormData) => void | Promise<void>). */
export async function applyCompanyForm(formData: FormData): Promise<void> {
  try {
    const result = await applyCompany(formData);
    if (result && result.ok === false) {
      redirect(`/apply/company?error=${encodeURIComponent(result.error)}`);
    }
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    const message = e instanceof Error ? e.message : "Application failed.";
    redirect(`/apply/company?error=${encodeURIComponent(message)}`);
  }
}
