"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";

export type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

function validateContact(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string | null {
  const firstName = input.firstName?.trim() || "";
  const lastName = input.lastName?.trim() || "";
  const email = input.email?.trim() || "";
  if (!firstName && !lastName) return "First or last name is required.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

const CARD_TYPE_LABELS: Record<string, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  DISCOVER: "Discover",
  AMEX: "Amex",
};

function buildMaskedCard(cardType?: string, cardLast4?: string): string | null {
  const last4 = cardLast4?.trim();
  if (!last4) return null;
  if (!/^\d{4}$/.test(last4)) return null;
  const raw = (cardType ?? "").trim();
  const label = CARD_TYPE_LABELS[raw.toUpperCase()] ?? (raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "Card");
  return `${label} •••• ${last4}`;
}

function buildPhones(home?: string, work?: string, cell?: string) {
  return [
    home?.trim() && { number: home.trim(), kind: "home" },
    work?.trim() && { number: work.trim(), kind: "work" },
    cell?.trim() && { number: cell.trim(), kind: "cell" },
  ].filter(Boolean) as { number: string; kind: string }[];
}

function buildBillingAddress(
  line1?: string,
  city?: string,
  state?: string,
  zip?: string,
  country?: string,
) {
  const has = [line1, city, state, zip].some((v) => v?.trim());
  if (!has) return [];
  return [
    {
      line1: line1?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zip: zip?.trim() || null,
      country: country?.trim() || "US",
      kind: "billing",
    },
  ];
}

function clientError(clientId: string, error: string): never {
  redirect(`/admin/clients/${clientId}?error=${encodeURIComponent(error)}`);
}
function clientsListError(error: string): never {
  redirect(`/admin/clients?error=${encodeURIComponent(error)}`);
}
function newClientError(error: string): never {
  redirect(`/admin/clients/new?error=${encodeURIComponent(error)}`);
}

export async function addClient(input: {
  firstName: string;
  lastName: string;
  email?: string;
  phoneHome?: string;
  phoneWork?: string;
  phoneCell?: string;
  campaignId?: string;
  assignedToId?: string;
  billAddress1?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billCountry?: string;
  cardType?: string;
  cardLast4?: string;
  isPartial?: boolean;
}): Promise<ActionResult> {
  const user = await requireSection("clients");
  const invalid = validateContact(input);
  if (invalid) return { ok: false, error: invalid };

  const assignedToId = input.assignedToId?.trim() || null;
  if (assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee) return { ok: false, error: "Assigned user not found." };
  }
  const maskedCard = buildMaskedCard(input.cardType, input.cardLast4);
  if (input.cardLast4?.trim() && !maskedCard) {
    return { ok: false, error: "Card last-4 must be exactly 4 digits." };
  }

  const client = await prisma.client.create({
    data: {
      tenantId: TENANT_ID,
      firstName: input.firstName.trim() || null,
      lastName: input.lastName.trim() || null,
      email: input.email?.trim() || null,
      phones: buildPhones(input.phoneHome, input.phoneWork, input.phoneCell) as Prisma.InputJsonValue,
      addresses: buildBillingAddress(
        input.billAddress1,
        input.billCity,
        input.billState,
        input.billZip,
        input.billCountry,
      ) as Prisma.InputJsonValue,
      maskedCard,
      assignedToId,
      campaignId: input.campaignId?.trim() || null,
      isPartial: input.isPartial ?? false,
    },
  });
  await logAudit({
    action: "CLIENT_CREATE",
    entity: "Client",
    entityId: client.id,
    actorId: user.id,
    reason: `Client "${input.firstName} ${input.lastName}" created manually`,
  });
  revalidatePath("/admin/clients");
  return { ok: true, message: "Client created.", id: client.id };
}

