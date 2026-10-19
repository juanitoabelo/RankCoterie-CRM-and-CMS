-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "geoCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_geoCategoryId_fkey" FOREIGN KEY ("geoCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
