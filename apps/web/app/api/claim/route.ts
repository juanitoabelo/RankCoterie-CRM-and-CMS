import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { sendClaimAdminNotification, sendClaimVerificationEmail } from "@/lib/email/claims";
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

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, isLandingPage: false },
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

    // Send verification email (templated — Admin → Client Email Settings)
    const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    const verifyUrl = `${siteUrl}/api/claim/verify?token=${token}&slug=${slug}`;

    await sendClaimVerificationEmail({ to: email, name, slug, verifyUrl });

    // Also notify admin
    await sendClaimAdminNotification({
      to: process.env.ADMIN_EMAIL || email,
      name,
      email,
      role,
      slug,
      emailMatches: Boolean(emailMatches),
      adminLink: `${siteUrl}/admin/listings/${listingId}`,
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