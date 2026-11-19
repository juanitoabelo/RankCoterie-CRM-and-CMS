import { describe, expect, it } from "vitest";
import {
  mapHubspotContacts,
  mapHubspotDeals,
  mapHubspotEngagements,
  recordsFromCsv,
  toHubspotCsv,
} from "../hubspot";

describe("HubSpot import/export mapping", () => {
  it("maps HubSpot contact CSV records into CRM leads", () => {
    const records = recordsFromCsv(
      "First Name,Last Name,Email,Company,Phone\nAda,Lovelace,ada@example.com,Analytical Engines,555-0100",
    );
    expect(mapHubspotContacts(records)).toEqual([
      {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        companyName: "Analytical Engines",
        phone: "555-0100",
      },
    ]);
  });

  it("maps HubSpot deal CSV records into CRM deals", () => {
    const records = recordsFromCsv(
      "Deal Name,Amount,Stage,Close Date,Associated Company,HS Owner Email\nWebsite redesign,12500,Negotiation,2026-12-01,Analytical Engines,ada@example.com",
    );
    expect(mapHubspotDeals(records)).toEqual([
      {
        title: "Website redesign",
        value: 12500,
        currency: "USD",
        stageLabel: "Negotiation",
        expectedCloseDate: "2026-12-01",
        companyName: "Analytical Engines",
        ownerEmail: "ada@example.com",
      },
    ]);
  });

  it("maps engagements into CRM activity inputs", () => {
    const records = recordsFromCsv(
      "Type,Subject,Body,Date,Associated Email,External ID\nEMAIL,Intro,Hello,2026-11-01,ada@example.com,eng-1",
    );
    expect(mapHubspotEngagements(records)).toEqual([
      {
        type: "EMAIL",
        subject: "Intro",
        body: "Hello",
        occurredAt: "2026-11-01",
        email: "ada@example.com",
        externalId: "eng-1",
      },
    ]);
  });

  it("quotes CSV cells and serializes values", () => {
    expect(
      toHubspotCsv(
        [{ email: "ada@example.com", name: "Lovelace, Ada" }],
        [
          { key: "email", label: "Email" },
          { key: "name", label: "Name" },
        ],
      ),
    ).toBe('Email,Name\r\nada@example.com,"Lovelace, Ada"\r\n');
  });
});
