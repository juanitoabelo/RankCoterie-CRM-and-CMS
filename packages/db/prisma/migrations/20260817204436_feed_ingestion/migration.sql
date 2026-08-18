-- AlterTable
ALTER TABLE "Feed" ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastFetchedAt" TIMESTAMP(3),
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'RSS',
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "FeedItem" ADD COLUMN     "curatedAt" TIMESTAMP(3),
ADD COLUMN     "fingerprint" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE UNIQUE INDEX "FeedItem_fingerprint_key" ON "FeedItem"("fingerprint");

