/**
 * Canopy V2 — "Abelo Creative" default site starter content (pure data).
 *
 * Single source of truth for the agency-style marketing site that ships as
 * fresh-install default data: brand theme, page blocks, blog templates,
 * header/footer, and navigation menus.
 *
 * Nothing here touches the database. `packages/db/prisma/seed-site.mts` imports
 * these definitions, downloads the referenced images into the asset library,
 * then persists everything. Every block that needs an image calls `img(key)`,
 * which the seed resolves to a local `/api/assets/<id>/` URL — so the same
 * definitions work in the admin builder preview (pass a no-op resolver) and on
 * the public site.
 */

/* ── Brand theme (mirrors the `abelo-creative` theme preset) ─────────────── */

export const ABELO_THEME = {
  activePreset: "abelo-creative",
  colors: {
    background: "#ffffff",
    text: "#000000",
    accent: "#F3361F",
    headingColor: "#11467B",
    linkColor: "#11467B",
    linkHoverColor: "#F3361F",
    buttonBg: "#11467B",
    buttonText: "#ffffff",
    buttonBgHover: "#F3361F",
    buttonTextHover: "#ffffff",
    surface: "#F4F6F9",
    border: "#E2E8F0",
    muted: "#5B6670",
  },
  fonts: {
    heading: "'Montserrat', system-ui, sans-serif",
    body: "'Roboto', system-ui, sans-serif",
    mono: "'Roboto Mono', ui-monospace, monospace",
  },
} as const;

export const ABELO_BRAND = {
  name: "Abelo Creative",
  tagline: "Website design & development",
  phone: "+63 915 359 2221",
  email: "hello@abelocreative.com",
  website: "https://abelocreative.com",
  location: "Cebu City, Philippines",
  facebook: "https://www.facebook.com/abelocreative",
  linkedin: "https://www.linkedin.com/in/juanito-abelo-03038640/",
};

/* ── Image manifest ──────────────────────────────────────────────────────── */

export interface SiteImage {
  key: string;
  url: string;
  filename: string;
  alt: string;
}

/**
 * Abelo's own media (downloaded as-is) followed by curated Unsplash-sourced
 * stock (served via Lorem Picsum, which is backed by Unsplash photography) for
 * the new sections that have no equivalent on their site.
 */
