/**
 * Phase 2 editorial content for /g/* region pages (see
 * docs/geocategory-and-page-generation.md §4 "Phase 2").
 *
 * Three layers:
 *  1. Region-level `custom1` upgrades — replaces the identical placeholder
 *     template ("…families {{in region}} find care close to home.") for TX, FL,
 *     NY, VA. Guarded: only overwrites rows that still hold that exact
 *     placeholder, so hand-edited copy is never clobbered.
 *  2. Category-specific `CategoryRegionContent` intro text — the depth layer
 *     that beats the shared custom1. Keyed by (categoryId, state, areaPart):
 *     states use areaPart "ALL", the San Diego city page uses "SOUTHERN".
 *     Upserted on that unique key, reruns update in place.
 *  3. FAQ blocks — 3 Q&A per category, token-rendered per region, stored on
 *     every scope row of the category (scopes can diverge later by editing a
 *     single row). Rendered on the region page with FAQPage JSON-LD.
 *
 * Run: cd packages/db && node --env-file=.env prisma/seed-region-content.mts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = "tenant-masternet";

type Faq = { q: string; a: string };
type CatContent = { faq: Faq[]; scopes: Record<string, string> };

const PLACEHOLDER = "<p>{STATE} families {{in region}} find care close to home.</p>";

const CUSTOM1_UPGRADES: Array<{ regionId: string; stateName: string; next: string }> = [
  {
    regionId: "TX",
    stateName: "Texas",
    next: "<h3>Programs for Teens {{in region}}</h3><p>Texas families {{in region}} browse residential treatment centers, Christian boarding schools and wilderness programs — from DFW and Houston to Austin and San Antonio. Compare approaches side by side below, then contact programs directly about fit, accreditation and cost.</p>",
  },
  {
    regionId: "FL",
    stateName: "Florida",
    next: "<h3>Programs for Teens {{in region}}</h3><p>Florida families {{in region}} can choose from residential programs, therapeutic boarding schools and family-therapy services across the state, from the Panhandle to South Florida. Start with the program type that fits your situation, then ask each program about clinical approach, academics and cost.</p>",
  },
  {
    regionId: "NY",
    stateName: "New York",
    next: "<h3>Programs for Teens {{in region}}</h3><p>New York families {{in region}} look for care both in-state and within driving distance of New York City, including residential treatment, wilderness therapy and family counseling options. Use the listings below to compare programs, then confirm licensing and availability directly.</p>",
  },
  {
    regionId: "VA",
    stateName: "Virginia",
    next: "<h3>Programs for Teens {{in region}}</h3><p>Virginia families {{in region}} can explore faith-based boarding schools, residential treatment and teen counseling programs across the Commonwealth — from Northern Virginia to Hampton Roads. Compare each program's approach, then ask about openings, accreditation and cost.</p>",
  },
];

type Scope = { id: string; state: string; areaPart: "ALL" | "SOUTHERN" };

const STATE_SCOPES: Scope[] = [
  { id: "ca", state: "CA", areaPart: "ALL" },
  { id: "tx", state: "TX", areaPart: "ALL" },
  { id: "fl", state: "FL", areaPart: "ALL" },
  { id: "ny", state: "NY", areaPart: "ALL" },
  { id: "va", state: "VA", areaPart: "ALL" },
  { id: "ca-south", state: "CA", areaPart: "SOUTHERN" }, // San Diego city page
];

const CONTENT: Record<string, CatContent> = {
  "wilderness-therapy": {
    faq: [
      {
        q: "What does a wilderness therapy program {{in region}} cost?",
        a: "Cost depends on program length, clinical staffing and travel — plans typically run several months. Ask each program for a full fee schedule, what's included, and whether insurance or financial aid applies. Compare total cost of care, not just the sticker price.",
      },
      {
        q: "How long do wilderness therapy programs last?",
        a: "Most programs structure care in phases — assessment, field work and transition — commonly measured in weeks to a few months. The right length depends on your teen's needs; ask how each program decides when a student is ready to step down.",
      },
      {
        q: "Is wilderness therapy safe for teens?",
        a: "Safety depends on accreditation, staff ratios, clinical supervision and emergency protocols. Ask each program about medical staffing, weather procedures, how families are updated while crews are in the field, and how progress is documented.",
      },
    ],
    scopes: {
      ca: "<p>Wilderness therapy programs {{in region}} pair backcountry expeditions with clinical check-ins, giving teens space to step away from daily stress while field staff and clinicians work with families on goals set at intake. Programs differ in length, terrain and therapy model — ask each one how progress is measured and what aftercare looks like.</p>",
      tx: "<p>Wilderness therapy programs {{in region}} use Texas ranch land and hill-country trails for hiking, camping and structured group challenges, combined with weekly therapy and school-credit work. When comparing options, ask how the program handles medical needs, family sessions and the transition back home.</p>",
      fl: "<p>Wilderness therapy programs {{in region}} take advantage of Florida's coastal and pine-flat terrain for canoeing, hiking and campcraft while counselors keep clinical work moving. Look for clear plans on academics, insurance and what happens after the outdoor phase ends.</p>",
      ny: "<p>Wilderness therapy programs {{in region}} lean on Adirondack-style trekking and cold-weather camping to build confidence, paired with therapy sessions and parent coaching. Ask each program about season, group size and how families are kept updated while crews are in the field.</p>",
      va: "<p>Wilderness therapy programs {{in region}} run expeditions through the Blue Ridge and Appalachian foothills, mixing trail days with clinical sessions and family workshops. Compare each program's accreditation, staff ratios and plan for the step-down phase.</p>",
      "ca-south":
        "<p>Wilderness therapy programs {{in region}} in Southern California combine desert and coastal trail time with therapy sessions — a fit for families who want outdoor structure without leaving the state. Ask about heat protocols, licensing and how school work is handled on trail.</p>",
    },
  },
  "residential-treatment": {
    faq: [
      {
        q: "How do I choose a residential treatment center {{in region}}?",
        a: "Start with licensing and accreditation, then ask about staffing ratios, therapy frequency, schooling and family involvement. Tour if you can, speak with the clinical director, and verify what a typical day looks like for a new admission.",
      },
      {
        q: "How long does residential treatment take?",
        a: "Lengths of stay vary from a few weeks to several months depending on goals and progress. Ask each center how they set discharge criteria, what aftercare they provide, and how progress is measured before you commit.",
      },
      {
        q: "Does insurance cover residential treatment for teens?",
        a: "Many plans cover medically necessary treatment, but coverage varies widely. Ask each center which insurers they accept, what prior authorization looks like, and get coverage details in writing before intake.",
      },
    ],
    scopes: {
      ca: "<p>Residential treatment centers {{in region}} provide 24-hour structure with clinical staffing, schooling and family programming for teens who need more support than outpatient care. Check each center's licensing, staff-to-youth ratio and typical length of stay before deciding.</p>",
      tx: "<p>Residential treatment centers {{in region}} range from large campuses to small therapeutic communities, with on-site schooling common alongside individual and group therapy. Visit if you can, and ask what a typical day looks like for a new admission.</p>",
      fl: "<p>Residential treatment centers {{in region}} serve teens with emotional, behavioral or substance-related needs through structured routines, therapy and academics. Ask how the center involves parents between visits and what its discharge planning includes.</p>",
      ny: "<p>Residential treatment centers {{in region}} vary from clinical campuses to smaller therapeutic homes, with options close to family and further away depending on the setting. Confirm licensing, insurance acceptance and visiting policies early in your search.</p>",
      va: "<p>Residential treatment centers {{in region}} combine counseling, schooling and daily-living skills in a supervised setting, with many programs serving teens across the Mid-Atlantic. Ask about accreditation, aftercare support and how progress is documented.</p>",
      "ca-south":
        "<p>Residential treatment centers {{in region}} in Southern California offer year-round programs with family involvement, from small group homes to larger clinical campuses. Compare licensing, school accreditation and how quickly intake can be completed.</p>",
    },
  },
  "adoption-foster-care": {
    faq: [
      {
        q: "How do I foster or adopt a child {{in region}}?",
        a: "The path usually starts with an orientation, a home study and licensing or approval classes, then matching and placement. Private infant adoption is a separate route with different costs. Contact local agencies to compare timelines, requirements and support.",
      },
      {
        q: "What are the requirements to become a foster parent?",
        a: "Requirements vary by state but typically include background checks, training hours, a safe home and financial stability — not wealth. Agencies walk you through each step; ask about ongoing support, respite care and how often licensing must be renewed.",
      },
      {
        q: "What is the difference between foster care and adoption?",
        a: "Foster care is temporary care that usually aims at family reunification; adoption transfers legal parentage permanently. Many families move from foster-to-adopt. Ask local agencies how often that path opens and what support exists for both outcomes.",
      },
    ],
    scopes: {
      ca: "<p>Adoption and foster care agencies {{in region}} guide families through orientation, home study and licensing — from county child-welfare offices to private agencies handling foster-to-adopt matches. Compare each agency's support after placement, not just its intake process.</p>",
      tx: "<p>Foster care and adoption {{in region}} run through state and private agencies across Texas, with foster-to-adopt a common path for families who begin as licensed caregivers. Ask about training schedules, wait times for matching, and post-placement support.</p>",
      fl: "<p>Florida families {{in region}} can foster or adopt through community-based care agencies, including kinship arrangements where relatives take the lead. Compare licensing timelines, monthly support and how each agency prepares families for children with trauma histories.</p>",
      ny: "<p>Adoption and foster care {{in region}} span New York's public and private agencies, with home studies, training and matching handled differently by each. Ask how agencies support families after placement, especially when adopting from foster care.</p>",
      va: "<p>Military-connected and civilian families {{in region}} foster and adopt through Virginia's public and private agencies, each with its own licensing process. Ask how licensure transfers during PCS moves and what post-placement support looks like.</p>",
      "ca-south":
        "<p>San Diego families {{in region}} foster and adopt through county and private agencies, many serving military-connected households. Compare each agency's training schedule, home-study timeline and support for kinship caregivers before choosing where to apply.</p>",
    },
  },
  "christian-boarding-schools": {
    faq: [
      {
        q: "How much do Christian boarding schools {{in region}} cost?",
        a: "Tuition varies widely with academics, residential structure and program length — ask each school for a full breakdown of fees and whether financial aid, scholarships or payment plans exist. Compare total cost of attendance, not just the sticker price.",
      },
      {
        q: "Are Christian boarding schools accredited?",
        a: "Accreditation varies by school — ask which regional or national body accredits it, whether credits transfer, and how college prep is handled. Request graduation and college-placement information, and confirm credentials are recognized where your teen will apply.",
      },
      {
        q: "What does a typical week look like at a Christian boarding school?",
        a: "Most combine academics, chapel or worship, athletics, counseling and work crews or electives, with structured weekends. Ask each school about the weekly schedule, rules for contacting family, and how new students are supported through the adjustment.",
      },
    ],
    scopes: {
      ca: "<p>Christian boarding schools {{in region}} pair accredited academics with discipleship, counseling and outdoor programs in California's varied settings. Compare each school's accreditation, faith background and graduate outcomes before touring.</p>",
      tx: "<p>Christian boarding schools {{in region}} in Texas often combine college-prep academics with ranch-style work programs and chapel life. Ask about accreditation, counseling staffing and how families stay involved between visits.</p>",
      fl: "<p>Christian boarding schools {{in region}} use Florida's year-round climate for athletics, outdoor ministry and structured study alongside faith formation. Compare accreditation, class sizes and what a typical weekend looks like.</p>",
      ny: "<p>Christian boarding schools {{in region}} emphasize college-prep academics, mentoring and service in the Northeast's prep-school tradition. Ask about accreditation, denomination, counseling and how credits transfer if your teen returns to a local school.</p>",
      va: "<p>Christian boarding schools {{in region}} sit in Virginia's Blue Ridge and Shenandoah settings, mixing rigorous academics with outdoor ministry and mentoring. Compare accreditation, spiritual-life structure and each school's approach to homesick new students.</p>",
      "ca-south":
        "<p>Christian boarding schools {{in region}} in Southern California pair faith formation with strong academics and year-round outdoor programs. Ask about accreditation, counseling resources and how the school supports students through the first months.</p>",
    },
  },
  "family-therapy-services": {
    faq: [
      {
        q: "What happens in family therapy for teens {{in region}}?",
        a: "Sessions typically include the teen and parents together, plus periodic individual check-ins — the therapist looks at communication patterns, boundaries and conflict at home. Ask each provider how they structure sessions, set goals, and measure progress with the family.",
      },
      {
        q: "How long does family therapy take?",
        a: "Some families work on a focused issue for a few months; others stay in care longer as needs evolve. Ask each provider for a typical timeline for concerns like yours, how progress is reviewed, and when they recommend stepping down to less frequent sessions.",
      },
      {
        q: "Can family therapy help if my teen refuses to attend?",
        a: "Many providers start with parents alone or split sessions to build buy-in, then bring the teen in gradually. Ask how the therapist engages reluctant teens, which model they use, and what structure they expect between sessions.",
      },
    ],
    scopes: {
      ca: "<p>Family therapy services {{in region}} help parents and teens rebuild communication through structured sessions, often blending individual check-ins with joint work. California families {{in region}} can compare in-office, in-home and telehealth providers below.</p>",
      tx: "<p>Family therapy services {{in region}} cover parent-teen conflict, blended-family adjustment and support around bigger transitions, with in-office and telehealth options across Texas. Ask each practice how it involves teens who are reluctant to attend.</p>",
      fl: "<p>Family therapy services {{in region}} support parents and teens through conflict, divorce adjustment and behavioral concerns, with practices offering office and telehealth sessions statewide. Ask how each provider structures the first few sessions.</p>",
      ny: "<p>Family therapy services {{in region}} range from private practices to clinic-based programs, in-person across New York and telehealth where permitted. Compare each provider's approach to engaging teens who resist coming in.</p>",
      va: "<p>Family therapy services {{in region}} help Virginia families work through conflict, school stress and life transitions, with practices from Northern Virginia to Hampton Roads. Ask about session structure, teen participation and how progress gets reviewed.</p>",
      "ca-south":
        "<p>Family therapy services {{in region}} in San Diego include private practices and clinic programs offering in-person and telehealth sessions. Compare each provider's teen engagement approach, scheduling and how quickly intake can start.</p>",
    },
  },
  "teen-depression-anxiety": {
    faq: [
      {
        q: "What is the difference between therapy and a residential program for teen depression {{in region}}?",
        a: "Weekly outpatient therapy suits many teens; residential or intensive programs add 24-hour structure when safety, school refusal or severity outpaces outpatient care. Ask each provider how they decide level of care and what the step-up path looks like if things change.",
      },
      {
        q: "Which therapies are used for teen depression and anxiety?",
        a: "Common approaches include CBT, DBT skills groups, family therapy and medication evaluation when appropriate. Ask each program which modalities its clinicians are trained in, how progress is tracked, and how they coordinate with your teen's school and doctor.",
      },
      {
        q: "How do I know if my teen needs more than weekly therapy?",
        a: "Warning signs include withdrawal lasting weeks, school refusal, safety concerns or no improvement after consistent sessions. If you're unsure, ask for a clinical assessment — programs in {{in region}} should tell you honestly when outpatient care is enough.",
      },
    ],
    scopes: {
      ca: "<p>Teen depression and anxiety programs {{in region}} range from outpatient therapy and intensive outpatient groups to residential care, matched to severity. Compare each provider's approach, waiting list and how they coordinate with schools.</p>",
      tx: "<p>Teen depression and anxiety support {{in region}} spans outpatient therapy, intensive outpatient programs and residential options across Texas. Ask each provider about wait times, evidence-based approaches and how family members are involved in treatment.</p>",
      fl: "<p>Teen depression and anxiety programs {{in region}} offer outpatient therapy, intensive groups and higher levels of care statewide. Compare providers on approach, availability and how they handle crises between sessions.</p>",
      ny: "<p>Teen depression and anxiety care {{in region}} includes private therapy, school-based support and intensive programs across New York. Ask each provider about their approach to school refusal, medication evaluation and family involvement.</p>",
      va: "<p>Teen depression and anxiety programs {{in region}} provide outpatient therapy through intensive and residential options across Virginia. Compare providers on modality, access and how they coordinate with your teen's school and pediatrician.</p>",
      "ca-south":
        "<p>Teen depression and anxiety programs {{in region}} in San Diego span outpatient therapy, intensive outpatient groups and residential care. Compare wait times, approach and how each provider involves parents between sessions.</p>",
    },
  },
};

async function main() {
  // 1. custom1 placeholder upgrades (guarded — never clobbers edited copy).
  for (const u of CUSTOM1_UPGRADES) {
    const placeholder = PLACEHOLDER.replace("{STATE}", u.stateName);
    const res = await prisma.region.updateMany({
      where: { tenantId: TENANT_ID, id: u.regionId, custom1: placeholder },
      data: { custom1: u.next },
    });
    console.log(
      res.count === 1
        ? `custom1 upgraded: ${u.regionId}`
        : `custom1 left as-is (already edited?): ${u.regionId}`,
    );
  }

  // 2+3. Category-specific intro rows, each carrying its category's FAQ set.
  const categories = await prisma.category.findMany({
    where: { tenantId: TENANT_ID, slug: { in: Object.keys(CONTENT) } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const [catSlug, content] of Object.entries(CONTENT)) {
    const categoryId = bySlug.get(catSlug);
    if (!categoryId) throw new Error(`category not found: ${catSlug}`);
    for (const scope of STATE_SCOPES) {
      const text = content.scopes[scope.id];
      if (!text) throw new Error(`missing content for ${catSlug} × ${scope.id}`);
      await prisma.categoryRegionContent.upsert({
        where: {
          categoryId_state_areaPart: {
            categoryId,
            state: scope.state,
            areaPart: scope.areaPart,
          },
        },
        create: {
          state: scope.state,
          areaPart: scope.areaPart,
          categoryId,
          customText: text,
          faq: content.faq,
        },
        update: { customText: text, faq: content.faq },
      });
    }
    console.log(
      `CRC rows upserted: ${catSlug} (${STATE_SCOPES.length} scopes, ${content.faq.length} FAQs)`,
    );
  }

  const total = await prisma.categoryRegionContent.count();
  console.log(`\nDone. CategoryRegionContent rows in DB: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
