import { parseCsv, toCsv, type CsvColumn } from "@/lib/admin/csv";

export type HubspotRecord = Record<string, string>;

export type HubspotContact = {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string | null;
  phone: string | null;
};

export type HubspotDeal = {
  title: string;
  value: number;
  currency: string;
  stageLabel: string | null;
  expectedCloseDate: string | null;
  companyName: string | null;
  ownerEmail: string | null;
};

export type HubspotEngagement = {
  type: "NOTE" | "CALL" | "EMAIL" | "MEETING";
  subject: string;
  body: string;
  occurredAt: string | null;
  email: string | null;
  externalId: string | null;
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function read(record: HubspotRecord, aliases: string[]): string {
  for (const alias of aliases) {
    const value = record[normalizeHeader(alias)];
    if (value !== undefined && value.trim()) return value.trim();
  }
  return "";
}

export function recordsFromCsv(text: string): HubspotRecord[] {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row) => {
    const record: HubspotRecord = {};
    headers.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });
    return record;
  });
}

export function mapHubspotContacts(records: HubspotRecord[]): HubspotContact[] {
  return records
    .map((record) => ({
      firstName: read(record, ["First Name", "firstname"]),
      lastName: read(record, ["Last Name", "lastname"]),
      email: read(record, ["Email", "emailaddress"]),
      companyName: read(record, ["Company", "Associated Company", "companyname"]) || null,
      phone: read(record, ["Phone", "phonenumber"]) || null,
    }))
    .filter((contact) => contact.firstName || contact.lastName || contact.email);
}

export function mapHubspotDeals(records: HubspotRecord[]): HubspotDeal[] {
  return records
    .map((record) => {
      const amount = read(record, ["Amount", "Deal Amount", "value"]);
      const numericAmount = Number(amount.replace(/[$,\s]/g, ""));
      return {
        title: read(record, ["Deal Name", "Name", "title"]),
        value: Number.isFinite(numericAmount) ? numericAmount : 0,
        currency: read(record, ["Currency", "Deal Currency"]) || "USD",
        stageLabel: read(record, ["Stage", "Deal Stage"]) || null,
        expectedCloseDate: read(record, ["Close Date", "Expected Close Date"]) || null,
        companyName: read(record, ["Associated Company", "Company"]) || null,
        ownerEmail: read(record, ["HS Owner Email", "Owner Email", "Deal Owner Email"]) || null,
      };
    })
    .filter((deal) => deal.title);
}

export function mapHubspotEngagements(records: HubspotRecord[]): HubspotEngagement[] {
  return records
    .map((record) => {
      const rawType = read(record, ["Type", "Engagement Type", "Activity Type"]).toUpperCase();
      const type: HubspotEngagement["type"] =
        rawType === "EMAIL" || rawType === "CALL" || rawType === "MEETING" ? rawType : "NOTE";
      return {
        type,
        subject: read(record, ["Subject", "Title"]),
        body: read(record, ["Body", "Notes", "Description"]),
        occurredAt: read(record, ["Date", "Activity Date", "Timestamp"]) || null,
        email: read(record, ["Associated Email", "Email", "Contact Email"]) || null,
        externalId: read(record, ["External ID", "Engagement ID", "ID"]) || null,
      };
    })
    .filter((engagement) => engagement.subject || engagement.body);
}

export function toHubspotCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  return toCsv(rows, columns);
}
