import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";
import { getApiUser, canAccessSectionForUser } from "@/modules/auth";

async function authed(): Promise<boolean> {
  const user = await getApiUser();
  return user !== null && (await canAccessSectionForUser(user, "products"));
}

export async function POST(request: NextRequest) {
  if (!(await authed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const ids = formData.getAll("ids") as string[];
    const value = formData.get("value") as string;

    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "No listings selected" }, { status: 400 });
    }

    const updateData: { status?: string; tier?: string; featuredUntil?: Date | null } = {};

    switch (action) {
      case "status":
        if (!["DRAFT", "PENDING_REVIEW", "LIVE", "SUSPENDED", "EXPIRED"].includes(value)) {
          return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
        }
        updateData.status = value;
        break;
      case "tier":
        if (!["FREE", "STANDARD", "PREMIUM", "FEATURED", "SUPPRESSED"].includes(value)) {
          return NextResponse.json({ ok: false, error: "Invalid tier" }, { status: 400 });
        }
        updateData.tier = value;
        break;
      case "featured":
        if (value === "true") {
          updateData.featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        } else {
          updateData.featuredUntil = null;
        }
        break;
      default:
        return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const result = await prisma.listing.updateMany({
      where: { id: { in: ids }, tenantId: TENANT_ID },
      data: updateData,
    });

    await logAudit({
      action: `LISTING_BULK_${action.toUpperCase()}`,
      entity: "Listing",
      entityId: ids.join(","),
      meta: { action, value, count: result.count },
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ ok: false, error: "Bulk update failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await authed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids")?.split(",") || [];

    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "No listings selected" }, { status: 400 });
    }

    const result = await prisma.listing.deleteMany({
      where: { id: { in: ids }, tenantId: TENANT_ID },
    });

    await logAudit({
      action: "LISTING_BULK_DELETE",
      entity: "Listing",
      entityId: ids.join(","),
      meta: { count: result.count },
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ ok: false, error: "Bulk delete failed" }, { status: 500 });
  }
}