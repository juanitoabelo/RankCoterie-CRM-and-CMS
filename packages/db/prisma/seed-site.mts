/**
 * Canopy V2 — "Abelo Creative" default site seed (idempotent, additive).
 *
 * Ships the agency-style marketing site as fresh-install default data:
 *   1. Downloads every image in the Abelo starter manifest into the local
 *      asset library (deterministic asset ids `siteimg-<key>`).
 *   2. Applies the Abelo brand theme (Montserrat/Roboto, blue + orange).
 *   3. Creates/refreshes the Home, About, Services, Portfolio, Our Clients,
 *      Testimonials, Contact and Insights pages plus a Blog listing/single
 *      template.
 *   4. Creates the Abelo header/footer (marked as the global default) and the
 *      header + footer navigation menus.
 *   5. Points the static homepage at the Home page.
 *
 * The content definitions live in `apps/web/lib/site-starter/abelo.ts` (single
 * source of truth, imported here via Node's native type stripping).
 *
 * Run:   npm run db:seed:site --workspace=db
 * Clean: npm run db:seed:site --workspace=db -- --clean
 */

import { PrismaClient } from "@prisma/client";
import {
  ABELO_THEME,
  ABELO_IMAGES,
  ABELO_MENUS,
  ABELO_BRAND,
  abeloPages,
  abeloBlogTemplates,
  abeloHeader,
  abeloFooter,
  assetIdForImage,
} from "../../../apps/web/lib/site-starter/abelo.ts";

const TENANT_ID = "tenant-masternet";
const prisma = new PrismaClient();

const isClean = process.argv.includes("--clean");

const assetUrl = (key: string) => `/api/assets/${assetIdForImage(key)}/`;

async function downloadImage(url: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CanopySeed/1.0)" },
    });
    if (!res.ok) {
      console.warn(`  ! ${res.status} ${url}`);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
    return { bytes: buf, mimeType };
  } catch (e) {
    console.warn(`  ! ${e instanceof Error ? e.message : String(e)} (${url})`);
    return null;
  }
}

async function seedImages() {
  let created = 0;
  let skipped = 0;

  for (const image of ABELO_IMAGES) {
    const id = assetIdForImage(image.key);
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (existing) {
      skipped += 1;
      continue;
    }
    const dl = await downloadImage(image.url);
    if (!dl) {
      skipped += 1;
      continue;
    }
    await prisma.asset.create({
      data: {
        id,
        tenantId: TENANT_ID,
        kind: "image",
        mimeType: dl.mimeType,
        size: dl.bytes.byteLength,
        bytes: Buffer.from(dl.bytes),
        filename: image.filename,
        title: image.alt,
        alt: image.alt,
      },
    });
    created += 1;
    console.log(`  + ${image.key} (${dl.mimeType}, ${Math.round(dl.bytes.byteLength / 1024)}kb)`);
  }

  console.log(`Images: ${created} downloaded, ${skipped} already present/ skipped.`);
}

async function seedTheme() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    throw new Error(`Tenant ${TENANT_ID} not found — run the base seed first.`);
  }

  const theme = (tenant.theme ?? {}) as Record<string, unknown>;
  const current = (theme.themeSettings ?? {}) as Record<string, unknown>;

  const themeSettings = {
    ...current,
    activePreset: ABELO_THEME.activePreset,
    colors: { ...(current.colors as object), ...ABELO_THEME.colors },
    fonts: { ...(current.fonts as object), ...ABELO_THEME.fonts },
    layout: { ...(current.layout as object), ...ABELO_THEME.layout },
  };

  await prisma.tenant.update({
    where: { id: TENANT_ID },
    data: { theme: { ...theme, themeSettings } as object },
  });

  console.log("Theme: applied Abelo Creative brand settings.");
}

async function seedPages() {
  const pages = abeloPages(assetUrl);
  let homepageId: string | null = null;

  for (const page of pages) {
    const data = JSON.stringify(page.blocks);
    const existing = await prisma.page.findFirst({
      where: { tenantId: TENANT_ID, slug: page.slug },
      select: { id: true },
    });

    const payload = {
      name: page.name,
      title: page.title,
      slug: page.slug,
      status: "LIVE",
      isHomepage: !!page.isHomepage,
      data,
      metaDesc: page.metaDesc,
      seoTitle: page.title,
      robotsIndex: true,
      robotsFollow: true,
    };

    const saved = existing
      ? await prisma.page.update({ where: { id: existing.id }, data: payload })
      : await prisma.page.create({ data: { tenantId: TENANT_ID, ...payload } });

    if (page.isHomepage) homepageId = saved.id;
    console.log(`  ${existing ? "~" : "+"} /${page.slug} (${page.blocks.length} blocks)`);
  }

  console.log(`Pages: ${pages.length} seeded.`);
  return homepageId;
}

