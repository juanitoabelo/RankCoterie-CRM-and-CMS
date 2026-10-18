import { readFileSync } from "node:fs";
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
try {
  const listing = await prisma.listing.findUnique({
    where: { slug: "harbor-light-residential" },
    select: { id: true },
  });
  const preset = await prisma.listingTemplate.findFirst({
    where: { slug: process.argv[2] || "modern", isPreset: true },
    select: { id: true },
  });
  await prisma.listing.update({
    where: { id: listing.id },
    data: { listingTemplateId: preset.id },
  });
  console.log(`assigned ${process.argv[2] || "modern"} (${preset.id})`);
} finally {
  await prisma.$disconnect();
}
