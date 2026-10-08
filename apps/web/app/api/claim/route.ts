import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { sendEmail } from "@/lib/email/send";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const listingId = formData.get("listingId") as string;
    const slug = formData.get("slug") as string;
    const email = (formData.get("email") as string).toLowerCase().trim();
    const name = (formData.get("name") as string).trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const role = (formData.get("role") as string) || "owner";

    if (!listingId || !slug || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, slug: true, title: true, email: true, phone: true, claimedById: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.claimedById) {
      return NextResponse.json({ error: "This listing has already been claimed" }, { status: 400 });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Check if email matches listing contact info
    const emailMatches = listing.email?.toLowerCase() === email;
    const phoneMatches = listing.phone?.replace(/\D/g, "") === formData.get("phone")?.toString().replace(/\D/g, "");

    // Store claim request
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        verificationToken: token,
        verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        // Store claimant info temporarily in a JSON field or separate table
        // For now, we'll use a simple approach - create a lead for tracking
      },
    });

    // Create lead for tracking
    await prisma.listingLead.create({
      data: {
        tenantId: "default",
        listingId,
        name: (formData.get("name") as string) || "Unknown",
        email,
        phone: (formData.get("phone") as string)?.trim() || null,
        message: `Claim request - Role: ${formData.get("role")}`,
        subject: "Claim Request",
        source: "claim",
        status: "NEW",
        metadata: {
          claimRole: role,
          claimToken: token,
          emailMatches: emailMatches,
          phoneMatches: phoneMatches || false,
        },
      },
    });

    // Send verification email
    const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    const verifyUrl = `${siteUrl}/api/claim/verify?token=${token}&slug=${slug}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:24px;font-family:system-ui,sans-serif;background:#f4f4f5;">
        <div style="max-width:600px;margin:0 auto;">
          <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:32px;">
            <h1 style="font-size:24px;margin:0 0 16px;color:#18181b;">Verify Your Business Ownership</h1>
            <p style="font-size:16px;color:#3f3f46;">Hi ${(formData.get("name") as string) || "there"},</p>
            <p style="font-size:16px;color:#3f3f46;">
              Someone (hopefully you!) requested to claim the business <strong>${(formData.get("slug") as string)}</strong> on Canopy Directory.
            </p>
            <p style="font-size:16px;color:#3f3f46;">
              Click the button below to verify your ownership:
            </p>
            <p style="text-align:center;margin:24px 0;">
              <a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:500;display:inline-block;">
                Verify Ownership
              </a>
            </p>
            <p style="font-size:14px;color:#71717a;">
              Or copy this link: <br>
              <a href="${verifyUrl}" style="color:#2563eb;word-break:break-all;">${verifyUrl}</a>
            </p>
            <p style="font-size:14px;color:#71717a;margin-top:16px;">
              This link expires in 24 hours. If you didn't request this, please ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
            <p style="font-size:12px;color:#71717a;">Canopy Directory — Business Verification</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Verify Your Business Ownership

      Hi ${(formData.get("name") as string) || "there"},

      Someone requested to claim the business "${(formData.get("slug") as string)}" on Canopy Directory.

      Click the link below to verify your ownership:
      ${verifyUrl}

      This link expires in 24 hours. If you didn't request this, please ignore this email.

      Canopy Directory
    `;

    await sendEmail({
      to: email,
      subject: `Verify ownership of ${(formData.get("slug") as string)} on Canopy Directory`,
      html,
      text,
    });

    // Also notify admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL || email,
      subject: `New Claim Request: ${(formData.get("slug") as string)}`,
      html: `
        <p>New claim request for: ${(formData.get("slug") as string)}</p>
        <p>Claimant: ${(formData.get("name") as string)} (${email})</p>
        <p>Role: ${(formData.get("role") as string)}</p>
        <p>Email matches listing: ${emailMatches ? "Yes" : "No"}</p>
        <p><a href="${siteUrl}/admin/listings/${formData.get("listingId")}">View in Admin</a></p>
      `,
      text: `New claim request for ${(formData.get("slug") as string)} by ${(formData.get("name") as string)} (${email})`,
    });

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Claim request error:", error);
    return NextResponse.json({ error: "Failed to process claim request" }, { status: 500 });
  }
}