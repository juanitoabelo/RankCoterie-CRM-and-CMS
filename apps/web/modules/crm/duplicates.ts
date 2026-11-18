import { prisma, TENANT_ID } from "@/modules/shared";
import { leadAccessWhere, clientAccessWhere, type CrmAccess } from "./access";

export type DuplicateMatch = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
  score?: number;
  matchedOn: "email" | "phone";
};

function normalizeEmail(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
}

function phonesOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((phone) => {
      if (!phone || typeof phone !== "object") return "";
      const number = (phone as { number?: unknown }).number;
      return typeof number === "string" ? normalizePhone(number) : "";
    })
    .filter((phone) => phone.length >= 7);
}

function personName(person: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.email || "Unnamed";
}

export async function findLeadDuplicates(input: {
  leadId: string;
  email?: string | null;
  phones?: unknown;
  access?: CrmAccess;
}): Promise<DuplicateMatch[]> {
  const email = normalizeEmail(input.email);
  const phones = new Set(phonesOf(input.phones));
  if (!email && phones.size === 0) return [];

  const recent = await prisma.lead.findMany({
    where: { tenantId: TENANT_ID, id: { not: input.leadId }, ...leadAccessWhere(input.access) },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phones: true,
      status: true,
      createdAt: true,
      score: true,
    },
  });

  const matches: DuplicateMatch[] = [];
  for (const lead of recent) {
    const leadEmail = normalizeEmail(lead.email);
    const leadPhones = phonesOf(lead.phones);
    const emailMatch = Boolean(email && leadEmail && email === leadEmail);
    const phoneMatch = leadPhones.find((phone) => phones.has(phone));
    if (!emailMatch && !phoneMatch) continue;
    matches.push({
      id: lead.id,
      name: personName(lead),
      email: lead.email,
      phone: phoneMatch ?? leadPhones[0] ?? null,
      status: lead.status,
      createdAt: lead.createdAt,
      score: lead.score,
      matchedOn: emailMatch ? "email" : "phone",
    });
    if (matches.length >= 5) break;
  }
  return matches;
}

export async function findClientDuplicates(input: {
  clientId: string;
  email?: string | null;
  phones?: unknown;
  access?: CrmAccess;
}): Promise<DuplicateMatch[]> {
  const email = normalizeEmail(input.email);
  const phones = new Set(phonesOf(input.phones));
  if (!email && phones.size === 0) return [];

  const recent = await prisma.client.findMany({
    where: { tenantId: TENANT_ID, id: { not: input.clientId }, ...clientAccessWhere(input.access) },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phones: true,
      createdAt: true,
    },
  });

  const matches: DuplicateMatch[] = [];
  for (const client of recent) {
    const clientEmail = normalizeEmail(client.email);
    const clientPhones = phonesOf(client.phones);
    const emailMatch = Boolean(email && clientEmail && email === clientEmail);
    const phoneMatch = clientPhones.find((phone) => phones.has(phone));
    if (!emailMatch && !phoneMatch) continue;
    matches.push({
      id: client.id,
      name: personName(client),
      email: client.email,
      phone: phoneMatch ?? clientPhones[0] ?? null,
      status: "CLIENT",
      createdAt: client.createdAt,
      matchedOn: emailMatch ? "email" : "phone",
    });
    if (matches.length >= 5) break;
  }
  return matches;
}
