import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/shared";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const slug = searchParams.get("slug");

    if (!token || !slug) {
      return NextResponse.redirect(
        new URL(`/claim/${slug}?error=invalid_token`, request.url)
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        claimedById: true,
        verificationToken: true,
        verificationExpires: true,
        verifiedAt: true,
        email: true,
      },
    });

    if (!listing) {
      return NextResponse.redirect(new URL(`/claim/${slug}?error=not_found`, request.url));
    }

    if (listing.claimedById) {
      return NextResponse.redirect(new URL(`/listing/${slug}?claimed=already`, request.url));
    }

    if (!listing.verificationToken || listing.verificationToken !== token) {
      return NextResponse.redirect(new URL(`/claim/${slug}?error=invalid_token`, request.url));
    }

    if (listing.verificationExpires && new Date(listing.verificationExpires) < new Date()) {
      return NextResponse.redirect(new URL(`/claim/${slug}?error=expired`, request.url));
    }

    // Mark as verified - for now we'll just mark it verified
    // In production, you'd create a user account and link it
    await prisma.listing.update({
      where: { id: slug },
      data: {
        verifiedAt: new Date(),
        verificationToken: null,
        verificationExpires: null,
        // claimedById would be set when user creates account
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: "default",
        action: "LISTING_VERIFY",
        entity: "Listing",
        entityId: slug,
        reason: "Email verification completed",
      },
    });

    // Redirect to success page
    return NextResponse.redirect(new URL(`/listing/${slug}?verified=success`, request.url));
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL(`/claim/${slug}?error=server`, request.url));
  }
}