export const ABELO_IMAGES: SiteImage[] = [
  // Brand
  { key: "logo", url: "https://abelocreative.com/wp-content/uploads/2020/09/Abelo-Creative-Logo.png", filename: "abelo-logo.png", alt: "Abelo Creative logo" },
  { key: "logo-alt", url: "https://abelocreative.com/wp-content/uploads/2020/09/Abelo-Creative-Logo-Alt.png", filename: "abelo-logo-alt.png", alt: "Abelo Creative logo" },
  { key: "working-station", url: "https://abelocreative.com/wp-content/uploads/2025/07/working-station.webp", filename: "working-station.webp", alt: "Designer working at a workstation" },
  { key: "coaching", url: "https://abelocreative.com/wp-content/uploads/2025/07/abelo-creative-coaching.webp", filename: "abelo-creative-coaching.webp", alt: "Abelo Creative coaching session" },

  // Client logos
  { key: "client-doubleoglobal", url: "https://abelocreative.com/wp-content/uploads/2020/10/doubleoglobal.png", filename: "client-doubleoglobal.png", alt: "Double O Global" },
  { key: "client-devphix", url: "https://abelocreative.com/wp-content/uploads/2020/10/logo-devphix.png", filename: "client-devphix.png", alt: "Devphix" },
  { key: "client-katandfox", url: "https://abelocreative.com/wp-content/uploads/2020/10/kat-and-fox.png", filename: "client-kat-and-fox.png", alt: "Kat and Fox" },
  { key: "client-southwestern", url: "https://abelocreative.com/wp-content/uploads/2025/06/southwestern-university-1.png", filename: "client-southwestern-university.png", alt: "Southwestern University PHINMA" },
  { key: "client-elitepages", url: "https://abelocreative.com/wp-content/uploads/2025/06/Elite-Pages-Logo-White.svg", filename: "client-elite-pages.svg", alt: "Elite Pages" },
  { key: "client-kingdom", url: "https://abelocreative.com/wp-content/uploads/2025/06/kingdom-empowered-318x223-basic-dark.png", filename: "client-kingdom-empowered.png", alt: "Kingdom Empowered" },
  { key: "client-masternet", url: "https://abelocreative.com/wp-content/uploads/2025/06/masternet-logo-with-tagline-white.png", filename: "client-masternet.png", alt: "Masternet" },
  { key: "client-brotherskeeper", url: "https://abelocreative.com/wp-content/uploads/2025/06/bk-white-logo.svg", filename: "client-brothers-keeper.svg", alt: "Brothers Keeper" },

  // Testimonial avatars
  { key: "avatar-caro", url: "https://abelocreative.com/wp-content/uploads/2020/10/doubleoglobal-150x150.png", filename: "avatar-caro.png", alt: "Caro McCourtie" },
  { key: "avatar-katharine", url: "https://abelocreative.com/wp-content/uploads/2020/10/kat-and-fox-150x150.png", filename: "avatar-katharine.png", alt: "Katharine Rattray" },
  { key: "avatar-nigel", url: "https://abelocreative.com/wp-content/uploads/2020/11/segway-ninebot-400-150x150.jpg", filename: "avatar-nigel.jpg", alt: "Nigel Handley" },
  { key: "avatar-mike", url: "https://abelocreative.com/wp-content/uploads/2020/10/logo-devphix-150x138.png", filename: "avatar-mike.png", alt: "Mike Bautista" },
  { key: "avatar-juanito", url: "https://abelocreative.com/wp-content/uploads/2020/11/Skype_Picture_2020_11_04T23_20_14_040Z.png", filename: "avatar-juanito.png", alt: "Juanito Abelo" },

  // New content — Unsplash-sourced stock (via Lorem Picsum)
  { key: "hero-studio", url: "https://picsum.photos/seed/abelo-hero-studio/1920/1080", filename: "hero-studio.jpg", alt: "Creative studio workspace" },
  { key: "about-story", url: "https://picsum.photos/seed/abelo-about-story/1200/900", filename: "about-story.jpg", alt: "Team collaborating on a website" },
  { key: "about-office", url: "https://picsum.photos/seed/abelo-about-office/1200/900", filename: "about-office.jpg", alt: "Design studio office" },
  { key: "process-bg", url: "https://picsum.photos/seed/abelo-process/1920/900", filename: "process-bg.jpg", alt: "Team planning a project" },
  { key: "portfolio-1", url: "https://picsum.photos/seed/abelo-work-1/1200/1200", filename: "portfolio-1.jpg", alt: "Responsive website mockup" },
  { key: "portfolio-2", url: "https://picsum.photos/seed/abelo-work-2/1200/1200", filename: "portfolio-2.jpg", alt: "Brand identity design" },
  { key: "portfolio-3", url: "https://picsum.photos/seed/abelo-work-3/1200/1200", filename: "portfolio-3.jpg", alt: "E-commerce storefront" },
  { key: "portfolio-4", url: "https://picsum.photos/seed/abelo-work-4/1200/1200", filename: "portfolio-4.jpg", alt: "Mobile app interface" },
  { key: "portfolio-5", url: "https://picsum.photos/seed/abelo-work-5/1200/1200", filename: "portfolio-5.jpg", alt: "Marketing landing page" },
  { key: "portfolio-6", url: "https://picsum.photos/seed/abelo-work-6/1200/1200", filename: "portfolio-6.jpg", alt: "Dashboard analytics UI" },
  { key: "service-graphic", url: "https://picsum.photos/seed/abelo-service-graphic/1200/900", filename: "service-graphic.jpg", alt: "Graphic design workspace" },
  { key: "service-web", url: "https://picsum.photos/seed/abelo-service-web/1200/900", filename: "service-web.jpg", alt: "Code on a screen" },
  { key: "service-seo", url: "https://picsum.photos/seed/abelo-service-seo/1200/900", filename: "service-seo.jpg", alt: "SEO analytics dashboard" },
  { key: "contact-bg", url: "https://picsum.photos/seed/abelo-contact/1920/900", filename: "contact-bg.jpg", alt: "Desk with laptop and coffee" },
  { key: "cta-bg", url: "https://picsum.photos/seed/abelo-cta/1920/900", filename: "cta-bg.jpg", alt: "Team celebrating a launch" },
  { key: "insight-1", url: "https://picsum.photos/seed/abelo-insight-1/1200/800", filename: "insight-1.jpg", alt: "Web design trends" },
  { key: "insight-2", url: "https://picsum.photos/seed/abelo-insight-2/1200/800", filename: "insight-2.jpg", alt: "SEO strategy notes" },
  { key: "insight-3", url: "https://picsum.photos/seed/abelo-insight-3/1200/800", filename: "insight-3.jpg", alt: "Branding mood board" },
  { key: "team-1", url: "https://picsum.photos/seed/abelo-person-1/600/600", filename: "team-1.jpg", alt: "Team member" },
  { key: "team-2", url: "https://picsum.photos/seed/abelo-person-2/600/600", filename: "team-2.jpg", alt: "Team member" },
  { key: "team-3", url: "https://picsum.photos/seed/abelo-person-3/600/600", filename: "team-3.jpg", alt: "Team member" },
];

export const IMAGE_KEYS = ABELO_IMAGES.map((i) => i.key);
export const assetIdForImage = (key: string) => `siteimg-${key}`;
const IMAGE_BY_KEY = new Map(ABELO_IMAGES.map((i) => [i.key, i]));
export const imageAlt = (key: string) => IMAGE_BY_KEY.get(key)?.alt ?? key;

/* ── Block builders ──────────────────────────────────────────────────────── */

type Img = (key: string) => string;
type AnyBlock = Record<string, unknown>;

let seq = 0;
const uid = (prefix: string) => `${prefix}-${(seq++).toString(36)}`;
const resetIds = () => {
  seq = 0;
};

const heading = (text: string, level = 2, align: "left" | "center" = "center"): AnyBlock => ({
  id: uid("heading"),
  type: "heading",
  props: { text, level, align },
});

const richText = (html: string, align: "left" | "center" = "left"): AnyBlock => ({
  id: uid("text"),
  type: "text",
  props: { content: html, align },
});

