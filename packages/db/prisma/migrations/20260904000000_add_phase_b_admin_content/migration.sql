-- Phase B admin content models.
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ga4" TEXT,
    "gtm" TEXT,
    "fbPixel" TEXT,
    "searchConsole" TEXT,
    "gscVerificationTag" TEXT,
    "brandColor" TEXT,
    "logoAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heading" TEXT,
    "body" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'LIVE',
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "MenuLocation" AS ENUM ('HEADER', 'FOOTER', 'SIDEBAR');
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" "MenuLocation" NOT NULL DEFAULT 'HEADER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "target" TEXT,
    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "imageAssetId" TEXT,
    "redirectUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WidgetPlacement" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "WidgetPlacement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CategoryImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "regionId" TEXT,
    "imageAssetId" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'PRIMARY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_tenantId_key" ON "Company"("tenantId");
CREATE UNIQUE INDEX "Section_tenantId_slug_key" ON "Section"("tenantId", "slug");
CREATE INDEX "Section_tenantId_order_idx" ON "Section"("tenantId", "order");
CREATE UNIQUE INDEX "Menu_tenantId_name_key" ON "Menu"("tenantId", "name");
CREATE INDEX "Menu_tenantId_location_idx" ON "Menu"("tenantId", "location");
CREATE INDEX "MenuItem_menuId_order_idx" ON "MenuItem"("menuId", "order");
CREATE INDEX "Widget_tenantId_active_idx" ON "Widget"("tenantId", "active");
CREATE INDEX "WidgetPlacement_slot_active_idx" ON "WidgetPlacement"("slot", "active");
CREATE INDEX "CategoryImage_tenantId_categoryId_regionId_idx" ON "CategoryImage"("tenantId", "categoryId", "regionId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Section" ADD CONSTRAINT "Section_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WidgetPlacement" ADD CONSTRAINT "WidgetPlacement_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CategoryImage" ADD CONSTRAINT "CategoryImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CategoryImage" ADD CONSTRAINT "CategoryImage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CategoryImage" ADD CONSTRAINT "CategoryImage_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CategoryImage" ADD CONSTRAINT "CategoryImage_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