async function seedBlogTemplates() {
  const templates = abeloBlogTemplates(assetUrl);
  for (const tpl of templates) {
    const data = JSON.stringify(tpl.data);
    const existing = await prisma.blogTemplate.findFirst({
      where: { tenantId: TENANT_ID, name: tpl.name, type: tpl.type },
      select: { id: true },
    });
    if (existing) {
      await prisma.blogTemplate.update({ where: { id: existing.id }, data: { data } });
    } else {
      await prisma.blogTemplate.create({
        data: { tenantId: TENANT_ID, name: tpl.name, type: tpl.type, data, isDefault: true },
      });
    }
    console.log(`  ${existing ? "~" : "+"} ${tpl.type}: ${tpl.name}`);
  }
  console.log(`Blog templates: ${templates.length} seeded.`);
}

async function seedHeaderFooter() {
  const defs: Array<{ type: "HEADER" | "FOOTER"; name: string; data: Record<string, unknown> }> = [
    { type: "HEADER", name: "Abelo Creative Header", data: abeloHeader(assetUrl) },
    { type: "FOOTER", name: "Abelo Creative Footer", data: abeloFooter(assetUrl) },
  ];

  for (const def of defs) {
    const data = JSON.stringify(def.data);

    // Only one default per type — clear any others first.
    await prisma.headerFooter.updateMany({
      where: { tenantId: TENANT_ID, type: def.type, isDefault: true },
      data: { isDefault: false },
    });

    const existing = await prisma.headerFooter.findFirst({
      where: { tenantId: TENANT_ID, name: def.name },
      select: { id: true },
    });
    if (existing) {
      await prisma.headerFooter.update({ where: { id: existing.id }, data: { data, type: def.type, isDefault: true } });
    } else {
      await prisma.headerFooter.create({
        data: { tenantId: TENANT_ID, name: def.name, type: def.type, data, isDefault: true },
      });
    }
    console.log(`  ${existing ? "~" : "+"} ${def.type}: ${def.name}`);
  }
}

async function seedMenus() {
  for (const menu of ABELO_MENUS) {
    const existing = await prisma.menu.findFirst({
      where: { tenantId: TENANT_ID, name: menu.name },
      select: { id: true },
    });
    const menuId = existing
      ? (await prisma.menu.update({ where: { id: existing.id }, data: { location: menu.location } })).id
      : (await prisma.menu.create({ data: { tenantId: TENANT_ID, name: menu.name, location: menu.location } })).id;

    await prisma.menuItem.deleteMany({ where: { menuId } });
    let order = 0;
    for (const item of menu.items) {
      await prisma.menuItem.create({
        data: { menuId, label: item.label, href: item.href, order: order++, itemType: "LINK" },
      });
    }
    console.log(`  ${existing ? "~" : "+"} ${menu.location}: ${menu.name} (${menu.items.length} items)`);
  }
}

async function seedReading(homepageId: string | null) {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as Record<string, unknown>;
  const reading = (theme.readingSettings ?? {}) as Record<string, unknown>;

  const readingSettings = {
    homepageDisplays: homepageId ? "static" : "latest",
    homepagePageId: homepageId,
    postsPageId: null,
    applyPageId: null,
    postsPerPage: 10,
    feedsPerPage: 10,
    feedFormat: "full",
    searchEngineVisibility: "visible",
    ...reading,
    ...(homepageId ? { homepageDisplays: "static", homepagePageId: homepageId } : {}),
  };

  await prisma.tenant.update({
    where: { id: TENANT_ID },
    data: { theme: { ...theme, readingSettings } as object },
  });
  console.log(`Reading: homepage → ${homepageId ? "Home page" : "latest"}.`);
}

export async function seedSite() {
  await seedImages();
  await seedTheme();
  const homepageId = await seedPages();
  await seedBlogTemplates();
  await seedHeaderFooter();
  await seedMenus();
  await seedReading(homepageId);
}

async function cleanSite() {
  const assetIds = ABELO_IMAGES.map((i) => assetIdForImage(i.key));
  const menuNames = ABELO_MENUS.map((m) => m.name);
  const pageSlugs = ["home", "about", "services", "portfolio", "our-clients", "testimonials", "contact", "insights"];

  const assets = await prisma.asset.deleteMany({ where: { tenantId: TENANT_ID, id: { in: assetIds } } });
  const pages = await prisma.page.deleteMany({ where: { tenantId: TENANT_ID, slug: { in: pageSlugs } } });
  const blogs = await prisma.blogTemplate.deleteMany({ where: { tenantId: TENANT_ID, name: { startsWith: "Abelo Creative" } } });
  const hf = await prisma.headerFooter.deleteMany({ where: { tenantId: TENANT_ID, name: { startsWith: "Abelo Creative" } } });
  const menus = await prisma.menu.deleteMany({ where: { tenantId: TENANT_ID, name: { in: menuNames } } });

  console.log(
    `Removed Abelo starter data — assets ${assets.count}, pages ${pages.count}, blog templates ${blogs.count}, header/footer ${hf.count}, menus ${menus.count}.`,
  );
}

async function main() {
  if (isClean) {
    await cleanSite();
    return;
  }

  console.log(`Seeding Abelo Creative starter site for ${ABELO_BRAND.name} (${TENANT_ID})…`);
  await seedSite();
  console.log("Abelo Creative starter site seeded.");
}

const invokedDirectly = process.argv[1]?.endsWith("seed-site.mts") ?? false;
if (invokedDirectly) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