const button = (text: string, url: string, align: "left" | "center" = "center", variant = "solid"): AnyBlock => ({
  id: uid("button"),
  type: "button",
  props: { text, url, align, variant },
});

const image = (src: string, alt: string, caption = ""): AnyBlock => ({
  id: uid("image"),
  type: "image",
  props: { src, alt, caption, alignment: "center" },
});

const spacer = (height = 32): AnyBlock => ({ id: uid("spacer"), type: "spacer", props: { height } });

const column = (span: number, blocks: AnyBlock[]) => ({ id: uid("col"), span, blocks });

const row = (columns: ReturnType<typeof column>[], extra: Record<string, unknown> = {}): AnyBlock => ({
  id: uid("row"),
  type: "row",
  props: { columns, gap: 32, align: "stretch", stackOnMobile: true, paddingY: 0, width: "full", fullWidth: true, ...extra },
});

const section = (rows: AnyBlock[], extra: Record<string, unknown> = {}): AnyBlock => ({
  id: uid("sec"),
  type: "section",
  props: { rows, width: "full", paddingTop: 0, paddingBottom: 0, ...extra },
});

/** A coloured/image band with a heading, subheading and optional CTA. */
const pageHeader = (
  headingText: string,
  subheading: string,
  img: Img,
  bgKey: string,
  cta?: { text: string; url: string },
): AnyBlock =>
  section(
    [
      row(
        [
          column(12, [
            heading(headingText, 1, "center"),
            richText(`<p style="text-align:center">${subheading}</p>`, "center"),
            ...(cta ? [button(cta.text, cta.url, "center")] : []),
          ]),
        ],
      ),
    ],
    {
      bgType: "image",
      bgImage: img(bgKey),
      overlayBgType: "color",
      overlayColor: "#0B2A4A",
      overlayOpacity: 78,
      textColor: "#ffffff",
      headingColor: "#ffffff",
      paddingTop: 96,
      paddingBottom: 96,
    },
  );

const ctaSection = (img: Img): AnyBlock =>
  section(
    [
      row(
        [
          column(12, [
            heading("Let’s build your next website", 2, "center"),
            richText(
              "<p style=\"text-align:center\">Tell us about your project and we’ll send a free quotation with a clear plan, timeline and price.</p>",
              "center",
            ),
            button("Request for a free quotation", "/contact", "center"),
          ]),
        ],
      ),
    ],
    {
      bgType: "image",
      bgImage: img("cta-bg"),
      overlayBgType: "color",
      overlayColor: "#11467B",
      overlayOpacity: 88,
      textColor: "#ffffff",
      headingColor: "#ffffff",
      paddingTop: 72,
      paddingBottom: 72,
    },
  );

const logosSection = (img: Img, headingText: string, keys: string[], bgColor: string, textColor: string): AnyBlock => ({
  id: uid("logos"),
  type: "logos",
  props: {
    heading: headingText,
    columns: 4,
    grayscale: false,
    items: keys.map((k) => ({ id: uid("logo"), src: img(k), alt: imageAlt(k), url: "" })),
    style: { sectionPaddingTop: 56, sectionPaddingBottom: 56 },
    bgColor,
    textColor,
  },
});

/* ── Shared content ──────────────────────────────────────────────────────── */

const SERVICES = [
  {
    icon: "🎨",
    title: "Graphic Design",
    description:
      "We define requirements, then visualise and craft illustrations, logos, layouts and photography — realising the visual components of websites, books, magazines and packaging from your ideas.",
  },
  {
    icon: "💻",
    title: "Web Development",
    description:
      "We implement the approved design as a fast, responsive front end — architecting the database, content types, custom fields and all static content so the site is easy to manage.",
  },
  {
    icon: "📈",
    title: "SEO Optimisation",
    description:
      "Tailored SEO from keyword research and on-page optimisation to content strategy and technical SEO, so your website ranks higher, attracts the right audience and converts.",
  },
];

const COMPETITIVE = [
  {
    icon: "🧭",
    title: "Easy Navigation",
    description:
      "A user-focused layout built on accessibility and empathy. A great browsing experience keeps visitors engaged and coming back.",
  },
  {
    icon: "🧩",
    title: "Functional",
    description:
      "Beautiful and functional. Users always find what they are looking for — whether your site is eCommerce, corporate or a portfolio.",
  },
  {
    icon: "📐",
    title: "Scalable",
    description:
      "A scalable infrastructure handles traffic spikes without slowing down, so you spend less on maintenance and gain more profit.",
  },
  {
    icon: "🔍",
    title: "SEO Friendly",
    description:
      "Search engine optimisation keeps your site relevant and easy to find, boosting your online presence, authority and credibility.",
  },
  {
    icon: "📱",
    title: "Mobile Friendly",
    description:
      "Responsive design means your website looks great on any screen — laptop, tablet or phone — with a layout that adapts fluidly.",
  },
];

