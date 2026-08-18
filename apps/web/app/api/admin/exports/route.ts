import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/directory/prismaCatalog";
import { verifyAdminToken, ADMIN_COOKIE, TOKEN_SECRET_CONTEXT } from "@/lib/admin-auth";
import { toCsv, toIsoCell } from "@/lib/admin/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kind = "leads" | "clients" | "invoices";

const KINDS: Kind[] = ["leads", "clients", "invoices"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") as Kind | null;
  if (!kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "Unknown export kind." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !verifyAdminToken(token, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const tenantId = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";

  if (kind === "leads") {
    const leads = await prisma.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
    const csv = toCsv(leads, [
      { key: "id", label: "id" },
      {
        key: "name",
        label: "name",
        value: (l) => `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim(),
      },
      { key: "email", label: "email" },
      {
        key: "phone",
        label: "phone",
        value: (l) => {
          const phones = (l.phones ?? []) as { number?: string }[];
          return phones.map((p) => p.number ?? "").join("; ");
        },
      },
      { key: "status", label: "status" },
      { key: "disposition", label: "disposition" },
      { key: "landingPageId", label: "landing_page" },
      { key: "campaignId", label: "campaign" },
      { key: "publisherId", label: "publisher" },
      { key: "subId", label: "sub_id" },
      { key: "clickId", label: "click_id" },
      { key: "assignedToId", label: "assigned_to" },
      {
        key: "createdAt",
        label: "created",
        value: (l) => toIsoCell(l.createdAt),
      },
    ]);
    return csvResponse(csv, `canopy-leads-${today()}.csv`);
  }

  if (kind === "clients") {
    const clients = await prisma.client.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
    const csv = toCsv(clients, [
      { key: "id", label: "id" },
      {
        key: "name",
        label: "name",
        value: (c) => `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
      },
      { key: "email", label: "email" },
      { key: "maskedCard", label: "masked_card" },
      { key: "leadId", label: "lead_id" },
      { key: "isPartial", label: "partial", value: (c) => (c.isPartial ? "yes" : "no") },
      { key: "campaignId", label: "campaign" },
      { key: "publisherId", label: "publisher" },
      {
        key: "createdAt",
        label: "created",
        value: (c) => toIsoCell(c.createdAt),
      },
    ]);
    return csvResponse(csv, `canopy-clients-${today()}.csv`);
  }

  const invoices = await prisma.invoice.findMany({
    where: { client: { tenantId } },
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { client: true },
  });
  const csv = toCsv(invoices, [
    { key: "id", label: "id" },
    {
      key: "client",
      label: "client",
      value: (i) => `${i.client.firstName ?? ""} ${i.client.lastName ?? ""}`.trim(),
    },
    { key: "clientId", label: "client_id" },
    { key: "amount", label: "amount", value: (i) => i.amount.toFixed(2) },
    { key: "status", label: "status" },
    {
      key: "chargeDate",
      label: "charged",
      value: (i) => toIsoCell(i.chargeDate),
    },
    { key: "isRecurring", label: "recurring", value: (i) => (i.isRecurring ? "yes" : "no") },
    { key: "interval", label: "interval" },
    { key: "retries", label: "retries" },
    { key: "stripePaymentId", label: "stripe_payment_id" },
    { key: "responseMsg", label: "response" },
  ]);
  return csvResponse(csv, `canopy-invoices-${today()}.csv`);
}

function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}