export async function updateClient(
  clientId: string,
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phoneHome?: string;
    phoneWork?: string;
    phoneCell?: string;
    campaignId?: string;
    assignedToId?: string;
    billAddress1?: string;
    billCity?: string;
    billState?: string;
    billZip?: string;
    billCountry?: string;
    cardType?: string;
    cardLast4?: string;
    isPartial?: boolean;
  },
): Promise<ActionResult> {
  const user = await requireSection("clients");
  const invalid = validateContact(input);
  if (invalid) return { ok: false, error: invalid };
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client not found." };

  const assignedToId = input.assignedToId?.trim() || null;
  if (assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee) return { ok: false, error: "Assigned user not found." };
  }

  // Only touch maskedCard when last-4 provided; keep existing otherwise
  let maskedCard = client.maskedCard;
  if (input.cardLast4?.trim()) {
    const built = buildMaskedCard(input.cardType, input.cardLast4);
    if (!built) return { ok: false, error: "Card last-4 must be exactly 4 digits." };
    maskedCard = built;
  }

  // Keep non-billing addresses (e.g. shipping) intact when replacing billing
  const oldAddresses = Array.isArray(client.addresses)
    ? (client.addresses as Record<string, unknown>[])
    : [];
  const nonBilling = oldAddresses.filter((a) => a.kind !== "billing");
  const billing = buildBillingAddress(
    input.billAddress1,
    input.billCity,
    input.billState,
    input.billZip,
    input.billCountry,
  );

  await prisma.client.update({
    where: { id: clientId },
    data: {
      firstName: input.firstName.trim() || null,
      lastName: input.lastName.trim() || null,
      email: input.email?.trim() || null,
      phones: buildPhones(input.phoneHome, input.phoneWork, input.phoneCell) as Prisma.InputJsonValue,
      addresses: [...billing, ...nonBilling] as Prisma.InputJsonValue,
      maskedCard,
      assignedToId,
      campaignId: input.campaignId?.trim() || client.campaignId,
      ...(typeof input.isPartial === "boolean" ? { isPartial: input.isPartial } : {}),
    },
  });
  await logAudit({
    action: "CLIENT_UPDATE",
    entity: "Client",
    entityId: clientId,
    actorId: user.id,
    reason: `Client "${input.firstName} ${input.lastName}" updated`,
  });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, message: "Client updated." };
}

/** Toggle the legacy partial-client flag (incomplete billing profile). */
export async function toggleClientPartial(clientId: string): Promise<ActionResult> {
  const user = await requireSection("clients");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client not found." };
  await prisma.client.update({
    where: { id: clientId },
    data: { isPartial: !client.isPartial },
  });
  await logAudit({
    action: "CLIENT_UPDATE",
    entity: "Client",
    entityId: clientId,
    actorId: user.id,
    reason: `Client partial flag → ${!client.isPartial}`,
    meta: { isPartial: !client.isPartial },
  });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, message: !client.isPartial ? "Marked as partial client." : "Partial flag cleared." };
}

/** Delete a client. Blocked while invoices exist (invoices require a client). */
export async function deleteClient(clientId: string): Promise<ActionResult> {
  const user = await requireSection("clients");
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { _count: { select: { invoices: true } } },
  });
  if (!client) return { ok: false, error: "Client not found." };
  if (client._count.invoices > 0) {
    return {
      ok: false,
      error: `Client has ${client._count.invoices} invoice(s). Delete or reassign those first.`,
    };
  }
  await prisma.$transaction([
    prisma.clientNote.deleteMany({ where: { clientId } }),
    prisma.client.delete({ where: { id: clientId } }),
  ]);
  await logAudit({
    action: "CLIENT_DELETE",
    entity: "Client",
    entityId: clientId,
    actorId: user.id,
    reason: `Client "${client.firstName} ${client.lastName}" deleted`,
  });
  revalidatePath("/admin/clients");
  return { ok: true, message: "Client deleted." };
}