const PROCESS = [
  { id: "step-1", title: "Project Brief", description: "We start by gathering information about you and your company, your business goals and requirements." },
  { id: "step-2", title: "Design & Approval", description: "We give you a design based on your specifications from the project brief for your approval." },
  { id: "step-3", title: "Development Phase", description: "Our web developers implement the approved design on a staging site on our server." },
  { id: "step-4", title: "Client Review", description: "We ask you to review and approve all implemented features prior to launching the site live." },
  { id: "step-5", title: "Site Launching", description: "The final step — launching to live once all client review and feedback is sorted out." },
];

const TESTIMONIALS = [
  {
    avatarKey: "avatar-caro",
    quote:
      "I have worked with Juanito (known to me as uone) over the years for a variety of development projects. I have consistently found him to be excellent — as a developer, in his responsiveness and professionalism, and in his warm manner and communication. He works quickly and delivers a great result.",
    author: "Caro McCourtie",
    role: "Business Owner",
    rating: 5,
  },
  {
    avatarKey: "avatar-katharine",
    quote:
      "I have been more than happy engaging Abelo Creative to work for me. They set up my Membership page and worked so efficiently and quickly. They answered all my questions, resolved issues and sent videos to explain how to manage parts of my membership page. 5-star service.",
    author: "Katharine Rattray",
    role: "Founder",
    rating: 5,
  },
  {
    avatarKey: "avatar-nigel",
    quote:
      "I’ve worked with Juanito on many projects for over 5 years. He is 100% reliable, his quality is perfect — clean coding and bug free. His knowledge is first class across PHP, JavaScript, Shopify and WordPress, and he delivers on time every time.",
    author: "Nigel Handley",
    role: "Operations Director",
    rating: 5,
  },
  {
    avatarKey: "avatar-mike",
    quote:
      "Abelo Creative is a long-time partner. We’ve worked on multiple web development projects, from page builders to custom coding. I have full confidence in recommending Abelo Creative and hold our partnership in the highest regard.",
    author: "Mike Bautista",
    role: "President, Devphix",
    rating: 5,
  },
];

const CLIENT_KEYS = [
  "client-doubleoglobal",
  "client-devphix",
  "client-katandfox",
  "client-elitepages",
  "client-kingdom",
  "client-masternet",
  "client-southwestern",
  "client-brotherskeeper",
];

const features = (headingText: string, items: { icon: string; title: string; description: string }[], columns = 3): AnyBlock => ({
  id: uid("features"),
  type: "features",
  props: { heading: headingText, items, columns },
});

const stats = (items: { id: string; value: string; label: string }[]): AnyBlock => ({
  id: uid("stats"),
  type: "stats",
  props: { heading: "", columns: items.length, items, style: {} },
});

const testimonialBlock = (
  items: (typeof TESTIMONIALS)[number][],
  img: Img,
  display: "grid" | "slider" = "grid",
): AnyBlock => ({
  id: uid("testimonial"),
  type: "testimonial",
  props: {
    heading: display === "slider" ? "What our clients say" : "",
    items: items.map((t) => ({
      quote: t.quote,
      author: t.author,
      role: t.role,
      rating: t.rating,
      avatar: img(t.avatarKey),
    })),
    display,
    columns: display === "slider" ? 1 : Math.min(3, items.length),
    itemsPerView: 2,
  },
});

/* ── Pages ───────────────────────────────────────────────────────────────── */

export interface PageDef {
  slug: string;
  name: string;
  title: string;
  metaDesc: string;
  isHomepage?: boolean;
  blocks: AnyBlock[];
}

