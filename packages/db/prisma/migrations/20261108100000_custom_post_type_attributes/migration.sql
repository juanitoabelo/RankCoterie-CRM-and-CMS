ALTER TABLE "CustomPostType"
ADD COLUMN "singularLabel" TEXT,
ADD COLUMN "pluralLabel" TEXT,
ADD COLUMN "addNewLabel" TEXT,
ADD COLUMN "archivesLabel" TEXT,
ADD COLUMN "parentLabel" TEXT,
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "hasArchive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "hierarchical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rewriteSlug" TEXT,
ADD COLUMN "showInRest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "defaultTemplateId" TEXT;

ALTER TABLE "CustomPost"
ADD COLUMN "parentId" TEXT,
ADD COLUMN "authorId" TEXT,
ADD COLUMN "customTermId" TEXT;

CREATE TABLE "CustomPostTerm" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "postTypeId" TEXT NOT NULL,
    "taxonomy" TEXT NOT NULL DEFAULT 'category',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomPostTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomPostComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomPostComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomPostRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomPostRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomPostTerm_postTypeId_taxonomy_slug_key"
ON "CustomPostTerm"("postTypeId", "taxonomy", "slug");

INSERT INTO "CustomPostTerm" ("id", "tenantId", "postTypeId", "taxonomy", "name", "slug", "updatedAt")
SELECT
    'cpt-term-' || md5(custom_post."postTypeId" || ':' || category."id"),
    custom_post."tenantId",
    custom_post."postTypeId",
    'category',
    category."title",
    category."slug",
    CURRENT_TIMESTAMP
FROM "CustomPost" AS custom_post
JOIN "Category" AS category ON category."id" = custom_post."categoryId"
GROUP BY custom_post."tenantId", custom_post."postTypeId", category."id", category."title", category."slug"
ON CONFLICT ("postTypeId", "taxonomy", "slug") DO NOTHING;

UPDATE "CustomPost" AS custom_post
SET "customTermId" = custom_term."id"
FROM "Category" AS category, "CustomPostTerm" AS custom_term
WHERE category."id" = custom_post."categoryId"
  AND custom_term."postTypeId" = custom_post."postTypeId"
  AND custom_term."taxonomy" = 'category'
  AND custom_term."slug" = category."slug";

CREATE UNIQUE INDEX "CustomPostType_tenantId_rewriteSlug_key"
ON "CustomPostType"("tenantId", "rewriteSlug");
CREATE INDEX "CustomPostTerm_tenantId_postTypeId_taxonomy_name_idx"
ON "CustomPostTerm"("tenantId", "postTypeId", "taxonomy", "name");
CREATE INDEX "CustomPostComment_tenantId_postId_status_createdAt_idx"
ON "CustomPostComment"("tenantId", "postId", "status", "createdAt");
CREATE INDEX "CustomPostRevision_tenantId_postId_createdAt_idx"
ON "CustomPostRevision"("tenantId", "postId", "createdAt");
CREATE INDEX "CustomPost_parentId_idx" ON "CustomPost"("parentId");
CREATE INDEX "CustomPost_customTermId_idx" ON "CustomPost"("customTermId");
CREATE INDEX "CustomPost_authorId_idx" ON "CustomPost"("authorId");

ALTER TABLE "CustomPostTerm"
ADD CONSTRAINT "CustomPostTerm_postTypeId_fkey"
FOREIGN KEY ("postTypeId") REFERENCES "CustomPostType"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "CustomPostTerm_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "CustomPostTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomPost"
ADD CONSTRAINT "CustomPost_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "CustomPost"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "CustomPost_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "CustomPost_customTermId_fkey"
FOREIGN KEY ("customTermId") REFERENCES "CustomPostTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomPostComment"
ADD CONSTRAINT "CustomPostComment_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "CustomPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomPostRevision"
ADD CONSTRAINT "CustomPostRevision_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "CustomPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
