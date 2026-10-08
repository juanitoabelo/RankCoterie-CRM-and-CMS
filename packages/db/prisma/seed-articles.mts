/**
 * Canopy V2 — sample article seed (ADDITIVE, idempotent).
 *
 * Creates 6 categories (topics), 6 regions, 24 placeholder images and
 * 20 sample articles (ContentTemplate) with SEO fields, category
 * assignment, featured images, in-body images and per-region variants.
 *
 * Run:   npm run db:seed:articles --workspace=db
 * Clean: npm run db:seed:articles --workspace=db -- --clean
 *
 * Never deletes anything it did not create (ids/slugs prefixed "sample-",
 * regions by their legacy ids).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = "tenant-masternet";

// ---------------------------------------------------------------------------
// Placeholder image generator (SVG)
// ---------------------------------------------------------------------------

const PALETTE: Array<[string, string]> = [
  ["#0f766e", "#134e4a"],
  ["#b45309", "#78350f"],
  ["#1d4ed8", "#1e3a8a"],
  ["#7c3aed", "#4c1d95"],
  ["#be123c", "#881337"],
  ["#047857", "#064e3b"],
  ["#c2410c", "#7c2d12"],
  ["#0369a1", "#0c4a6e"],
];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrap(text: string, max = 30): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) {
    return [lines.slice(0, 2).join(" "), lines.slice(2).join(" ") + "…"];
  }
  return lines;
}

function placeholderSvg(label: string, index: number, kind: string): string {
  const [c1, c2] = PALETTE[index % PALETTE.length];
  const lines = wrap(label);
  const text = lines
    .map(
      (line, i) =>
        `<text x="600" y="${lines.length === 1 ? 315 : 285 + i * 66}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="50" font-weight="700" fill="#ffffff">${esc(line)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1060" cy="70" r="190" fill="rgba(255,255,255,0.08)"/>
  <circle cx="110" cy="570" r="150" fill="rgba(255,255,255,0.06)"/>
  <rect x="40" y="40" width="1120" height="550" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2" rx="18"/>
  ${text}
  <text x="600" y="545" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="22" fill="rgba(255,255,255,0.75)">${esc(kind)} · placeholder · 1200 × 630</text>
</svg>`;
}

async function ensureAsset(opts: {
  id: string;
  label: string;
  index: number;
  kind: string;
  filename: string;
  alt: string;
  caption?: string;
}): Promise<string> {
  const svg = placeholderSvg(opts.label, opts.index, opts.kind);
  const bytes = Buffer.from(svg, "utf8");
  const existing = await prisma.asset.findUnique({ where: { id: opts.id } });
  if (existing) return existing.id;
  await prisma.asset.create({
    data: {
      id: opts.id,
      tenantId: TENANT_ID,
      kind: "image",
      mimeType: "image/svg+xml",
      size: bytes.length,
      bytes,
      filename: opts.filename,
      title: opts.label,
      alt: opts.alt,
      caption: opts.caption ?? null,
      width: 1200,
      height: 630,
    },
  });
  return opts.id;
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

type RegionSeed = {
  id: string;
  slug: string;
  state: string;
  stateFull: string;
  city: string | null;
  areaPart: "SOUTHERN" | "NORTHERN" | null;
  priority: number;
  custom1: string | null;
};

const REGION_SEEDS: RegionSeed[] = [
  {
    id: "CA",
    slug: "California-CA",
    state: "CA",
    stateFull: "California",
    city: null,
    areaPart: null,
    priority: 1,
    custom1:
      "<h3>Programs for Teen Girls {{in region}}</h3><p>Families {{in region}} trust these faith-based residential options.</p>",
  },
  {
    id: "CA-San-Diego",
    slug: "San-Diego-California-CA",
    state: "CA",
    stateFull: "California",
    city: "San Diego",
    areaPart: "SOUTHERN",
    priority: 2,
    custom1:
      "<p>San Diego families {{in region}} have trusted these programs for generations.</p>",
  },
  {
    id: "TX",
    slug: "Texas-TX",
    state: "TX",
    stateFull: "Texas",
    city: null,
    areaPart: null,
    priority: 3,
    custom1: "<p>Texas families {{in region}} find care close to home.</p>",
  },
  {
    id: "FL",
    slug: "Florida-FL",
    state: "FL",
    stateFull: "Florida",
    city: null,
    areaPart: null,
    priority: 4,
    custom1: "<p>Florida families {{in region}} find care close to home.</p>",
  },
  {
    id: "NY",
    slug: "New-York-NY",
    state: "NY",
    stateFull: "New York",
    city: null,
    areaPart: null,
    priority: 5,
    custom1: "<p>New York families {{in region}} find care close to home.</p>",
  },
  {
    id: "VA",
    slug: "Virginia-VA",
    state: "VA",
    stateFull: "Virginia",
    city: null,
    areaPart: null,
    priority: 1,
    custom1: "<p>Virginia families {{in region}} find care close to home.</p>",
  },
];

async function ensureRegions(): Promise<Map<string, RegionSeed>> {
  const byId = new Map<string, RegionSeed>();
  for (const r of REGION_SEEDS) {
    const existing = await prisma.region.findUnique({ where: { id: r.id } });
    if (!existing) {
      await prisma.region.create({
        data: {
          id: r.id,
          tenantId: TENANT_ID,
          state: r.state,
          stateFull: r.stateFull,
          city: r.city,
          areaPart: r.areaPart,
          slug: r.slug,
          custom1: r.custom1,
          custom2: null,
          priority: r.priority,
        },
      });
    }
    byId.set(r.id, r);
  }
  return byId;
}

// ---------------------------------------------------------------------------
// Categories (topics)
// ---------------------------------------------------------------------------

type CategorySeed = {
  id: string;
  slug: string;
  title: string;
  description: string;
  stateInit: string;
  stateDesc: string;
  cityInit: string;
  cityDesc: string | null;
};

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    id: "sample-cat-01",
    slug: "wilderness-therapy",
    title: "Wilderness Therapy Programs",
    description:
      "Wilderness therapy programs help girls {{in region}} rebuild confidence and trust in a Christ-centered outdoor setting.",
    stateInit:
      "Find wilderness therapy programs for girls {{in region}} — safe, faith-based and staffed by licensed counselors.",
    stateDesc:
      "Our {{region}} wilderness therapy directory lists programs that combine clinical care with the healing power of creation.",
    cityInit:
      "Families {{from region}} searching for wilderness therapy will find vetted Christian programs below.",
    cityDesc: "Compare wilderness therapy options serving the {{region}} area.",
  },
  {
    id: "sample-cat-02",
    slug: "christian-boarding-schools",
    title: "Christian Boarding Schools",
    description:
      "Christian boarding schools {{in region}} provide structure, academics and spiritual growth for struggling teen girls.",
    stateInit:
      "Explore accredited Christian boarding schools for girls {{in region}} and nearby states.",
    stateDesc: "A directory of faith-based boarding schools serving {{region}}.",
    cityInit: "Christian boarding schools for girls {{near region}} are listed below.",
    cityDesc: null,
  },
  {
    id: "sample-cat-03",
    slug: "residential-treatment",
    title: "Residential Treatment Centers",
    description:
      "Residential treatment centers {{in region}} offer 24/7 clinical care for teens facing depression, anxiety and trauma.",
    stateInit:
      "Compare residential treatment centers for teens {{in region}} with licensed staff and accredited programs.",
    stateDesc: "Residential care options throughout {{region}}, reviewed for quality and safety.",
    cityInit: "Parents {{near region}} use this directory to shortlist residential treatment.",
    cityDesc: "Residential treatment centers serving the {{region}} area.",
  },
  {
    id: "sample-cat-04",
    slug: "teen-depression-anxiety",
    title: "Teen Depression & Anxiety",
    description:
      "Recognizing and treating teen depression and anxiety {{in region}} with counseling, coaching and family support.",
    stateInit:
      "Teen depression help {{in region}} — warning signs, counseling options and next steps for parents.",
    stateDesc: "Mental health resources for teens and families across {{region}}.",
    cityInit: "Anxiety and depression support for teens {{from region}} starts here.",
    cityDesc: null,
  },
  {
    id: "sample-cat-05",
    slug: "adoption-foster-care",
    title: "Adoption & Foster Care",
    description:
      "Adoption and foster care agencies {{in region}} guide families through home studies, placements and post-adoption support.",
    stateInit: "Licensed adoption agencies {{in region}} — start your family-building journey.",
    stateDesc: "Adoption resources and agencies serving {{region}}.",
    cityInit: "Foster care and adoption services {{near region}} are listed below.",
    cityDesc: "Adoption agencies serving the {{region}} area.",
  },
  {
    id: "sample-cat-06",
    slug: "family-therapy-services",
    title: "Family Therapy Services",
    description:
      "Family therapy {{in region}} restores communication and trust with faith-informed counselors and proven methods.",
    stateInit: "Family therapists {{in region}} — book faith-based counseling for your household.",
    stateDesc: "Counseling practices and ministries serving families in {{region}}.",
    cityInit: "Family counseling {{near region}} — vetted providers below.",
    cityDesc: null,
  },
];

async function ensureCategories(): Promise<string[]> {
  const ids: string[] = [];
  for (const c of CATEGORY_SEEDS) {
    const existing = await prisma.category.findFirst({
      where: { tenantId: TENANT_ID, slug: c.slug },
    });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const created = await prisma.category.create({
      data: { ...c, tenantId: TENANT_ID, author: "Canopy Editorial", sections: {} },
    });
    ids.push(created.id);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

type SampleArticle = {
  n: number;
  slug: string;
  title: string;
  cat: number;
  author: string;
  status: "LIVE" | "DRAFT" | "SCHEDULED" | "DISABLED";
  publishedAt: string | null;
  createdAt: string;
  focus: string;
  keywords: string[];
  metaDesc: string;
  seoTitle?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  displaySections: boolean[];
  lead: string;
  sections: Array<{ h: string; paras: string[]; list?: string[] }>;
  figure: { alt: string; caption: string };
  close: string;
};

const AUTHORS = [
  "Sarah Whitfield, M.Ed.",
  "Pastor David Nguyen",
  "Dr. Rachel Ortiz, Psy.D.",
  "Mark Reynolds, LCSW",
  "Emily Carter",
  "Jonathan Pierce",
];

const ARTICLES: SampleArticle[] = [
  {
    n: 1,
    slug: "wilderness-therapy-for-troubled-teen-girls",
    title: "Wilderness Therapy for Troubled Teen Girls: A Parent's Guide",
    cat: 0,
    author: AUTHORS[0],
    status: "LIVE",
    publishedAt: "2026-09-28T09:00:00Z",
    createdAt: "2026-09-28T09:00:00Z",
    focus: "wilderness therapy for troubled teen girls",
    keywords: ["wilderness therapy", "troubled teen girls", "outdoor therapy", "Christian programs", "parent guide"],
    metaDesc:
      "A parent's guide to wilderness therapy for struggling teen girls: how programs work, what to expect, and how to choose the right one.",
    seoTitle: "Wilderness Therapy for Teen Girls: Parent's Guide",
    displaySections: [true, true, true, false, false],
    lead:
      "Families searching {{in region}} for wilderness therapy often feel overwhelmed by choices. This guide explains how structured outdoor programs help struggling teen girls rebuild confidence, trust and healthy routines — and how to tell a reputable program from the rest.",
    sections: [
      {
        h: "What Is Wilderness Therapy?",
        paras: [
          "Wilderness therapy combines clinically supervised outdoor expeditions with individual and group counseling. Teen girls live in small teams, hike short daily distances and take part in structured therapy sessions led by licensed clinicians.",
          "The setting is deliberately simple: no phones, no social media and no distractions. That reset gives girls room to practice communication, accountability and self-reliance away from the peer pressure that often fuels crisis at home.",
        ],
      },
      {
        h: "How a Typical Program Works",
        paras: [
          "Most programs run 6 to 12 weeks and follow a phase model. Parents receive weekly clinical updates, and discharge planning begins the moment a girl enters the program.",
        ],
        list: [
          "Daily hikes with team rotation and leave-no-trace practice",
          "Individual therapy twice weekly with a licensed clinician",
          "Group processing circles several evenings a week",
          "Journaling, nutrition education and basic wilderness skills",
          "Family workshop weekend before discharge",
        ],
      },
      {
        h: "Is It Right for Your Daughter?",
        paras: [
          "Wilderness therapy suits teens struggling with depression, anxiety, defiance or social withdrawal who need a structured reset. It is less appropriate for teens requiring intensive medical detox or acute psychiatric hospitalization.",
          "When you compare programs {{near region}}, verify accreditation, clinician-to-student ratios and aftercare support before committing.",
        ],
      },
    ],
    figure: {
      alt: "Teens hiking with a counselor on a wilderness therapy trail",
      caption: "Morning team hike — wilderness therapy programs emphasize rhythm and responsibility.",
    },
    close:
      "Ready to take the next step? Browse wilderness therapy programs {{near region}} or call our family advisors for a no-cost placement consultation.",
  },
  {
    n: 2,
    slug: "choosing-a-christian-boarding-school",
    title: "How to Choose a Christian Boarding School for Your Daughter",
    cat: 1,
    author: AUTHORS[1],
    status: "LIVE",
    publishedAt: "2026-09-21T09:00:00Z",
    createdAt: "2026-09-21T09:00:00Z",
    focus: "choose a Christian boarding school",
    keywords: ["Christian boarding school", "boarding school for girls", "faith-based education", "teen boarding"],
    metaDesc:
      "Learn how to evaluate Christian boarding schools for your daughter — accreditation, faith life, academics, discipline and family involvement.",
    seoTitle: "Choosing a Christian Boarding School: 8 Checks",
    displaySections: [true, false, true, true, false],
    lead:
      "Choosing a boarding school is one of the biggest decisions a family will make. For parents {{in region}} seeking a faith-based environment, the right school will align academics, spiritual formation and real accountability around your daughter's needs.",
    sections: [
      {
        h: "Start With Accreditation and Outcomes",
        paras: [
          "Ask every school for its accrediting body, graduation rate and college placement list. Reputable schools publish these openly and will connect you with current families.",
          "Accreditation also determines whether credits transfer — a critical detail if your daughter plans to return to a public or private school later.",
        ],
      },
      {
        h: "Evaluate Faith Life and Discipleship",
        paras: [
          "A Christian school should integrate faith across the week, not confine it to a Sunday chapel. Look for mentoring, service projects and pastoral care that students describe as genuine rather than performative.",
        ],
        list: [
          "Daily chapel or devotional rhythm",
          "Small-group discipleship with trained staff",
          "Mission or service component each term",
          "Counselors who coordinate with campus ministry",
        ],
      },
      {
        h: "Visit Before You Decide",
        paras: [
          "Nothing replaces an on-site visit. Watch a classroom, eat lunch in the dining hall and ask students unprompted questions. Trust your instincts about how staff speak to — and about — the girls in their care.",
        ],
      },
    ],
    figure: {
      alt: "Students walking across a Christian boarding school campus",
      caption: "Campus life balances academics, athletics and spiritual formation.",
    },
    close:
      "Compare Christian boarding schools {{near region}} and request information packets directly from each admissions office.",
  },
  {
    n: 3,
    slug: "signs-your-teen-needs-residential-treatment",
    title: "7 Signs Your Teen May Need Residential Treatment",
    cat: 2,
    author: AUTHORS[2],
    status: "LIVE",
    publishedAt: "2026-09-14T09:00:00Z",
    createdAt: "2026-09-14T09:00:00Z",
    focus: "signs teen needs residential treatment",
    keywords: ["residential treatment", "teen mental health", "warning signs", "parents guide"],
    metaDesc:
      "Seven warning signs that your teen may need residential treatment — and what to do at each stage, from early intervention to placement.",
    seoTitle: "7 Signs Your Teen Needs Residential Treatment",
    displaySections: [true, true, false, true, false],
    lead:
      "Most parents {{in region}} wait longer than they should before seeking higher levels of care. Early action prevents small crises from becoming entrenched patterns. Here are the seven signs clinicians watch for.",
    sections: [
      {
        h: "Behavioral and Emotional Red Flags",
        paras: [
          "Escalating anger, secrecy, self-harm, substance use or sudden drops in grades signal that outpatient therapy may no longer be enough. So does a teen who has stopped engaging with friends, hobbies or family routines altogether.",
          "Frequent emergency room visits or police contact are clear indicators that the current plan is not holding.",
        ],
      },
      {
        h: "When Outpatient Care Has Stalled",
        paras: [
          "If your teen has completed an intensive outpatient program and still cannot maintain safety or attendance at school, a higher level of structure is usually the next clinical step.",
        ],
        list: [
          "Two or more hospitalizations in a year",
          "Skipping school for weeks at a time",
          "Threats of self-harm or suicide attempts",
          "Substance use continuing despite intervention",
          "Family conflict that feels unmanageable at home",
        ],
      },
      {
        h: "What Residential Treatment Provides",
        paras: [
          "Residential programs combine 24/7 supervision, individual therapy, academic instruction and peer community. The goal is stabilization first, then skills your teen can carry home.",
        ],
      },
    ],
    figure: {
      alt: "Therapist taking notes during a teen assessment session",
      caption: "A clinical assessment clarifies whether residential care is the right level.",
    },
    close:
      "If several of these signs sound familiar, talk to an admissions specialist {{near region}} about an assessment this week.",
  },
  {
    n: 4,
    slug: "understanding-teen-depression-warning-signs",
    title: "Understanding Teen Depression: Warning Signs Parents Miss",
    cat: 3,
    author: AUTHORS[2],
    status: "LIVE",
    publishedAt: "2026-09-07T09:00:00Z",
    createdAt: "2026-09-07T09:00:00Z",
    focus: "teen depression warning signs",
    keywords: ["teen depression", "depression in adolescents", "warning signs", "mental health"],
    metaDesc:
      "Teen depression often hides behind irritability and withdrawal. Learn the warning signs parents commonly miss and when to seek help.",
    seoTitle: "Teen Depression: Warning Signs Parents Miss",
    displaySections: [true, true, true, false, true],
    lead:
      "Depression in teenagers rarely looks like sadness. More often it shows up as irritability, fatigue or a sudden disinterest in everything. Families {{in region}} who learn the early signs can act before a crisis.",
    sections: [
      {
        h: "It Often Looks Like Irritability",
        paras: [
          "Adolescent depression frequently presents as anger, sarcasm or snapping at siblings. Parents misread it as a discipline problem when it is a mood disorder.",
          "Watch for changes lasting more than two weeks: sleep shifts, appetite changes, declining grades and dropping out of activities that once mattered.",
        ],
      },
      {
        h: "Social Withdrawal and Digital Escapes",
        paras: [
          "A teen who abandons friends for endless scrolling, or who sleeps through weekends, may be numbing rather than relaxing.",
        ],
        list: [
          "Sleeping far more or far less than usual",
          "Unexplained aches, headaches or stomach issues",
          "Loss of interest in sports, music or friends",
          "Talk of worthlessness or being a burden",
          "Rising conflict over small things",
        ],
      },
      {
        h: "How to Respond Without Shame",
        paras: [
          "Open with observations, not accusations: \"I've noticed you've been sleeping a lot more — how are you doing?\" Then connect with a school counselor or therapist {{near region}} for a proper screening.",
        ],
      },
    ],
    figure: {
      alt: "Parent and teenager talking calmly at the kitchen table",
      caption: "Calm, observation-based conversations open the door to screening and support.",
    },
    close:
      "Screening is the first step. Find teen depression support {{near region}} and share this article with another parent who needs it.",
  },
  {
    n: 5,
    slug: "role-of-faith-in-adolescent-recovery",
    title: "The Role of Faith in Adolescent Recovery",
    cat: 5,
    author: AUTHORS[1],
    status: "LIVE",
    publishedAt: "2026-08-31T09:00:00Z",
    createdAt: "2026-08-31T09:00:00Z",
    focus: "faith in teen recovery",
    keywords: ["faith-based recovery", "Christian counseling teens", "adolescent recovery", "spiritual growth"],
    metaDesc:
      "How faith-based programs integrate spiritual formation with clinical care to support lasting recovery for struggling adolescents.",
    seoTitle: "Faith and Adolescent Recovery: What Research Says",
    displaySections: [true, false, true, false, true],
    lead:
      "For many families {{in region}}, faith is not separate from treatment — it is the foundation. The best programs integrate spiritual formation with evidence-based clinical care rather than treating them as competing priorities.",
    sections: [
      {
        h: "Belonging Before Believing",
        paras: [
          "Programs that lead with community tend to outperform those that lead with doctrine. When a teen feels accepted by a group and by a mentor, she becomes open to the harder work of therapy.",
          "Chaplaincy works best when it is woven into the clinical week — processing grief, guilt and identity alongside a licensed therapist.",
        ],
      },
      {
        h: "What Integration Looks Like in Practice",
        paras: [
          "Ask programs how pastoral care coordinates with the treatment plan. Loose coordination produces mixed messages; tight coordination reinforces the same goals from two angles.",
        ],
        list: [
          "Chaplain attends weekly treatment team meetings",
          "Scripture and service tied to personal accountability goals",
          "Family devotion guidance for the home stretch",
          "Aftercare churches briefed before discharge",
        ],
      },
      {
        h: "Measuring What Matters",
        paras: [
          "Faith should widen a teen's support network, not narrow it. Look for programs whose alumni stay connected through mentoring, alumni retreats and local church partnerships.",
        ],
      },
    ],
    figure: {
      alt: "Teenagers gathered in a circle for a group discussion at sunset",
      caption: "Community and mentorship often do the heavy lifting in faith-based recovery.",
    },
    close:
      "Explore faith-based programs {{near region}} and ask each admissions team how spiritual care is built into the weekly plan.",
  },
  {
    n: 6,
    slug: "boarding-school-vs-therapeutic-boarding-school",
    title: "Boarding School vs. Therapeutic Boarding School: Key Differences",
    cat: 1,
    author: AUTHORS[3],
    status: "LIVE",
    publishedAt: "2026-08-24T09:00:00Z",
    createdAt: "2026-08-24T09:00:00Z",
    focus: "boarding school vs therapeutic boarding school",
    keywords: ["therapeutic boarding school", "boarding school comparison", "teen placement", "TBS"],
    metaDesc:
      "Boarding schools and therapeutic boarding schools look similar on paper — the clinical support, admissions bar and outcomes could not differ more.",
    seoTitle: "Boarding School vs. Therapeutic Boarding School",
    displaySections: [true, true, false, false, true],
    lead:
      "Parents {{in region}} often confuse boarding schools with therapeutic boarding schools (TBS). Both offer residence and academics, but they serve different needs and admit students at different levels of risk.",
    sections: [
      {
        h: "Different Missions, Different Teams",
        paras: [
          "A boarding school is an academic community with extracurriculars and a houseparent model. A therapeutic boarding school adds licensed clinicians, individualized treatment plans and psychiatric oversight to the same residential frame.",
          "Placing a clinically fragile teen in a purely academic setting usually ends in expulsion; placing a thriving teen in a clinical setting wastes time and money.",
        ],
      },
      {
        h: "How to Decide",
        paras: [
          "Start with the clinical picture. If your daughter has a diagnosis, active symptoms or a hospitalization history, involve a clinician in the placement decision from day one.",
        ],
        list: [
          "No diagnosis, needs structure and community → boarding school",
          "Diagnosis with stable but unresolved symptoms → TBS",
          "Active safety concerns → residential treatment first",
          "Uncertain → request a professional assessment",
        ],
      },
      {
        h: "Questions to Ask Admissions",
        paras: [
          "Ask who provides clinical care, how crises are handled at 2 a.m. and what the discharge-to-home protocol looks like. Vague answers are a warning sign.",
        ],
      },
    ],
    figure: {
      alt: "Side-by-side comparison of a campus classroom and a counseling office",
      caption: "Clinical staffing is the line between a boarding school and a TBS.",
    },
    close:
      "Still deciding? Compare boarding schools and TBS options {{near region}} side by side in our directory.",
  },
  {
    n: 7,
    slug: "first-30-days-of-treatment",
    title: "What to Expect in the First 30 Days of Treatment",
    cat: 2,
    author: AUTHORS[4],
    status: "LIVE",
    publishedAt: "2026-08-17T09:00:00Z",
    createdAt: "2026-08-17T09:00:00Z",
    focus: "first 30 days residential treatment",
    keywords: ["first month treatment", "residential treatment timeline", "admissions", "parents"],
    metaDesc:
      "A week-by-week look at your teen's first 30 days in residential treatment — assessments, adjustment, family sessions and early wins.",
    seoTitle: "The First 30 Days of Residential Treatment",
    displaySections: [true, true, true, false, false],
    lead:
      "The first month sets the tone for the entire stay. Knowing what happens week by week helps parents {{in region}} stay patient — and stay out of the way of a process that works.",
    sections: [
      {
        h: "Week 1: Assessment and Orientation",
        paras: [
          "Intake includes medical evaluation, psychological testing, medication review and a full family history. Your teen meets her primary therapist and learns the daily rhythm of the program.",
          "Expect resistance in the first few days. Separation anxiety and anger are normal — programs plan for them.",
        ],
      },
      {
        h: "Weeks 2–3: Building the Alliance",
        paras: [
          "By the second week, your teen should have a working therapeutic alliance and a personalized treatment plan with measurable goals.",
        ],
        list: [
          "Individual therapy twice weekly begins in earnest",
          "Group skills sessions build peer trust",
          "Academic assessment and class placement",
          "First family session (virtual or on-site)",
          "Medication stabilized and reviewed",
        ],
      },
      {
        h: "Week 4: First Review Point",
        paras: [
          "Most programs hold a 30-day review with the treatment team. You will hear what is working, what is not and how the plan adjusts. Come with questions and honest observations from home.",
        ],
      },
    ],
    figure: {
      alt: "Clinician reviewing a treatment plan with a teenage client",
      caption: "The 30-day review is the first major checkpoint in the treatment plan.",
    },
    close:
      "Preparing for admission? Read our discharge planning guide and tour programs {{near region}} before you pack a single bag.",
  },
  {
    n: 8,
    slug: "outdoor-therapy-builds-confidence",
    title: "How Outdoor Therapy Builds Confidence in Struggling Teens",
    cat: 0,
    author: AUTHORS[0],
    status: "LIVE",
    publishedAt: "2026-08-10T09:00:00Z",
    createdAt: "2026-08-10T09:00:00Z",
    focus: "outdoor therapy confidence teens",
    keywords: ["outdoor therapy", "teen confidence", "adventure therapy", "resilience"],
    metaDesc:
      "Outdoor therapy gives teens tangible wins — a lit fire, a summit, a teammate carried — that translate into real-world confidence.",
    seoTitle: "Outdoor Therapy and Teen Confidence",
    displaySections: [true, false, true, true, false],
    lead:
      "Confidence cannot be lectured into a teenager; it has to be earned. Outdoor therapy creates small, repeatable wins that girls {{in region}} can point to long after the program ends.",
    sections: [
      {
        h: "Tangible Achievements",
        paras: [
          "Purifying water, pitching a shelter or finishing a five-mile climb produces visible proof of competence. Clinicians then link that proof to the teen's identity narrative: \"You did hard things — you can do the next hard thing.\"",
        ],
      },
      {
        h: "Interdependence, Not Just Independence",
        paras: [
          "Solo challenges matter, but the deeper work happens in teams. Rotating roles — navigator, fire keeper, water carrier — teaches girls that they contribute and that others rely on them.",
        ],
        list: [
          "Rotating leadership roles on the trail",
          "Shared chores with clear accountability",
          "Peer feedback circles after each day",
          "Repair conversations after conflict",
        ],
      },
      {
        h: "Carrying It Home",
        paras: [
          "Before discharge, clinicians help teens script how they will reuse these skills at school and at home — the bridge between the backcountry and the breakfast table.",
        ],
      },
    ],
    figure: {
      alt: "A teenager setting up a tent while a counselor guides her",
      caption: "Small, repeatable wins outdoors become evidence of competence at home.",
    },
    close:
      "See how outdoor therapy programs {{near region}} structure their week and their aftercare plan.",
  },
  {
    n: 9,
    slug: "talking-to-your-daughter-about-mental-health",
    title: "Talking to Your Daughter About Mental Health",
    cat: 3,
    author: AUTHORS[5],
    status: "LIVE",
    publishedAt: "2026-08-03T09:00:00Z",
    createdAt: "2026-08-03T09:00:00Z",
    focus: "talk to daughter about mental health",
    keywords: ["talk to teens mental health", "parent teen communication", "anxiety teens", "family talk"],
    metaDesc:
      "Practical scripts and ground rules for parents who need to open a honest conversation about mental health with their daughter.",
    seoTitle: "How to Talk to Your Daughter About Mental Health",
    displaySections: [true, true, false, true, false],
    lead:
      "The conversation most parents {{in region}} dread is the one their daughter actually needs. Preparation matters more than courage — a few ground rules keep the talk from becoming an interrogation.",
    sections: [
      {
        h: "Set the Scene",
        paras: [
          "Pick neutral territory — a car ride or a walk beats a face-to-face sit-down at the kitchen table. Keep it short, and give her an exit: \"We can stop anytime.\"",
        ],
      },
      {
        h: "Use Observations, Not Verdicts",
        paras: [
          "Describe what you have seen and how it made you feel, then stop talking. Silence gives a teen space to fill.",
        ],
        list: [
          "\"I've noticed you've been skipping practice — what's going on?\"",
          "\"I worry when you say you're worthless.\"",
          "\"You don't have to fix this tonight; I just want to understand.\"",
          "Avoid: \"You're overreacting\" or \"Everyone feels that way.\"",
        ],
      },
      {
        h: "End With a Plan",
        paras: [
          "Close by agreeing on one concrete step — a counselor appointment, a check-in rhythm or a trusted adult she can text. Follow through within 48 hours.",
        ],
      },
    ],
    figure: {
      alt: "Mother and daughter talking while walking outdoors",
      caption: "Neutral settings and open-ended questions lower defenses.",
    },
    close:
      "If the conversation surfaces something bigger, connect with a teen counselor {{near region}} this week.",
  },
  {
    n: 10,
    slug: "insurance-and-costs-teen-residential-programs",
    title: "Insurance and Costs for Teen Residential Programs",
    cat: 2,
    author: AUTHORS[4],
    status: "LIVE",
    publishedAt: "2026-07-27T09:00:00Z",
    createdAt: "2026-07-27T09:00:00Z",
    focus: "cost of teen residential treatment",
    keywords: ["teen treatment cost", "insurance residential treatment", "tuition financial aid", "placements"],
    metaDesc:
      "What teen residential programs cost, how insurance coverage works, and the financial aid options families most often overlook.",
    seoTitle: "Teen Residential Treatment: Costs and Insurance",
    displaySections: [true, true, true, false, false],
    lead:
      "Cost is the question every family {{in region}} asks first — and the one programs answer least clearly. Here is how pricing, insurance and financial aid actually work.",
    sections: [
      {
        h: "What Programs Charge",
        paras: [
          "Monthly tuition for residential care typically ranges from $8,000 to $25,000 depending on clinical intensity, region and setting. Wilderness programs often quote a single all-inclusive fee for the expedition.",
          "Always ask what is included: tuition, gear, travel, medication management and aftercare planning should all be itemized.",
        ],
      },
      {
        h: "How Insurance Fits",
        paras: [
          "Medical insurance may cover residential treatment when the stay is deemed medically necessary and delivered by a licensed facility. Ask for a pre-authorization review before you enroll.",
        ],
        list: [
          "Request a benefits review for 'residential behavioral health'",
          "Ask the program for a diagnostic and treatment estimate",
          "Confirm out-of-network reimbursement rates",
          "Get every denial in writing with appeal deadlines",
        ],
      },
      {
        h: "Aid and Payment Plans",
        paras: [
          "Many programs offer sliding scales, sibling discounts or third-party financing. Scholarships exist but rarely advertise — ask admissions directly and apply early.",
        ],
      },
    ],
    figure: {
      alt: "Family reviewing treatment cost paperwork with an advisor",
      caption: "Itemized quotes and benefits reviews prevent surprise bills later.",
    },
    close:
      "Ask each program {{near region}} for an itemized quote and a benefits review before making any deposit.",
  },
  {
    n: 11,
    slug: "preparing-your-family-for-placement",
    title: "Preparing Your Family for a Long-Term Placement",
    cat: 1,
    author: AUTHORS[1],
    status: "LIVE",
    publishedAt: "2026-07-20T09:00:00Z",
    createdAt: "2026-07-20T09:00:00Z",
    focus: "prepare family teen placement",
    keywords: ["teen placement", "family preparation", "boarding school prep", "siblings"],
    metaDesc:
      "A practical checklist for preparing siblings, grandparents and your household for a teen's long-term placement away from home.",
    seoTitle: "Preparing Your Family for Teen Placement",
    displaySections: [true, false, true, true, true],
    lead:
      "Placement affects the whole household, not just the teen leaving. Families {{in region}} who prepare siblings and extended family ahead of time report a smoother transition and fewer crises at home.",
    sections: [
      {
        h: "Tell Siblings the Truth, Age-Appropriately",
        paras: [
          "Children sense when something is being hidden. Explain the move plainly: where their sibling is going, why, and how you will stay in contact. Assign each child a special way to communicate — letters, drawings or recorded messages.",
        ],
      },
      {
        h: "Set Communication Expectations",
        paras: [
          "Programs structure family contact deliberately. Agree on the cadence before departure so no one feels punished when calls are limited during the adjustment phase.",
        ],
        list: [
          "Weekly family call scheduled and protected",
          "Letters encouraged — send a stamped stack on day one",
          "Grandparents briefed on visiting rules",
          "A shared family calendar for milestones",
        ],
      },
      {
        h: "Prepare the Homecoming Too",
        paras: [
          "Re-entry deserves as much planning as departure. Plan a low-key first weekend, line up an aftercare therapist and brief everyone on boundaries before your teen walks through the door.",
        ],
      },
    ],
    figure: {
      alt: "Family packing a suitcase together before a teen leaves for placement",
      caption: "Clear communication plans make separation easier for the whole household.",
    },
    close:
      "Tour programs {{near region}} with the whole family involved — many schools host sibling-friendly visit days.",
  },
  {
    n: 12,
    slug: "christian-counseling-options-for-teens",
    title: "Christian Counseling Options for Teens Near You",
    cat: 5,
    author: AUTHORS[1],
    status: "LIVE",
    publishedAt: "2026-07-13T09:00:00Z",
    createdAt: "2026-07-13T09:00:00Z",
    focus: "Christian counseling for teens",
    keywords: ["Christian counseling teens", "faith-based therapy", "teen counselor", "church counseling"],
    metaDesc:
      "From church-based coaches to licensed Christian therapists — how to choose the right faith-informed counseling option for your teen.",
    seoTitle: "Christian Counseling for Teens: Options Compared",
    displaySections: [true, true, false, false, true],
    lead:
      "Christian counseling spans a wide spectrum, from volunteer church coaches to licensed clinicians with seminary training. Parents {{in region}} should know which level of care their teen actually needs.",
    sections: [
      {
        h: "Know the Levels of Care",
        paras: [
          "A youth pastor is a wonderful first support — and the wrong person to handle trauma, eating disorders or suicidality. Match the helper to the problem.",
        ],
      },
      {
        h: "Vet the Counselor",
        paras: [
          "For licensed care, verify state licensure, supervision history and malpractice coverage. Ask how faith integrates into the treatment plan.",
        ],
        list: [
          "State license in good standing (LCSW, LMFT, LPCC)",
          "Experience with adolescents specifically",
          "Clear boundaries around confidentiality",
          "Willingness to coordinate with your church",
        ],
      },
      {
        h: "When to Step Up Care",
        paras: [
          "If counseling has not moved the needle in eight to twelve weeks, or symptoms are escalating, request a higher level of care rather than simply switching counselors.",
        ],
      },
    ],
    figure: {
      alt: "Counselor and teenager in a warm office conversation",
      caption: "Licensure and adolescent experience matter more than office décor.",
    },
    close:
      "Browse faith-informed counselors and programs {{near region}} and ask each about their adolescent caseload.",
  },
  {
    n: 13,
    slug: "trauma-informed-care-for-parents",
    title: "Trauma-Informed Care: What Parents Should Know",
    cat: 3,
    author: AUTHORS[2],
    status: "LIVE",
    publishedAt: "2026-07-06T09:00:00Z",
    createdAt: "2026-07-06T09:00:00Z",
    focus: "trauma-informed care teens",
    keywords: ["trauma-informed care", "ACEs teens", "trauma therapy", "parents guide"],
    metaDesc:
      "What 'trauma-informed' really means, how it changes treatment — and the five questions to ask any program before enrolling your teen.",
    seoTitle: "Trauma-Informed Care: A Parent's Primer",
    displaySections: [true, true, true, false, false],
    lead:
      "\"Trauma-informed\" has become a marketing phrase. Families {{in region}} deserve to know what it actually means in a treatment plan — and how to verify it.",
    sections: [
      {
        h: "Beyond the Buzzword",
        paras: [
          "A trauma-informed program assumes behavior is communication. Instead of asking \"What's wrong with you?\" staff ask \"What happened to you?\" — and design responses accordingly.",
          "Safety, trustworthiness, choice and collaboration are the four pillars staff should be able to describe unprompted.",
        ],
      },
      {
        h: "Evidence-Based Modalities to Look For",
        paras: [
          "Ask which specific therapies are used and which clinicians are trained in them. Modalities without trained staff are just brochures.",
        ],
        list: [
          "TF-CBT (Trauma-Focused Cognitive Behavioral Therapy)",
          "EMDR with trained clinicians",
          "Somatic or sensory-based approaches for younger teens",
          "Narrative therapy for older adolescents",
        ],
      },
      {
        h: "Red Flags",
        paras: [
          "Confrontational programs that rely on shame or boot-camp tactics re-traumatize teens. Avoid any facility that restricts food, sleep or medical care as discipline.",
        ],
      },
    ],
    figure: {
      alt: "Notebook and trauma-informed care model diagram on a desk",
      caption: "Ask for the specific modality — not just the phrase 'trauma-informed'.",
    },
    close:
      "Interview programs {{near region}} about their trauma training and ask to speak with a lead clinician directly.",
  },
  {
    n: 14,
    slug: "supporting-siblings-during-treatment",
    title: "How to Support Siblings During Treatment",
    cat: 5,
    author: AUTHORS[4],
    status: "DISABLED",
    publishedAt: "2026-06-29T09:00:00Z",
    createdAt: "2026-06-29T09:00:00Z",
    focus: "siblings during teen treatment",
    keywords: ["siblings teen treatment", "family support", "brothers and sisters", "placement"],
    metaDesc:
      "Siblings often feel overlooked during a teen's treatment. Practical ways to keep every child seen, secure and involved.",
    seoTitle: "Supporting Siblings During a Teen's Treatment",
    robotsIndex: false,
    displaySections: [true, false, false, true, true],
    lead:
      "When one child goes away for treatment, siblings become the quiet storyline of the family. Parents {{in region}} can keep every child seen with a few deliberate habits.",
    sections: [
      {
        h: "Name the Elephant",
        paras: [
          "Give siblings a simple, honest explanation of where their brother or sister is and why. Secrecy breeds imaginative worst-case stories.",
        ],
      },
      {
        h: "Protect Their Routines",
        paras: [
          "Keep sports, friendships and rituals as stable as possible. The family calendar should show that their life still counts.",
        ],
        list: [
          "One-on-one date with each sibling weekly",
          "A private way to send messages to the teen in treatment",
          "Space for frustration without guilt",
          "Watch for grade drops or sleep changes",
        ],
      },
      {
        h: "Include Them in Re-Entry",
        paras: [
          "Involve siblings in homecoming planning — a shared meal, a family meeting — so reunification feels like a family event rather than a patient's return.",
        ],
      },
    ],
    figure: {
      alt: "Two siblings sitting together on a porch swing",
      caption: "Siblings need their own support rhythm during treatment.",
    },
    close:
      "Ask each program about sibling involvement policies before you choose — family systems care includes everyone.",
  },
  {
    n: 15,
    slug: "academic-continuity-while-in-treatment",
    title: "Academic Continuity: Education While in Treatment",
    cat: 2,
    author: AUTHORS[0],
    status: "DRAFT",
    publishedAt: null,
    createdAt: "2026-10-01T09:00:00Z",
    focus: "education during residential treatment",
    keywords: ["academics residential treatment", "credit recovery", "school during treatment", "tutoring"],
    metaDesc:
      "How quality programs protect your teen's transcript, credits and college plans during a residential stay.",
    seoTitle: "Keeping Up With School During Treatment",
    displaySections: [true, true, false, false, false],
    lead:
      "A treatment stay should not cost your daughter a school year. Parents {{in region}} should evaluate academic programs with the same rigor they apply to clinical care.",
    sections: [
      {
        h: "Accreditation Determines Credit Transfer",
        paras: [
          "Programs with regional or national accreditation issue transcripts that transfer. Without it, expect credit-by-exam or retakes on the other side.",
        ],
      },
      {
        h: "What a Strong Academic Day Looks Like",
        paras: [
          "Look for certified teachers, individualized learning plans and a reasonable class size — not worksheets handed out at a picnic table.",
        ],
        list: [
          "Certified teachers with state credentials",
          "Individualized pacing and goal setting",
          "Regular progress reports to your home school",
          "SAT/ACT prep for eligible students",
        ],
      },
      {
        h: "Coordinate With Your Home School",
        paras: [
          "Send a written academic plan to your district before departure and keep a named contact there. Alignment prevents duplicated coursework.",
        ],
      },
    ],
    figure: {
      alt: "Teen studying with a tutor in a bright classroom",
      caption: "Certified teachers and pacing plans keep credits on track.",
    },
    close:
      "Ask each program for its accreditation letter and a sample transcript before enrolling.",
  },
  {
    n: 16,
    slug: "red-flags-teen-behavior",
    title: "Red Flags in Teen Behavior You Shouldn't Ignore",
    cat: 3,
    author: AUTHORS[2],
    status: "DRAFT",
    publishedAt: null,
    createdAt: "2026-09-30T09:00:00Z",
    focus: "teen behavior red flags",
    keywords: ["teen warning signs", "behavioral red flags", "parenting teens", "crisis prevention"],
    metaDesc:
      "A field guide to the teen behavior changes that warrant immediate attention — from secrecy and isolation to self-harm.",
    seoTitle: "Teen Behavior Red Flags Parents Shouldn't Ignore",
    displaySections: [true, true, true, false, false],
    lead:
      "Some changes are normal adolescence; others are sirens. Families {{in region}} who learn the difference can intervene early instead of reactively.",
    sections: [
      {
        h: "The Secrecy Spiral",
        paras: [
          "New passwords, hidden screens and sudden fierce defense of privacy — especially alongside missing money or items — often point to substance use or unsafe relationships.",
        ],
      },
      {
        h: "Isolation and Withdrawal",
        paras: [
          "Dropping friends, quitting teams and sleeping through weekends are classic early markers of depression or online harm.",
        ],
        list: [
          "Unexplained injuries or bruising",
          "Sudden change in friend group",
          "Declining hygiene or self-care",
          "Radical mood swings hour to hour",
          "Giving away possessions or farewell messages",
        ],
      },
      {
        h: "When to Act Immediately",
        paras: [
          "Any talk of suicide, self-harm or violence requires action the same day: contact a clinician or the 988 Suicide & Crisis Lifeline, and do not leave your teen alone.",
        ],
      },
    ],
    figure: {
      alt: "Parent checking in with a withdrawn teenager in a hallway",
      caption: "Same-day action is required for any safety-related change.",
    },
    close:
      "Trust your instincts. If something feels wrong, seek a professional assessment {{near region}} rather than waiting it out.",
  },
  {
    n: 17,
    slug: "aftercare-planning-coming-home",
    title: "Aftercare Planning: Coming Home From Treatment",
    cat: 2,
    author: AUTHORS[3],
    status: "DRAFT",
    publishedAt: null,
    createdAt: "2026-09-26T09:00:00Z",
    focus: "aftercare planning teen treatment",
    keywords: ["aftercare", "discharge planning", "re-entry", "relapse prevention"],
    metaDesc:
      "The discharge plan decides whether progress lasts. What every family should have in place two weeks before coming home.",
    seoTitle: "Aftercare Planning: Coming Home From Treatment",
    displaySections: [true, true, false, true, true],
    lead:
      "Treatment ends; the work does not. Families {{in region}} who build a concrete aftercare plan before discharge dramatically reduce the risk of regression.",
    sections: [
      {
        h: "Two Weeks Before Home",
        paras: [
          "By now you should have a written discharge summary, a home therapist booked and a school re-entry meeting scheduled. If any piece is missing, raise it at the 30-day-family call — or earlier.",
        ],
      },
      {
        h: "The Relapse Prevention Map",
        paras: [
          "Your teen should leave with a personal map: early warning signs, coping steps and three people she will call in crisis.",
        ],
        list: [
          "Named home therapist with first appointment set",
          "Written coping steps for high-risk moments",
          "Agreed household boundaries and privileges",
          "School re-entry plan with a counselor contact",
          "Sober social plan for the first month",
        ],
      },
      {
        h: "Protect the First Weekend",
        paras: [
          "Keep the first 48 hours calm: no parties, no unmonitored devices, plenty of rest. Celebrate quietly and let re-entry breathe.",
        ],
      },
    ],
    figure: {
      alt: "Family hugging as their daughter returns home from treatment",
      caption: "A written aftercare plan turns discharge day into a beginning.",
    },
    close:
      "Download our aftercare checklist and review it with your program's discharge planner {{near region}}.",
  },
  {
    n: 18,
    slug: "families-share-their-journeys",
    title: "Testimonials: Families Share Their Journeys",
    cat: 5,
    author: AUTHORS[5],
    status: "DRAFT",
    publishedAt: null,
    createdAt: "2026-09-22T09:00:00Z",
    focus: "family testimonials teen treatment",
    keywords: ["testimonials", "family stories", "reviews", "parent experiences"],
    metaDesc:
      "Three families describe the moment they chose placement, the hard middle and what life looks like a year later.",
    seoTitle: "Family Testimonials: Placement Stories",
    displaySections: [true, false, true, false, false],
    lead:
      "Every family's path is different, but the milestones rhyme. Three parents {{in region}} share what placement was really like — the guilt, the middle and the return.",
    sections: [
      {
        h: "\"We finally admitted we were out of tools\"",
        paras: [
          "The Martinez family waited eight months longer than they should have. \"We thought discipline would fix it. What fixed it was a team — a clinician, a school and us, finally listening.\"",
        ],
      },
      {
        h: "\"Week six was the turning point\"",
        paras: [
          "Both families describe week six as the breakthrough: the first unsolicited call home, the first laugh captured in a photo, the first plan made for the future instead of against it.",
        ],
        list: [
          "Weekly clinical updates kept parents engaged",
          "Family sessions surfaced old wounds safely",
          "Alumni mentors normalized the transition",
          "Aftercare church was lined up before discharge",
        ],
      },
      {
        h: "\"A year later\"",
        paras: [
          "Both daughters are back in school, one playing varsity sports. The parents now mentor families just starting the process.",
        ],
      },
    ],
    figure: {
      alt: "Family walking together in a park after treatment",
      caption: "One year post-discharge: rebuilds take time, and they hold.",
    },
    close:
      "Read more family stories or share your own — and browse programs {{near region}} when you are ready.",
  },
  {
    n: 19,
    slug: "nutrition-and-wellness-in-treatment",
    title: "Nutrition and Wellness in Teen Treatment Programs",
    cat: 2,
    author: AUTHORS[4],
    status: "SCHEDULED",
    publishedAt: "2026-10-20T09:00:00Z",
    createdAt: "2026-10-02T09:00:00Z",
    focus: "nutrition teen treatment wellness",
    keywords: ["nutrition teens", "wellness treatment", "sleep exercise", "holistic care"],
    metaDesc:
      "Why nutrition, sleep and movement are clinical tools in teen treatment — and the wellness questions parents should ask programs.",
    seoTitle: "Nutrition and Wellness in Teen Treatment",
    displaySections: [true, true, false, false, true],
    lead:
      "Mood follows metabolism. Programs {{in region}} that treat nutrition, sleep and movement as clinical tools — not amenities — see better outcomes and fewer medication complications.",
    sections: [
      {
        h: "Food Is Part of the Treatment Plan",
        paras: [
          "Regular meals with adequate protein stabilize blood sugar and, by extension, irritability and anxiety. Dietitians should screen for eating disorders at intake.",
        ],
      },
      {
        h: "Sleep Hygiene as Policy",
        paras: [
          "Consistent bedtimes, no screens after lights-out and morning light exposure are simple policies with outsized effects on teen mood.",
        ],
        list: [
          "Registered dietitian on staff or on contract",
          "Balanced meals with snack access",
          "Fixed sleep and wake windows",
          "Daily movement beyond required hikes",
          "Screen boundaries that extend to staff modeling",
        ],
      },
      {
        h: "Questions Worth Asking",
        paras: [
          "Ask to see a sample menu and the sleep schedule. What families see in a single day predicts the culture of the whole program.",
        ],
      },
    ],
    figure: {
      alt: "Colorful healthy meal prepared in a program kitchen",
      caption: "A sample menu tells you more about a program than a brochure does.",
    },
    close:
      "Request sample menus and wellness policies from programs {{near region}} while you compare options.",
  },
  {
    n: 20,
    slug: "frequently-asked-questions-teen-rehab",
    title: "Frequently Asked Questions About Teen Rehab",
    cat: 3,
    author: AUTHORS[5],
    status: "SCHEDULED",
    publishedAt: "2026-11-03T09:00:00Z",
    createdAt: "2026-10-03T09:00:00Z",
    focus: "teen rehab FAQ",
    keywords: ["teen rehab FAQ", "rehab questions", "admissions questions", "parents"],
    metaDesc:
      "Straight answers to the ten questions parents ask most about teen rehab — length of stay, visiting, privacy, cost and what happens next.",
    seoTitle: "Teen Rehab: Frequently Asked Questions",
    displaySections: [true, true, true, true, false],
    lead:
      "These are the questions admissions teams {{in region}} hear every day. Straight answers, no marketing gloss.",
    sections: [
      {
        h: "How Long Does a Stay Last?",
        paras: [
          "Residential programs typically run 30 to 90 days; therapeutic boarding schools run an academic year or longer. Length is driven by clinical goals, not the calendar.",
        ],
      },
      {
        h: "Can We Visit and Stay in Touch?",
        paras: [
          "Most programs schedule family sessions weekly or biweekly, with visiting weekends monthly after the adjustment phase. Contact is structured, not cut off.",
        ],
        list: [
          "How often can we visit?",
          "Are calls recorded or monitored?",
          "Can siblings come to family days?",
          "What happens if my teen says she wants to leave?",
          "Who handles medical care and consent?",
        ],
      },
      {
        h: "What Happens After Discharge?",
        paras: [
          "Quality programs do not disappear at discharge. Expect a written aftercare plan, a step-down recommendation and scheduled alumni check-ins for at least 90 days.",
        ],
      },
    ],
    figure: {
      alt: "Admissions counselor answering questions from parents",
      caption: "Good admissions teams answer hard questions without flinching.",
    },
    close:
      "Have a question we missed? Contact our advisors or browse FAQ pages for programs {{near region}}.",
  },
];

// ---------------------------------------------------------------------------
// Token localization for region variants
// ---------------------------------------------------------------------------

function localize(
  html: string,
  region: { name: string; slug: string },
  catTitle: string,
): string {
  return html
    .replace(/\{\{\s*in region\s*\}\}/gi, `in ${region.name}`)
    .replace(/\{\{\s*near region\s*\}\}/gi, `near ${region.name}`)
    .replace(/\{\{\s*around region\s*\}\}/gi, `around ${region.name}`)
    .replace(/\{\{\s*from region\s*\}\}/gi, `from ${region.name}`)
    .replace(/\{\{\s*of region\s*\}\}/gi, `of ${region.name}`)
    .replace(/\{\{\s*regionurlpart\s*\}\}/gi, region.slug)
    .replace(/\{\{\s*region\s*\}\}/gi, region.name)
    .replace(/\{\{\s*in catname\s*\}\}/gi, `in ${catTitle}`)
    .replace(/\{\{\s*catname\s*\}\}/gi, catTitle);
}

function buildBody(a: SampleArticle, inlineSrc: string): string {
  const parts: string[] = [`<p>${a.lead}</p>`];
  a.sections.forEach((s, i) => {
    parts.push(`<h2>${s.h}</h2>`);
    s.paras.forEach((p) => parts.push(`<p>${p}</p>`));
    if (i === 0) {
      parts.push(
        `<figure><img src="${inlineSrc}" alt="${esc(a.figure.alt)}" width="1200" height="630" loading="lazy" /><figcaption>${esc(a.figure.caption)}</figcaption></figure>`,
      );
    }
    if (s.list) {
      parts.push(`<ul>${s.list.map((li) => `<li>${li}</li>`).join("")}</ul>`);
    }
  });
  parts.push(`<p>${a.close}</p>`);
  return parts.join("");
}

function buildJsonLd(a: SampleArticle, image: string): string {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.metaDesc,
    image,
    author: { "@type": "Person", name: a.author },
    publisher: { "@type": "Organization", name: "Canopy Directory" },
  };
  if (a.publishedAt) data.datePublished = a.publishedAt;
  return JSON.stringify(data);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function clean(): Promise<void> {
  const templates = await prisma.contentTemplate.findMany({
    where: { id: { startsWith: "sample-art-" } },
    select: { id: true },
  });
  const ids = templates.map((t) => t.id);
  if (ids.length) {
    await prisma.contentVariant.deleteMany({ where: { templateId: { in: ids } } });
    await prisma.contentTemplate.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.asset.deleteMany({ where: { id: { startsWith: "sample-" } } });
  await prisma.category.deleteMany({ where: { id: { startsWith: "sample-cat-" } } });
  console.log(
    `Cleaned: ${ids.length} sample articles, their variants, sample assets and sample categories. (Regions kept.)`,
  );
}

async function main(): Promise<void> {
  if (process.argv.includes("--clean")) {
    await clean();
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.tenant.upsert({
        where: { id: TENANT_ID },
        create: { id: TENANT_ID, name: "MasterNet", domainKey: "masternet.org", theme: {} },
        update: {},
      });

      const regions = await ensureRegions();
      const categoryIds = await ensureCategories();

      let created = 0;
      let updated = 0;

      for (const a of ARTICLES) {
        const featuredId = `sample-feat-${String(a.n).padStart(2, "0")}`;
        await ensureAsset({
          id: featuredId,
          label: a.title,
          index: a.n - 1,
          kind: "Featured image",
          filename: `${a.slug}-featured.svg`,
          alt: a.title,
          caption: `Featured image for “${a.title}”.`,
        });

        const inlineIdx = ((a.n - 1) % 4) + 1;
        const inlineId = `sample-inline-0${inlineIdx}`;
        const inlineLabel = a.figure.alt;
        await ensureAsset({
          id: inlineId,
          label: inlineLabel,
          index: 20 + inlineIdx,
          kind: "Inline image",
          filename: `inline-${inlineIdx}.svg`,
          alt: a.figure.alt,
          caption: a.figure.caption,
        });

        const inlineSrc = `/api/assets/${inlineId}`;
        const body = buildBody(a, inlineSrc);
        const ogImage = `/api/assets/${featuredId}`;
        const data = {
          slug: a.slug,
          title: a.title,
          body,
          metaDesc: a.metaDesc,
          author: a.author,
          featuredImageAssetId: featuredId,
          displaySections: a.displaySections,
          categoryId: categoryIds[a.cat],
          status: a.status,
          publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
          seoTitle: a.seoTitle ?? null,
          metaKeywords: JSON.stringify(a.keywords),
          focusKeyphrase: a.focus,
          ogImage,
          canonicalUrl: a.canonicalUrl ?? null,
          robotsIndex: a.robotsIndex ?? true,
          robotsFollow: true,
          jsonSchema: buildJsonLd(a, ogImage),
        };

        const existing = await tx.contentTemplate.findFirst({
          where: { tenantId: TENANT_ID, slug: a.slug },
        });
        if (existing) {
          await tx.contentTemplate.update({
            where: { id: existing.id },
            data: { ...data, updatedAt: new Date() },
          });
          updated += 1;
        } else {
          await tx.contentTemplate.create({
            data: {
              id: `sample-art-${String(a.n).padStart(2, "0")}`,
              tenantId: TENANT_ID,
              createdAt: new Date(a.createdAt),
              ...data,
            },
          });
          created += 1;
        }

        // Per-region variants (only for LIVE articles — that's all the public
        // article page will render).
        if (a.status === "LIVE") {
          const template = await tx.contentTemplate.findFirst({
            where: { tenantId: TENANT_ID, slug: a.slug },
            select: { id: true },
          });
          if (template) {
            const catTitle = CATEGORY_SEEDS[a.cat].title;
            const picks = [
              REGION_SEEDS[a.n % REGION_SEEDS.length],
              REGION_SEEDS[(a.n + 2) % REGION_SEEDS.length],
            ];
            if (a.n % 4 === 0) picks.push(REGION_SEEDS[(a.n + 4) % REGION_SEEDS.length]);
            for (const r of picks) {
              const regionRow = regions.get(r.id);
              if (!regionRow) continue;
              const name = r.city ? `${r.city}, ${r.state}` : r.stateFull;
              await tx.contentVariant.upsert({
                where: {
                  templateId_regionId: { templateId: template.id, regionId: r.id },
                },
                create: {
                  templateId: template.id,
                  regionId: r.id,
                  body: localize(body, { name, slug: r.slug }, catTitle),
                  status: "LIVE",
                  publishAt: a.publishedAt ? new Date(a.publishedAt) : null,
                  revision: 1,
                },
                update: {
                  body: localize(body, { name, slug: r.slug }, catTitle),
                  status: "LIVE",
                },
              });
            }
          }
        }
      }

      const templateCount = await tx.contentTemplate.count({
        where: { id: { startsWith: "sample-art-" } },
      });
      const variantCount = await tx.contentVariant.count({
        where: { template: { id: { startsWith: "sample-art-" } } },
      });
      console.log(
        `Sample articles: ${created} created, ${updated} updated (total ${templateCount} sample articles, ${variantCount} region variants), 6 categories, 6 regions, 24 placeholder images.`,
      );
    },
    { timeout: 180_000 },
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