export function abeloPages(img: Img): PageDef[] {
  resetIds();

  return [
    {
      slug: "home",
      name: "Home",
      title: "Abelo Creative — Website Design and Development",
      metaDesc:
        "Abelo Creative is a website design and development team providing design, development and SEO services from the design phase to launch and maintenance.",
      isHomepage: true,
      blocks: [
        pageHeader(
          "We Are Best At What We Offer",
          "We are a website design and development team who aim to provide satisfaction to our clients with professional services from the design phase to launching and site maintenance.",
          img,
          "hero-studio",
          { text: "Request for a free quotation", url: "/contact" },
        ),
        section(
          [
            row([
              column(6, [image(img("working-station"), "Designer working at a workstation")]),
              column(6, [
                heading("Abelo Creative", 2, "left"),
                richText(
                  "<p>We are a website design and development team who aim to provide satisfaction to our clients with our professional services from the design phase to launching and site maintenance.</p><p>The business is established mainly to help all sorts of business types worldwide to create their company’s website, both desktop and mobile responsive.</p><p>Abelo Creative welcomes partner businesses alike to ensure they meet their clients’ requirements in a timely manner.</p>",
                ),
                button("About us", "/about", "left", "outline"),
              ]),
            ]),
          ],
          { bgColor: "#F4F6F9", paddingTop: 64, paddingBottom: 64 },
        ),
        section([row([column(12, [features("Our Services", SERVICES)])])], { paddingTop: 56, paddingBottom: 16 }),
        section([row([column(12, [{ id: uid("steps"), type: "steps", props: { heading: "Our Web Design And Development Process", items: PROCESS, style: {} } }])])], { paddingTop: 16, paddingBottom: 40 }),
        section(
          [
            row([
              column(12, [
                stats([
                  { id: "stat-1", value: "10+", label: "Years of experience" },
                  { id: "stat-2", value: "120+", label: "Projects delivered" },
                  { id: "stat-3", value: "40+", label: "Happy clients" },
                  { id: "stat-4", value: "100%", label: "Satisfaction focus" },
                ]),
              ]),
            ]),
          ],
          { bgColor: "#11467B", textColor: "#ffffff", headingColor: "#ffffff", paddingTop: 56, paddingBottom: 56 },
        ),
        section([row([column(12, [logosSection(img, "Our Clients — driving technology for leading brands", CLIENT_KEYS, "#0B2A4A", "#ffffff")])])], { paddingTop: 0, paddingBottom: 0 }),
        section([row([column(12, [testimonialBlock(TESTIMONIALS.slice(0, 2), img)])])], { paddingTop: 40, paddingBottom: 40 }),
        ctaSection(img),
      ],
    },

    {
      slug: "about",
      name: "About",
      title: "About Abelo Creative",
      metaDesc: "Learn about Abelo Creative — a website design and development team helping businesses worldwide build responsive, high-quality websites.",
      blocks: [
        pageHeader("About Abelo Creative", "A design and development team helping businesses worldwide create their company’s website.", img, "about-story"),
        section(
          [
            row([
              column(6, [image(img("about-office"), "The Abelo Creative studio")]),
              column(6, [
                heading("Who we are", 2, "left"),
                richText(
                  "<p>We are a website design and development team who aim to provide satisfaction to our clients with our professional services from the design phase to launching and site maintenance.</p><p>The business is established mainly to help all sorts of business types worldwide create their company’s website, both desktop and mobile responsive. We welcome partner businesses alike, ensuring they meet their clients’ requirements in a timely manner.</p><p>With all the workforce of Abelo Creative, we always see to it that we deliver the best quality of work that makes our clients happy and satisfied.</p>",
                ),
              ]),
            ]),
          ],
          { paddingTop: 64, paddingBottom: 64 },
        ),
        section(
          [
            row([
              column(12, [
                stats([
                  { id: "stat-1", value: "10+", label: "Years of experience" },
                  { id: "stat-2", value: "120+", label: "Projects delivered" },
                  { id: "stat-3", value: "40+", label: "Clients" },
                  { id: "stat-4", value: "4.9", label: "Average rating" },
                ]),
              ]),
            ]),
          ],
          { bgColor: "#F4F6F9", paddingTop: 56, paddingBottom: 56 },
        ),
        section([
          row([
            column(12, [
              {
                id: uid("team"),
                type: "team",
                props: {
                  heading: "Meet the team",
                  subheading: "Small, senior, and hands-on from brief to launch.",
                  columns: 3,
                  members: [
                    { id: "tm-1", name: "Juanito Abelo", role: "Founder & Lead Developer", image: img("avatar-juanito"), bio: "Full-stack developer across PHP, JavaScript, Shopify and WordPress.", link: "" },
                    { id: "tm-2", name: "Katharine Rattray", role: "Design Lead", image: img("team-2"), bio: "Brand, layout and UX design from brief to polished mockups.", link: "" },
                    { id: "tm-3", name: "Mike Bautista", role: "Technical Partner", image: img("team-3"), bio: "Partnerships and long-running product engineering.", link: "" },
                  ],
                  style: {},
                },
              },
            ]),
          ]),
        ], { paddingTop: 56, paddingBottom: 40 }),
        ctaSection(img),
      ],
    },

    {
      slug: "services",
      name: "Services",
      title: "Services — Abelo Creative",
      metaDesc: "Graphic design, web development and SEO optimisation services from Abelo Creative.",
      blocks: [
        pageHeader("Our Services", "Design, development and SEO — everything you need to launch and grow a website.", img, "service-web"),
        section([row([column(12, [features("What we do", SERVICES)])])], { paddingTop: 56, paddingBottom: 16 }),
        section(
          [
            row([
              column(12, [
                features("What Makes Our Work Competitive", COMPETITIVE),
              ]),
            ]),
          ],
          { bgColor: "#F4F6F9", paddingTop: 56, paddingBottom: 56 },
        ),
        section(
          [
            row([
              column(12, [{ id: uid("steps"), type: "steps", props: { heading: "Our Web Design And Development Process", items: PROCESS, style: {} } }]),
            ]),
          ],
          { paddingTop: 64, paddingBottom: 40 },
        ),
        section(
          [
            row([
              column(12, [
                {
                  id: uid("faq"),
                  type: "faq",
                  props: {
                    heading: "Frequently Asked Questions",
                    items: [
                      { question: "What types of businesses do you work with?", answer: "All sorts — eCommerce, corporate, portfolio, non-profits and partner agencies. If you need a website, we can help." },
                      { question: "How long does a project take?", answer: "Most sites take 4–8 weeks from brief to launch, depending on scope and how quickly content and feedback come back." },
                      { question: "Do you offer ongoing maintenance?", answer: "Yes. We provide site maintenance and support after launch, from updates and backups to new features." },
                      { question: "Can you improve an existing website?", answer: "Absolutely. We can redesign, rebuild, optimise for SEO or fix issues on a site we didn’t originally build." },
                    ],
                  },
                },
              ]),
            ]),
          ],
          { paddingTop: 16, paddingBottom: 56 },
        ),
        ctaSection(img),
      ],
    },

    {
      slug: "portfolio",
      name: "Portfolio",
      title: "Portfolio — Abelo Creative",
      metaDesc: "Selected web design and development projects by Abelo Creative.",
      blocks: [
        pageHeader("Our Portfolio", "A selection of recent websites, brands and interfaces we’ve designed and built.", img, "portfolio-1"),
        section([
          row([
            column(12, [
              {
                id: uid("gallery"),
                type: "gallery",
                props: {
                  columns: 3,
                  masonry: false,
                  images: [
                    { id: uid("img"), src: img("portfolio-1"), alt: "Responsive website", caption: "Corporate website" },
                    { id: uid("img"), src: img("portfolio-2"), alt: "Brand identity", caption: "Brand identity" },
                    { id: uid("img"), src: img("portfolio-3"), alt: "E-commerce store", caption: "E-commerce store" },
                    { id: uid("img"), src: img("portfolio-4"), alt: "Mobile app", caption: "Mobile interface" },
                    { id: uid("img"), src: img("portfolio-5"), alt: "Landing page", caption: "Marketing landing page" },
                    { id: uid("img"), src: img("portfolio-6"), alt: "Dashboard", caption: "Dashboard UI" },
                  ],
                  style: {},
                },
              },
            ]),
          ]),
        ], { paddingTop: 56, paddingBottom: 24 }),
        section(
          [
            row([
              column(6, [image(img("service-web"), "Building a website")]),
              column(6, [
                heading("Designed to perform", 2, "left"),
                richText(
                  "<p>Every project starts with your goals. We design clean, user-focused layouts and build them as fast, responsive websites that are easy to manage and ready to scale.</p><p>From branding and graphic design to custom development and SEO, we handle the whole journey.</p>",
                ),
                button("Start a project", "/contact", "left"),
              ]),
            ]),
          ],
          { bgColor: "#F4F6F9", paddingTop: 64, paddingBottom: 64 },
        ),
        section([row([column(12, [testimonialBlock(TESTIMONIALS.slice(2), img)])])], { paddingTop: 40, paddingBottom: 40 }),
        ctaSection(img),
      ],
    },

    {
      slug: "our-clients",
      name: "Our Clients",
      title: "Our Clients — Abelo Creative",
      metaDesc: "Brands, universities and organisations that trust Abelo Creative with their web development.",
      blocks: [
        pageHeader("Our Clients", "Driving technology for leading brands, universities and organisations worldwide.", img, "client-masternet"),
        section([row([column(12, [logosSection(img, "Trusted by teams everywhere", CLIENT_KEYS, "#0B2A4A", "#ffffff")])])], { paddingTop: 0, paddingBottom: 0 }),
        section(
          [
            row([
              column(12, [
                stats([
                  { id: "stat-1", value: "40+", label: "Clients served" },
                  { id: "stat-2", value: "120+", label: "Projects delivered" },
                  { id: "stat-3", value: "10+", label: "Years partnering" },
                  { id: "stat-4", value: "4.9", label: "Average rating" },
                ]),
              ]),
            ]),
          ],
          { paddingTop: 56, paddingBottom: 56 },
        ),
        section([row([column(12, [testimonialBlock(TESTIMONIALS, img)])])], { bgColor: "#F4F6F9", paddingTop: 56, paddingBottom: 56 }),
        ctaSection(img),
      ],
    },

    {
      slug: "testimonials",
      name: "Testimonials",
      title: "Testimonials — Abelo Creative",
      metaDesc: "What clients say about working with Abelo Creative.",
      blocks: [
        pageHeader("Testimonials", "Long-term partnerships and repeat clients — here’s what they say about working with us.", img, "avatar-caro"),
        section([row([column(12, [testimonialBlock(TESTIMONIALS.slice(0, 2), img, "slider")])])], { paddingTop: 56, paddingBottom: 24 }),
        section([row([column(12, [testimonialBlock(TESTIMONIALS.slice(2), img)])])], { paddingTop: 24, paddingBottom: 40 }),
        section(
          [
            row([
              column(12, [
                stats([
                  { id: "stat-1", value: "100%", label: "Would recommend" },
                  { id: "stat-2", value: "4.9", label: "Average rating" },
                  { id: "stat-3", value: "5+", label: "Years, average client" },
                ]),
              ]),
            ]),
          ],
          { bgColor: "#F4F6F9", paddingTop: 56, paddingBottom: 56 },
        ),
        ctaSection(img),
      ],
    },

    {
      slug: "contact",
      name: "Contact",
      title: "Contact — Abelo Creative",
      metaDesc: "Get in touch with Abelo Creative for a free quotation on your website project.",
      blocks: [
        pageHeader("Contact Us", "Tell us about your project. We’ll get back to you with a free quotation.", img, "contact-bg"),
        section(
          [
            row([
              column(7, [
                {
                  id: uid("leadForm"),
                  type: "leadForm",
                  props: {
                    heading: "Request For A Free Quotation",
                    subheading: "Share a few details about your project and we’ll reply shortly.",
                    showPhone: true,
                    showCompany: true,
                    showMessage: true,
                    submitLabel: "Request quotation",
                    successMessage: "Thanks! We’ll be in touch with your quotation soon.",
                    style: {},
                  },
                },
              ]),
              column(5, [
                {
                  id: uid("businessInfo"),
                  type: "businessInfo",
                  props: {
                    heading: "Contact Info",
                    name: ABELO_BRAND.name,
                    tagline: ABELO_BRAND.tagline,
                    image: img("working-station"),
                    address: ABELO_BRAND.location,
                    phone: ABELO_BRAND.phone,
                    email: ABELO_BRAND.email,
                    website: ABELO_BRAND.website,
                    hours: [
                      { id: "hr-1", day: "Mon – Fri", time: "9:00 – 18:00" },
                      { id: "hr-2", day: "Saturday", time: "10:00 – 14:00" },
                      { id: "hr-3", day: "Sunday", time: "Closed" },
                    ],
                    style: {},
                  },
                },
              ]),
            ]),
          ],
          { paddingTop: 64, paddingBottom: 40 },
        ),
        section([
          row([
            column(12, [
              {
                id: uid("map"),
                type: "googleMap",
                props: { location: "Cebu City, Philippines", zoom: 11, height: 380 },
              },
            ]),
          ]),
        ], { paddingTop: 0, paddingBottom: 56 }),
      ],
    },

    {
      slug: "insights",
      name: "Insights",
      title: "Insights — Abelo Creative",
      metaDesc: "Web design, development and SEO insights from Abelo Creative.",
      blocks: [
        pageHeader("Insights & Blog", "Ideas and practical guides on web design, development and SEO.", img, "insight-1"),
        section([
          row([
            column(12, [
              {
                id: uid("blogGrid"),
                type: "blogPostGrid",
                props: {
                  heading: "",
                  layout: "grid",
                  columns: 3,
                  columnsDesktop: 3,
                  columnsTablet: 2,
                  columnsMobile: 1,
                  postsPerPage: 9,
                  showExcerpt: true,
                  excerptLength: 150,
                  showFeaturedImage: true,
                  showAuthor: true,
                  showDate: true,
                  showCategory: true,
                  showPagination: true,
                  orderBy: "date",
                  sortOrder: "desc",
                  cardStyle: "shadow",
                  hoverEffect: "lift",
                  cardAnimation: "fadeUp",
                  imageAspect: "16:9",
                },
              },
            ]),
          ]),
        ], { paddingTop: 56, paddingBottom: 40 }),
        ctaSection(img),
      ],
    },
  ];
}

