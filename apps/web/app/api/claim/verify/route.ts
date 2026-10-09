import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/shared";

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get("slug");
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

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

    // Mark as verified. Account + ownership link are created on /claim/[slug]/complete
    // once the claimant sets their password.
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        verifiedAt: new Date(),
        verificationToken: null,
        verificationExpires: null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: "default",
        action: "LISTING_VERIFY",
        entity: "Listing",
        entityId: listing.id,
        reason: "Email verification completed",
      },
    });

    // Redirect to account setup (create login + link ownership)
    return NextResponse.redirect(new URL(`/claim/${slug}/complete`, request.url));
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL(`/claim/${slug}?error=server`, request.url));
  }
}