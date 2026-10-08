import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const ids = formData.getAll("ids") as string[];

    const where = ids.length ? { id: { in: ids }, tenantId: TENANT_ID } : { tenantId: TENANT_ID };

    const listings = await prisma.listing.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        regions: true,
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "ID", "Title", "Slug", "Tier", "Status", "Company Name", "Phone", "Email",
      "Website", "Address", "City", "State", "Zip", "Summary", "Categories",
      "Regions", "Tier", "Subscription Status", "Created At", "Updated At"
    ];

    const rows = listings.map((l) => [
      l.id,
      l.title,
      l.slug,
      l.tier,
      l.status,
      l.companyName || "",
      l.phone || "",
      l.email || "",
      l.website || "",
      l.address || "",
      l.city || "",
      l.state || "",
      l.zip || "",
      (l.summary || "").replace(/\n/g, " "),
      l.categories.map((c) => c.category.title).join("; "),
      l.regions.map((r) => r.regionId).join("; "),
      l.tier,
      l.subscription?.status || "NONE",
      l.createdAt.toISOString(),
      l.updatedAt.toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="listings-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ ok: false, error: "Export failed" }, { status: 500 });
  }
}