/* ── Blog templates ──────────────────────────────────────────────────────── */

export function abeloBlogTemplates(img: Img) {
  resetIds();
  return [
    {
      name: "Abelo Creative Blog Listing",
      type: "listing" as const,
      data: {
        blocks: [
          pageHeader("Blog", "News, guides and ideas from the Abelo Creative team.", img, "insight-1"),
          section(
            [
              row([
                column(8, [
                  {
                    id: uid("blogGrid"),
                    type: "blogPostGrid",
                    props: {
                      heading: "",
                      layout: "grid",
                      columns: 2,
                      columnsDesktop: 2,
                      columnsTablet: 2,
                      columnsMobile: 1,
                      postsPerPage: 9,
                      showExcerpt: true,
                      excerptLength: 150,
                      showFeaturedImage: true,
                      showAuthor: true,
                      showDate: true,
                      showCategory: true,
                      showPagination: true,
                      orderBy: "date",
                      cardStyle: "shadow",
                      imageAspect: "16:9",
                    },
                  },
                ]),
                column(4, [
                  {
                    id: uid("blogSidebar"),
                    type: "blogSidebar",
                    props: {
                      widgets: [
                        { type: "search", heading: "Search" },
                        { type: "categories", heading: "Categories", limit: 10 },
                        { type: "recentPosts", heading: "Recent Posts", limit: 5 },
                      ],
                      width: 300,
                      position: "right",
                    },
                  },
                ]),
              ]),
            ],
            { paddingTop: 48, paddingBottom: 56 },
          ),
        ],
        containerSettings: {},
      },
    },
    {
      name: "Abelo Creative Single Post",
      type: "single" as const,
      data: {
        blocks: [
          section(
            [
              row([
                column(8, [
                  { id: uid("articleHero"), type: "articleHero", props: { layout: "standard", showBreadcrumb: true, showCategory: true, showAuthor: true, showDate: true } },
                  {
                    id: uid("articleContent"),
                    type: "articleContent",
                    props: {
                      showTitle: true,
                      showMeta: true,
                      showAuthor: true,
                      showDate: true,
                      showCategory: true,
                      showFeaturedImage: true,
                      showSocialShare: true,
                      showNavigation: true,
                      maxWidth: 720,
                    },
                  },
                ]),
                column(4, [
                  {
                    id: uid("blogSidebar"),
                    type: "blogSidebar",
                    props: {
                      widgets: [
                        { type: "search", heading: "Search" },
                        { type: "recentPosts", heading: "Recent Posts", limit: 5 },
                        { type: "tagCloud", heading: "Tags" },
                      ],
                      width: 300,
                      position: "right",
                    },
                  },
                ]),
              ]),
            ],
            { paddingTop: 48, paddingBottom: 56 },
          ),
        ],
        containerSettings: {},
      },
    },
  ];
}

