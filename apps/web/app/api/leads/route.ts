/**
 * Public lead capture — the working replacement for the legacy Canopy lead form.
 *
 * Plain HTML POST target for the listing contact form (no JS required).
 * Creates BOTH a directory `ListingLead` (listing analytics) and a CRM `Lead`
 * (/admin/leads), consumes the listing's lead credits, and fans out
 * `lead.created` webhook deliveries.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { rateLimit } from "@/lib/rate-limit";
import { consumeLeadCredit, enqueueLeadCreatedDeliveries } from "@/lib/billing/lead-credit";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 4000;
const MAX_FIELD = 200;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Only allow same-site relative redirects back to the listing page. */
function safeRedirect(path: unknown, fallback: string): string {
  if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) return path;
  return fallback;
}

function redirectWith(request: NextRequest, path: string, params: Record<string, string>): NextResponse {
  // Base on the incoming request so the Location header keeps the real origin.
  const url = new URL(path, request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = rateLimit(`publicLead:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many submissions. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let fields: FormData | URLSearchParams;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    fields = await request.formData();
  } else {
    fields = new URLSearchParams(await request.text());
  }
  const get = (key: string) => {
    const v = fields.get(key);
    return typeof v === "string" ? v.trim() : "";
  };

  const name = get("name").slice(0, MAX_FIELD);
  const email = get("email").slice(0, MAX_FIELD);
  const phone = get("phone").slice(0, MAX_FIELD);
  const subject = get("subject").slice(0, MAX_FIELD);
  const message = get("message").slice(0, MAX_MESSAGE);
  const listingId = get("listingId");
  const source = get("source") || "listing";
  const redirectTo = safeRedirect(get("redirectTo"), "/");

  const back = (params: Record<string, string>) => redirectWith(request, redirectTo, params);

  if (!name || !email || !message) {
    return back({ lead: "error", leadError: "Name, email and message are required." });
  }
  if (!EMAIL_RE.test(email)) {
    return back({ lead: "error", leadError: "Enter a valid email address." });
  }

  const recaptcha = await verifyRecaptchaToken(get("recaptchaToken"), ip);
  if (!recaptcha.ok) {
    return back({
      lead: "error",
      leadError: "Spam check failed. Please try again.",
    });
  }

  let listing: { id: string; title: string | null } | null = null;
  if (listingId) {
    listing = await prisma.listing.findFirst({
      where: { id: listingId, tenantId: TENANT_ID },
      select: { id: true, title: true },
    });
    if (!listing) {
      return back({ lead: "error", leadError: "Listing not found." });
    }
  }

  const [firstName, ...rest] = name.split(/\s+/);
  const lastName = rest.join(" ") || null;

  try {
    const { lead, listingLead } = await prisma.$transaction(async (tx) => {
      const leadRow = await tx.lead.create({
        data: {
          tenantId: TENANT_ID,
          firstName: firstName || null,
          lastName,
          email,
          phones: phone ? [{ number: phone, kind: "unknown" }] : [],
          status: "NEW",
          disposition: "NEW_INQUIRY",
          initialDisposition: "NEW_INQUIRY",
          statusDate: new Date(),
          landingPageId: listing?.id ?? null,
          intake: {
            source,
            subject,
            message,
            ...(listing ? { listingTitle: listing.title } : {}),
          } as Prisma.InputJsonValue,
        },
      });
      const listingLeadRow = await tx.listingLead.create({
        data: {
          tenantId: TENANT_ID,
          listingId: listing?.id ?? null,
          name,
          email,
          phone: phone || null,
          message,
          subject: subject || null,
          source,
          status: "NEW",
          leadId: leadRow.id,
        },
      });
      return { lead: leadRow, listingLead: listingLeadRow };
    });

    if (listing) {
      await consumeLeadCredit(listing.id).catch((e) => {
        console.error("Lead credit consume failed:", e);
      });
    }
    await enqueueLeadCreatedDeliveries({
      leadId: lead.id,
      listingLeadId: listingLead.id,
      listingId: listing?.id ?? null,
      name,
      email,
      phone: phone || null,
      subject,
      message,
      source,
    }).catch((e) => {
      console.error("Lead webhook fan-out failed:", e);
    });

    return back({ lead: "sent" });
  } catch (e) {
    console.error("Lead capture failed:", e);
    return back({ lead: "error", leadError: "Could not send your message. Please try again." });
  }
}
