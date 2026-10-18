// Seed realistic sample Leads + Clients (+ a few invoices) modeled on
// Legacy Canopy tblLeads / tblClients field structure, so admin pages
// can be explored with meaningful data. All rows use demo-* emails.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = env.match(/^\s*DATABASE_URL\s*=\s*"(.*?)"?\s*$/m)?.[1];
if (!url) throw new Error("DATABASE_URL not found");
const prisma = new PrismaClient({ datasources: { db: { url } } });
const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";
const out = [];
const ok = (m) => { out.push(m); console.log(m); };

try {
  // Guard: don't double-seed
  const existing = await prisma.lead.count({ where: { email: { contains: "demo-" } } });
  if (existing > 0) {
    console.log(`Already seeded (${existing} demo leads found). Aborting.`);
    process.exit(0);
  }

  // ── 1. CS rep users (for the assign dropdown) ─────────────────────
  const sara = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: TENANT_ID, email: "demo-sara.mitchell@canopy.test" } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      email: "demo-sara.mitchell@canopy.test",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo$demo",
      firstName: "Sara",
      lastName: "Mitchell",
      jobTitle: "Admissions Counselor",
      isRep: true,
      phone: "555-0142",
      active: true,
    },
  });
  const david = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: TENANT_ID, email: "demo-david.ortega@canopy.test" } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      email: "demo-david.ortega@canopy.test",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$demo$demo",
      firstName: "David",
      lastName: "Ortega",
      jobTitle: "Lead Manager",
      isRep: true,
      isCloser: true,
      phone: "555-0177",
      active: true,
    },
  });
  ok(`✓ 2 CS reps created (Sara Mitchell, David Ortega)`);

  // ── 2. Leads — one per lifecycle stage, intake mirrors legacy fields ──
  const leadData = [
    {
      // 1. Fresh inbound web-form lead, no intake yet
      firstName: "Amanda", lastName: "Kowalski",
      email: "demo-amanda.kowalski@example.com",
      phones: [{ number: "555-2001", kind: "mobile" }],
      addresses: [],
      status: "NEW", disposition: "NEW_INQUIRY", initialDisposition: "NEW_INQUIRY",
      statusDate: daysAgo(0), campaignId: "cmp-google-search", productId: "prod-teen-rtf",
      publisherId: "pub-leadvendor-12", subId: "g-summer-2026", clickId: "clk-88421",
      landingPageId: "lp-admissions", intake: {},
    },
    {
      // 2. Callback scheduled, assigned to Sara, partial intake
      firstName: "Marcus", lastName: "Thompson",
      email: "demo-marcus.thompson@example.com",
      phones: [
        { number: "555-2002", kind: "home" },
        { number: "555-2012", kind: "work" },
      ],
      addresses: [{ line1: "482 Birchwood Ln", city: "Boise", state: "ID", zip: "83702", country: "US" }],
      status: "OPEN", disposition: "CALLBACK_SCHEDULED", initialDisposition: "NEW_INQUIRY",
      statusDate: daysAgo(2), assignedToId: sara.id,
      campaignId: "cmp-facebook-ads", productId: "prod-wilderness",
      publisherId: "pub-meta-77", subId: "fb-lookalike-30d", clickId: "clk-91003",
      landingPageId: "lp-free-assessment",
      intake: {
        bestContact: "Weekday afternoons after 3 PM MT",
        patientName: "Ethan Thompson",
        patientAge: "15",
        patientDob: "2011-03-14",
        patientGender: "Male",
        goalAchieve: "Get back on track with school and rebuild trust at home",
      },
    },
    {
      // 3. Fully-qualified lead with complete clinical intake (showcase)
      firstName: "Rachel", lastName: "Nguyen",
      email: "demo-rachel.nguyen@example.com",
      phones: [{ number: "555-2003", kind: "mobile" }],
      addresses: [{ line1: "1180 Oceanview Dr, Apt 4C", city: "San Diego", state: "CA", zip: "92109", country: "US" }],
      status: "OPEN", disposition: "PROGRAM_MATCHED", initialDisposition: "CALLBACK_SCHEDULED",
      statusDate: daysAgo(5), assignedToId: david.id,
      campaignId: "cmp-google-search", productId: "prod-teen-rtf",
      publisherId: "pub-leadvendor-12", subId: "g-teen-rtf-ca", clickId: "clk-90551",
      landingPageId: "lp-admissions",
      intake: {
        bestContact: "Evenings, cell preferred",
        patientName: "Sophia Nguyen",
        patientAge: "16",
        patientDob: "2010-07-22",
        patientGender: "Female",
        insuranceProvider: "Blue Shield of California",
        insuranceType: "PPO",
        insurancePhone: "800-555-0199",
        insuranceMemberId: "BS-CA-7781234",
        insuranceGroupId: "GRP-44021",
        insurancePolicyId: "POL-993811",
        medications: "Fluoxetine 20mg daily",
        diagnosis: "Major depressive disorder, social anxiety",
        behaviors: "School refusal, withdrawal from friends, self-harm ideation (no attempts)",
        pastTreatments: "6 weeks IOP spring 2025, weekly outpatient therapy since Jan 2026",
        treatmentResponse: "Initial improvement, then relapse after therapist transition",
        pastTrauma: "Bullying at previous school 2024–2025",
        grades: "Was 3.8 GPA, now failing 2 classes",
        isDrugUse: false, isSexuallyActive: false, isViolent: false,
        isCourtOrdered: false, isAdopted: false,
        criminalRecord: "",
        financialStatus: "Dual-income household, PPO with $3k deductible remaining",
        goalAchieve: "Residential program with strong academics + weekly therapy",
        desiredTreatment: "Residential treatment center, 6–9 months",
        bothParents: "Both involved; mother is decision-maker for placement",
        knowChildRight: true,
        genderSpecific: true,
        christianProgram: false,
      },
    },
    {
      // 4. Medicaid / court-ordered — intake heavy on insurance + legal
      firstName: "Denise", lastName: "Carter",
      email: "demo-denise.carter@example.com",
      phones: [{ number: "555-2004", kind: "home" }],
      addresses: [{ line1: "905 Magnolia St", city: "Atlanta", state: "GA", zip: "30310", country: "US" }],
      status: "OPEN", disposition: "QUALIFICATION_CALL", initialDisposition: "NEW_INQUIRY",
      statusDate: daysAgo(8), assignedToId: sara.id,
      campaignId: "cmp-medicaid-partners", productId: "prod-medicaid-rtf",
      publisherId: "pub-state-referral", subId: "ga-dfs-referral", clickId: "clk-87200",
      landingPageId: "lp-medicaid",
      intake: {
        bestContact: "Mornings before 11 AM ET",
        patientName: "Jamal Carter",
        patientAge: "14",
        patientDob: "2012-01-09",
        patientGender: "Male",
        insuranceProvider: "Medicaid",
        insuranceType: "Medicaid",
        insurancePhone: "800-804-2500",
        insuranceMemberId: "GA-MCD-5529183",
        medications: "None currently",
        diagnosis: "Conduct disorder, oppositional defiant traits",
        behaviors: "Running away, aggression toward sibling, skipping school",
        pastTreatments: "Outpatient 3 months 2025, school-based counseling",
        treatmentResponse: "Minimal — family rarely attended sessions",
        pastTrauma: "Household instability, father incarceration 2023",
        grades: "Failing most classes, repeated 8th grade",
        isDrugUse: false, isSexuallyActive: false, isViolent: true,
        isCourtOrdered: true, isAdopted: false,
        criminalRecord: "Juvenile trespass citation Feb 2026",
        nextCourtDate: "2026-11-03 — DFCS hearing; need placement plan by 10/20",
        financialStatus: "Single parent, Medicaid only",
        goalAchieve: "Court-compliant placement with family therapy component",
        desiredTreatment: "Therapeutic group home / RTC accepting Medicaid",
        bothParents: "Mother has full rights; father incarcerated",
        knowChildRight: false,
        genderSpecific: false,
        christianProgram: false,
      },
    },
    {
      // 5. Closed lost
      firstName: "Brian", lastName: "Feldstein",
      email: "demo-brian.feldstein@example.com",
      phones: [{ number: "555-2005", kind: "mobile" }],
      addresses: [],
      status: "CLOSED", disposition: "LOST", initialDisposition: "NEW_INQUIRY",
      statusDate: daysAgo(21), closeUserId: david.id,
      campaignId: "cmp-google-search", productId: "prod-teen-rtf",
      publisherId: "pub-leadvendor-12", subId: "g-teen-rtf-ny", clickId: "clk-84010",
      landingPageId: "lp-admissions",
      intake: {
        bestContact: "Text only",
        patientName: "Olivia Feldstein",
        patientAge: "17",
        patientGender: "Female",
        financialStatus: "Family pursuing options in Europe; cost not covered",
        goalAchieve: "Comparing European boarding therapeutic schools",
      },
    },
    {
      // 6. Converted to client (client row created below with leadId)
      firstName: "Priya", lastName: "Sharma",
      email: "demo-priya.sharma@example.com",
      phones: [
        { number: "555-2006", kind: "mobile" },
        { number: "555-2016", kind: "home" },
      ],
      addresses: [{ line1: "77 Cedar Hill Rd", city: "Austin", state: "TX", zip: "78746", country: "US" }],
      status: "CLOSED", disposition: "CONVERTED", initialDisposition: "PROGRAM_MATCHED",
      statusDate: daysAgo(14), assignedToId: david.id, closeUserId: david.id,
      campaignId: "cmp-referral-partners", productId: "prod-teen-rtf",
      publisherId: "pub-texas-therapist-net", subId: "ref-dr-alvarez", clickId: "clk-85600",
      landingPageId: "lp-partners",
      intake: {
        bestContact: "Cell, any time",
        patientName: "Arjun Sharma",
        patientAge: "15",
        patientDob: "2011-05-30",
        patientGender: "Male",
        insuranceProvider: "Aetna",
        insuranceType: "PPO",
        insuranceMemberId: "AET-2209841",
        diagnosis: "Anxiety disorder with selective mutism history",
        goalAchieve: "Structured academics + peer group while continuing ABA-adjacent support",
        desiredTreatment: "Residential, 12 months, accredited academics",
        bothParents: "Both involved and aligned",
        knowChildRight: true,
      },
    },
  ];

  const leads = [];
  for (const l of leadData) {
    const lead = await prisma.lead.create({
      data: {
        tenantId: TENANT_ID,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        phones: l.phones,
        addresses: l.addresses,
        status: l.status,
        disposition: l.disposition,
        initialDisposition: l.initialDisposition,
        statusDate: l.statusDate,
        lastModified: l.statusDate,
        assignedToId: l.assignedToId ?? null,
        closeUserId: l.closeUserId ?? null,
        campaignId: l.campaignId,
        productId: l.productId,
        publisherId: l.publisherId,
        subId: l.subId,
        clickId: l.clickId,
        landingPageId: l.landingPageId,
        intake: l.intake,
        createdAt: l.statusDate,
      },
    });
    leads.push(lead);
  }
  ok(`✓ ${leads.length} leads created (NEW → CONVERTED lifecycle)`);

  // Follow-up ToDo on the showcase lead
  await prisma.toDo.create({
    data: {
      leadId: leads[2].id,
      assigneeId: david.id,
      text: "Tour call with Rachel — confirm Sophia's insurance auth timeline",
      dueAt: daysAgo(-2),
      status: "OPEN",
    },
  });
  // Lead notes
  await prisma.leadNote.createMany({
    data: [
      { leadId: leads[2].id, userId: david.id, note: "Mother called back — wants Riverside vs. Cedar Ridge comparison by Friday." },
      { leadId: leads[3].id, userId: sara.id, note: "DFCS caseworker (Angela P.) will join next call. Have Medicaid auth checklist ready." },
    ],
  });
  ok(`✓ follow-up ToDo + 2 lead notes created`);

  // ── 3. Clients ────────────────────────────────────────────────────
  const clientData = [
    {
      // converted from lead 6
      firstName: "Priya", lastName: "Sharma",
      email: "demo-priya.sharma@example.com",
      phones: [{ number: "555-2006", kind: "mobile" }, { number: "555-2016", kind: "home" }],
      addresses: [{ line1: "77 Cedar Hill Rd", city: "Austin", state: "TX", zip: "78746", country: "US", kind: "billing" }],
      leadId: leads[5].id, campaignId: "cmp-referral-partners", productId: "prod-teen-rtf",
      publisherId: "pub-texas-therapist-net", subId: "ref-dr-alvarez", clickId: "clk-85600",
      maskedCard: "Visa •••• 4242", createdAt: daysAgo(14),
    },
    {
      firstName: "Harold", lastName: "Beckett",
      email: "demo-harold.beckett@example.com",
      phones: [{ number: "555-3001", kind: "home" }],
      addresses: [{ line1: "2201 Lakeshore Blvd", city: "Chicago", state: "IL", zip: "60614", country: "US", kind: "billing" }],
      campaignId: "cmp-google-search", productId: "prod-teen-rtf",
      publisherId: "pub-leadvendor-12", subId: "g-teen-rtf-il", clickId: "clk-83300",
      maskedCard: "MC •••• 8810", createdAt: daysAgo(45),
    },
    {
      firstName: "Yolanda", lastName: "Reeves",
      email: "demo-yolanda.reeves@example.com",
      phones: [{ number: "555-3002", kind: "mobile" }, { number: "555-3102", kind: "work" }],
      addresses: [{ line1: "55 Peachtree Circle", city: "Atlanta", state: "GA", zip: "30328", country: "US", kind: "billing" }],
      campaignId: "cmp-facebook-ads", productId: "prod-wilderness",
      publisherId: "pub-meta-77", subId: "fb-wild-30d", clickId: "clk-82100",
      maskedCard: "Visa •••• 1194", createdAt: daysAgo(38),
    },
    {
      firstName: "Kenji", lastName: "Watanabe",
      email: "demo-kenji.watanabe@example.com",
      phones: [{ number: "555-3003", kind: "home" }],
      addresses: [{ line1: "802 Aloha St", city: "Honolulu", state: "HI", zip: "96815", country: "US", kind: "billing" }],
      campaignId: "cmp-referral-partners", productId: "prod-teen-rtf",
      publisherId: "pub-pacific-network", subId: "ref-dr-lee", clickId: "clk-81500",
      maskedCard: "Amex •••• 3007", createdAt: daysAgo(30),
    },
    {
      firstName: "Fatima", lastName: "Al-Rashid",
      email: "demo-fatima.alrashid@example.com",
      phones: [{ number: "555-3004", kind: "mobile" }],
      addresses: [{ line1: "14 Desert Rose Way", city: "Phoenix", state: "AZ", zip: "85016", country: "US", kind: "billing" }],
      campaignId: "cmp-google-search", productId: "prod-medicaid-rtf",
      publisherId: "pub-leadvendor-12", subId: "g-medicaid-az", clickId: "clk-80900",
      isPartial: true, createdAt: daysAgo(10),
    },
    {
      firstName: "Tom", lastName: "Okafor",
      email: "demo-tom.okafor@example.com",
      phones: [{ number: "555-3005", kind: "home" }],
      addresses: [{ line1: "614 Maple Grove Ave", city: "Columbus", state: "OH", zip: "43215", country: "US", kind: "billing" }],
      campaignId: "cmp-facebook-ads", productId: "prod-wilderness",
      publisherId: "pub-meta-77", subId: "fb-retarget-7d", clickId: "clk-80100",
      maskedCard: "Visa •••• 7756", createdAt: daysAgo(7),
    },
  ];

  const clients = [];
  for (const c of clientData) {
    const client = await prisma.client.create({
      data: {
        tenantId: TENANT_ID,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phones: c.phones,
        addresses: c.addresses,
        maskedCard: c.maskedCard ?? null,
        leadId: c.leadId ?? null,
        campaignId: c.campaignId,
        productId: c.productId,
        publisherId: c.publisherId,
        subId: c.subId,
        clickId: c.clickId,
        isPartial: c.isPartial ?? false,
        createdAt: c.createdAt,
      },
    });
    clients.push(client);
  }
  ok(`✓ ${clients.length} clients created (1 converted-from-lead, 1 partial, varied attribution)`);

  // Client notes
  await prisma.clientNote.createMany({
    data: [
      { clientId: clients[0].id, userId: david.id, note: "Admission confirmed for Sept 8. Insurance auth AET-2209841 approved through 2027-06." },
      { clientId: clients[1].id, userId: sara.id, note: "First payment received — Visa 4242, $4,500 initial deposit." },
      { clientId: clients[2].id, userId: david.id, note: "Family requested male mentor pairing for wilderness phase." },
    ],
  });
  ok(`✓ 3 client notes created`);

  // ── 4. Invoices across clients (APPROVED aged / APPROVED recent / REFUNDED / ATTEMPTED) ──
  const invoices = [
    // aged APPROVED (50+ days) — will show in merchant payout queue if merchant linked
    { clientId: clients[1].id, amount: "4500.00", status: "APPROVED", createdAt: daysAgo(52), chargeDate: daysAgo(52), responseMsg: "Charged — Visa •••• 8810" },
    { clientId: clients[0].id, amount: "6800.00", status: "APPROVED", createdAt: daysAgo(48), chargeDate: daysAgo(48), responseMsg: "Charged — Visa •••• 4242 (Sept admission)" },
    // recent APPROVED
    { clientId: clients[2].id, amount: "3200.00", status: "APPROVED", createdAt: daysAgo(12), chargeDate: daysAgo(12), responseMsg: "Charged — Visa •••• 1194" },
    { clientId: clients[5].id, amount: "2750.00", status: "APPROVED", createdAt: daysAgo(5), chargeDate: daysAgo(5), responseMsg: "Charged — Visa •••• 7756" },
    // refunded
    { clientId: clients[3].id, amount: "1500.00", status: "REFUNDED", createdAt: daysAgo(20), chargeDate: daysAgo(25), responseMsg: "Refund issued — family withdrew before start date" },
    // declined + attempted
    { clientId: clients[4].id, amount: "999.00", status: "DECLINED", createdAt: daysAgo(9), responseMsg: "Declined — insufficient funds (partial client, card on file)" },
    { clientId: clients[4].id, amount: "999.00", status: "ATTEMPTED", createdAt: daysAgo(3), chargeDate: daysAgo(3), retries: 1, responseMsg: "Retry 1 scheduled — dunning email sent" },
  ];
  for (const inv of invoices) {
    await prisma.invoice.create({
      data: {
        clientId: inv.clientId,
        amount: inv.amount,
        status: inv.status,
        createdAt: inv.createdAt,
        chargeDate: inv.chargeDate ?? null,
        retries: inv.retries ?? 0,
        responseMsg: inv.responseMsg,
      },
    });
  }
  ok(`✓ ${invoices.length} invoices created (aged/recent APPROVED, REFUNDED, DECLINED, ATTEMPTED)`);

  ok("\nSeed complete. Log in as admin and explore:");
  ok("  /admin/leads          — 6 leads, filters + CSV export");
  ok("  /admin/leads/<id>     — full intake, assign, convert, notes, todos");
  ok("  /admin/clients        — 6 clients");
  ok("  /admin/clients/<id>   — notes, invoices, edit");
  ok("  /admin/invoices       — 7 invoices with refund/void/chargeback");
} catch (e) {
  console.error("SEED FAILED:", e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