/* ── Header / footer ─────────────────────────────────────────────────────── */

export function abeloHeader(img: Img): Record<string, unknown> {
  return {
    blocks: [
      section(
        [
          row(
            [
              column(3, [{ id: uid("logo"), type: "logo", props: { src: img("logo"), alt: ABELO_BRAND.name, linkTo: "/", width: 150, height: 44 } }]),
              column(6, [
                {
                  id: uid("menu"),
                  type: "menu",
                  props: {
                    menuId: "",
                    orientation: "horizontal",
                    style: "links",
                    align: "center",
                    gap: 24,
                    textColor: "#11467B",
                    hoverColor: "#F3361F",
                    activeColor: "#F3361F",
                    fontSize: 15,
                    mobileMenuStyle: "slide",
                    pointer: "underline",
                    pointerWidth: 2,
                    pointerColor: "#F3361F",
                    animation: "fade",
                    hPadding: 12,
                    vPadding: 8,
                    spaceBetween: 24,
                    mobileBreakpoint: 1024,
                    fullMobileWidth: true,
                    mobileTextAlign: "left",
                    toggleButton: "hamburger",
                    toggleAlign: "right",
                    toggleColor: "#11467B",
                    toggleSize: 24,
                    dropdownBgColor: "#ffffff",
                    dropdownTextColor: "#11467B",
                    dropdownHoverColor: "#F3361F",
                    fontFamily: "'Montserrat', system-ui, sans-serif",
                    fontWeight: "600",
                    textTransform: "none",
                  },
                },
              ]),
              column(3, [button("Get Started", "/contact", "right")]),
            ],
            { align: "center", paddingY: 6 },
          ),
        ],
        { bgColor: "#ffffff", paddingTop: 8, paddingBottom: 8 },
      ),
    ],
    containerSettings: {},
  };
}

