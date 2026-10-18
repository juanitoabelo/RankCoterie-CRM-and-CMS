import { NextRequest, NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { getApiUser, canAccessSection } from "@/modules/auth";

export const revalidate = 0;
export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user || !canAccessSection(user, "leads")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const from = params.get("from")?.trim();
  const to = params.get("to")?.trim();
  const status = params.get("status")?.trim();

  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (status && ["NEW", "OPEN", "CLOSED", "ARCHIVED"].includes(status)) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  const fromDate = from && !Number.isNaN(new Date(from).getTime()) ? new Date(from) : null;
  const toDate = to && !Number.isNaN(new Date(to).getTime()) ? new Date(to) : null;
  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
    };
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      notes: { select: { id: true } },
      todos: { where: { finishedAt: null }, select: { id: true } },
    },
  });

  const header = [
    "id",
    "firstName",
    "lastName",
    "email",
    "phones",
    "status",
    "disposition",
    "initialDisposition",
    "assignedToId",
    "campaignId",
    "productId",
    "publisherId",
    "subId",
    "clickId",
    "landingPageId",
    "createdAt",
    "statusDate",
    "openTodos",
    "notes",
  ];
  const rows = leads.map((l) => {
    const phones = Array.isArray(l.phones)
      ? (l.phones as { number?: string; kind?: string }[])
          .map((p) => `${p.number ?? ""}${p.kind ? ` (${p.kind})` : ""}`)
          .join("; ")
      : "";
    return [
      l.id,
      l.firstName,
      l.lastName,
      l.email,
      phones,
      l.status,
      l.disposition,
      l.initialDisposition,
      l.assignedToId,
      l.campaignId,
      l.productId,
      l.publisherId,
      l.subId,
      l.clickId,
      l.landingPageId,
      l.createdAt.toISOString(),
      l.statusDate?.toISOString() ?? "",
      l.todos.length,
      l.notes.length,
    ]
      .map(csvEscape)
      .join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