export async function addClientNote(clientId: string, note: string): Promise<ActionResult> {
  const user = await requireSection("clients");
  const trimmed = note.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client not found." };

  await prisma.clientNote.create({ data: { clientId, note: trimmed, userId: user.id } });
  await logAudit({
    action: "CLIENT_NOTE_ADD",
    entity: "ClientNote",
    entityId: clientId,
    actorId: user.id,
    reason: `Note added to client ${client.firstName} ${client.lastName}`.trim(),
  });
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

export async function deleteClientNote(noteId: string): Promise<ActionResult> {
  const user = await requireSection("clients");
  const note = await prisma.clientNote.findUnique({ where: { id: noteId } });
  if (!note) return { ok: false, error: "Note not found." };
  await prisma.clientNote.delete({ where: { id: noteId } });
  await logAudit({
    action: "CLIENT_NOTE_DELETE",
    entity: "ClientNote",
    entityId: noteId,
    actorId: user.id,
    reason: `Note deleted from client ${note.clientId}`,
  });
  revalidatePath(`/admin/clients/${note.clientId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Form-action wrappers (Next 16: <form action> needs (FormData) => void | Promise<void>).
// Failures redirect back with ?error= so nothing fails silently.
// ---------------------------------------------------------------------------

export async function clientAddForm(formData: FormData): Promise<void> {
  const result = await addClient({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phoneHome: String(formData.get("phoneHome") ?? ""),
    phoneWork: String(formData.get("phoneWork") ?? ""),
    phoneCell: String(formData.get("phoneCell") ?? ""),
    campaignId: String(formData.get("campaignId") ?? ""),
    assignedToId: String(formData.get("assignedToId") ?? ""),
    billAddress1: String(formData.get("billAddress1") ?? ""),
    billCity: String(formData.get("billCity") ?? ""),
    billState: String(formData.get("billState") ?? ""),
    billZip: String(formData.get("billZip") ?? ""),
    billCountry: String(formData.get("billCountry") ?? ""),
    cardType: String(formData.get("cardType") ?? ""),
    cardLast4: String(formData.get("cardLast4") ?? ""),
    isPartial: formData.get("isPartial") === "on" || formData.get("isPartial") === "true",
  });
  if (!result.ok) newClientError(result.error ?? "Could not create client.");
  if (!result.id) newClientError("Could not create client.");
  redirect(`/admin/clients/${result.id}?ok=${encodeURIComponent("Client created.")}`);
}

export async function clientEditForm(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "");
  const result = await updateClient(clientId, {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phoneHome: String(formData.get("phoneHome") ?? ""),
    phoneWork: String(formData.get("phoneWork") ?? ""),
    phoneCell: String(formData.get("phoneCell") ?? ""),
    campaignId: String(formData.get("campaignId") ?? ""),
    assignedToId: String(formData.get("assignedToId") ?? ""),
    billAddress1: String(formData.get("billAddress1") ?? ""),
    billCity: String(formData.get("billCity") ?? ""),
    billState: String(formData.get("billState") ?? ""),
    billZip: String(formData.get("billZip") ?? ""),
    billCountry: String(formData.get("billCountry") ?? ""),
    cardType: String(formData.get("cardType") ?? ""),
    cardLast4: String(formData.get("cardLast4") ?? ""),
  });
  if (!result.ok) clientError(clientId, result.error ?? "Could not save changes.");
  redirect(`/admin/clients/${clientId}?ok=${encodeURIComponent("Client updated.")}`);
}

export async function clientNoteForm(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "");
  const result = await addClientNote(clientId, String(formData.get("note") ?? ""));
  if (!result.ok) clientError(clientId, result.error ?? "Could not add note.");
  redirect(`/admin/clients/${clientId}?ok=${encodeURIComponent("Note added.")}`);
}

export async function clientNoteDeleteForm(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "");
  const result = await deleteClientNote(String(formData.get("noteId") ?? ""));
  if (!result.ok) clientError(clientId, result.error ?? "Could not delete note.");
  redirect(`/admin/clients/${clientId}?ok=${encodeURIComponent("Note deleted.")}`);
}

export async function clientPartialForm(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "");
  const result = await toggleClientPartial(clientId);
  if (!result.ok) clientError(clientId, result.error ?? "Could not update partial flag.");
  redirect(`/admin/clients/${clientId}?ok=${encodeURIComponent(result.message ?? "Updated.")}`);
}

export async function clientDeleteForm(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "");
  const result = await deleteClient(clientId);
  if (!result.ok) clientError(clientId, result.error ?? "Could not delete client.");
  redirect(`/admin/clients?ok=${encodeURIComponent("Client deleted.")}`);
}