export function abeloFooter(img: Img): Record<string, unknown> {
  return {
    blocks: [
      section(
        [
          row(
            [
              column(4, [
                { id: uid("logo"), type: "logo", props: { src: img("logo-alt"), alt: ABELO_BRAND.name, linkTo: "/", width: 150, height: 44 } },
                richText(`<p>${ABELO_BRAND.name} — ${ABELO_BRAND.tagline}. From the design phase to launching and site maintenance.</p>`),
                {
                  id: uid("social"),
                  type: "socialIcons",
                  props: {
                    icons: [
                      { platform: "facebook", url: ABELO_BRAND.facebook, label: "Facebook" },
                      { platform: "linkedin", url: ABELO_BRAND.linkedin, label: "LinkedIn" },
                    ],
                    style: "filled",
                    size: "md",
                    color: "#9CA3AF",
                    hoverColor: "#ffffff",
                    gap: 16,
                  },
                },
              ]),
              column(2, [
                heading("Navigate", 4, "left"),
                {
                  id: uid("menu"),
                  type: "menu",
                  props: { menuId: "footer", orientation: "vertical", style: "links", align: "left", gap: 8, textColor: "#ffffff", hoverColor: "#F3361F", mobileMenuStyle: "dropdown" },
                },
              ]),
              column(2, [
                heading("Services", 4, "left"),
                richText(
                  '<p><a href="/services">Graphic Design</a></p><p><a href="/services">Web Development</a></p><p><a href="/services">SEO Optimisation</a></p>',
                ),
              ]),
              column(4, [
                heading("Contact", 4, "left"),
                {
                  id: uid("contact"),
                  type: "contactInfo",
                  props: {
                    showPhone: true,
                    showEmail: true,
                    showAddress: true,
                    showHours: false,
                    phone: ABELO_BRAND.phone,
                    email: ABELO_BRAND.email,
                    address: ABELO_BRAND.location,
                    hours: "",
                    separator: "newline",
                    iconStyle: "emoji",
                    textColor: "#ffffff",
                  },
                },
              ]),
            ],
            { gap: 40 },
          ),
        ],
        {
          bgColor: "#000000",
          textColor: "#ffffff",
          headingColor: "#ffffff",
          paddingTop: 64,
          paddingBottom: 32,
        },
      ),
      section(
        [
          row([
            column(12, [
              richText(
                '<p style="text-align:center;font-size:13px">© Abelo Creative. All rights reserved.</p>',
                "center",
              ),
            ]),
          ]),
        ],
        {
          bgColor: "#000000",
          textColor: "#9CA3AF",
          paddingTop: 0,
          paddingBottom: 24,
        },
      ),
    ],
    containerSettings: {},
  };
}

/* ── Menus ───────────────────────────────────────────────────────────────── */

export const ABELO_MENUS = [
  {
    name: "Main Menu",
    location: "HEADER" as const,
    items: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Our Clients", href: "/our-clients" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "Services", href: "/services" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "Blogs", href: "/blog" },
      { label: "Insights", href: "/insights" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    name: "Footer Menu",
    location: "FOOTER" as const,
    items: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export const ABELO_READING = {
  homepageSlug: "home",
};

export const ABELO_PAGE_SLUGS = [
  "home",
  "about",
  "services",
  "portfolio",
  "our-clients",
  "testimonials",
  "contact",
  "insights",
];
